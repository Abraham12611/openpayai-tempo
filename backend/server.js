import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { tempoModerato } from 'viem/chains';
import { tempoActions } from 'viem/tempo';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

app.use(express.json());

// Tempo configuration
const RPC_URL = process.env.TEMPO_RPC_URL || 'https://rpc.moderato.tempo.xyz';
const CHAIN_ID = 42431;

// Token addresses
const TOKENS = {
  alphaUsd: '0x20c0000000000000000000000000000000000001',
  betaUsd: '0x20c0000000000000000000000000000000000002',
  pathUsd: '0x20c0000000000000000000000000000000000000',
};

// Contract ABI (minimal for what we need)
const CONTRACT_ABI = parseAbi([
  'function contentRegistry(bytes32) view returns (uint256 price, address contentOwner, string contentURI, bool active, uint256 totalRevenue, uint256 accessCount)',
  'function licenses(address, bytes32) view returns (uint256 expiry, uint256 pricePaid, bool active)',
  'function registerContent(bytes32 contentHash, uint256 price, string contentURI)',
  'function purchaseLicense(bytes32 contentHash, bytes32 memo)',
  'function purchaseBatchLicense(bytes32[] contentHashes, bytes32[] memos)',
  'function hasValidLicense(address user, bytes32 contentHash) view returns (bool)',
  'function updatePrice(bytes32 contentHash, uint256 newPrice)',
  'function toggleContentStatus(bytes32 contentHash)',
  'function setAgentSpendingLimit(address agent, uint256 dailyLimit)',
  'function getCreatorContents(address creator) view returns (bytes32[])',
  'function getContentStats(bytes32) view returns (uint256 price, uint256 revenue, uint256 accessCount, bool active)',
  'event ContentRegistered(bytes32 indexed contentHash, address indexed contentOwner, uint256 price, string contentURI)',
  'event LicensePurchased(address indexed buyer, bytes32 indexed contentHash, uint256 price, bytes32 memo, uint256 expiry)',
  'event BatchLicensePurchased(address indexed buyer, bytes32[] contentHashes, uint256 totalPrice, uint256 count)',
]);

// Initialize Tempo client
let client;
let serverWallet;

function initializeClient() {
  try {
    const privateKey = process.env.SERVER_PRIVATE_KEY;
    if (!privateKey) {
      console.warn('⚠️  SERVER_PRIVATE_KEY not set. Some features will be disabled.');
      return null;
    }

    const account = privateKeyToAccount(privateKey);
    serverWallet = account;

    client = createClient({
      account,
      chain: tempoModerato,
      transport: http(RPC_URL),
    }).extend(tempoActions());

    console.log('✅ Tempo client initialized');
    console.log(`   Server address: ${account.address}`);
    return client;
  } catch (error) {
    console.error('❌ Failed to initialize Tempo client:', error.message);
    return null;
  }
}

// Content registry (in-memory for demo - use DB in production)
const contentRegistry = new Map();
const accessLogs = [];

// Middleware to check AI crawler
const checkAICrawler = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const isAICrawler = userAgent.includes('AI-Agent-Crawler') || 
                      userAgent.includes('Bot') ||
                      userAgent.includes('Crawler');
  
  req.isAICrawler = isAICrawler;
  next();
};

// Routes

/**
 * @route GET /health
 * @desc Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    tempoConnected: !!client,
    serverAddress: serverWallet?.address || null,
  });
});

/**
 * @route POST /api/content/register
 * @desc Register new content for AI access
 */
app.post('/api/content/register', async (req, res) => {
  try {
    const { contentHash, price, contentURI, ownerAddress } = req.body;

    if (!contentHash || !price || !contentURI || !ownerAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store in memory (use contract in production)
    contentRegistry.set(contentHash, {
      contentHash,
      price: BigInt(price),
      contentOwner: ownerAddress,
      contentURI,
      active: true,
      totalRevenue: BigInt(0),
      accessCount: 0,
      createdAt: Date.now(),
    });

    console.log(`📝 Content registered: ${contentHash}`);
    
    res.json({
      success: true,
      contentHash,
      price,
      contentURI,
      owner: ownerAddress,
    });
  } catch (error) {
    console.error('Error registering content:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/content/:contentHash
 * @desc Get content info
 */
app.get('/api/content/:contentHash', (req, res) => {
  const { contentHash } = req.params;
  const content = contentRegistry.get(contentHash);

  if (!content) {
    return res.status(404).json({ error: 'Content not found' });
  }

  res.json({
    contentHash: content.contentHash,
    price: content.price.toString(),
    contentOwner: content.contentOwner,
    contentURI: content.contentURI,
    active: content.active,
    totalRevenue: content.totalRevenue.toString(),
    accessCount: content.accessCount,
  });
});

/**
 * @route POST /api/content/:contentHash/access
 * @desc Request access to content (AI crawlers hit this)
 */
app.post('/api/content/:contentHash/access', checkAICrawler, async (req, res) => {
  try {
    const { contentHash } = req.params;
    const { agentAddress, signature, timestamp, memo } = req.body;

    const content = contentRegistry.get(contentHash);

    if (!content) {
      return res.status(404).json({
        error: 'Content not found',
        code: 'CONTENT_NOT_FOUND',
      });
    }

    if (!content.active) {
      return res.status(403).json({
        error: 'Content not available',
        code: 'CONTENT_INACTIVE',
      });
    }

    // If not AI crawler, allow access (regular users)
    if (!req.isAICrawler) {
      return res.json({
        allowed: true,
        reason: 'Regular user access',
        contentURI: content.contentURI,
      });
    }

    // AI crawler - check for license
    if (!agentAddress) {
      return res.status(402).json({
        error: 'Payment Required',
        code: 'PAYMENT_REQUIRED',
        contentHash,
        price: content.price.toString(),
        currency: 'AlphaUSD',
        message: 'AI agents must purchase license to access this content',
      });
    }

    // Verify signature if provided
    if (signature && timestamp) {
      // Check timestamp (5 min window)
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - parseInt(timestamp)) > 300) {
        return res.status(403).json({
          error: 'Signature expired',
          code: 'SIGNATURE_EXPIRED',
        });
      }

      // In production: verify ECDSA signature on-chain
      // For demo: we'll check if license exists
      
      // Check license (in production, query contract)
      const hasLicense = checkLicense(agentAddress, contentHash);
      
      if (hasLicense) {
        // Log access
        accessLogs.push({
          contentHash,
          agentAddress,
          timestamp: Date.now(),
          type: 'access',
        });

        content.accessCount++;

        return res.json({
          allowed: true,
          reason: 'Valid license',
          contentURI: content.contentURI,
          licenseExpiry: hasLicense.expiry,
        });
      }
    }

    // No valid license
    return res.status(402).json({
      error: 'Payment Required',
      code: 'LICENSE_REQUIRED',
      contentHash,
      price: content.price.toString(),
      currency: 'AlphaUSD',
      contractAddress: process.env.CONTRACT_ADDRESS,
      paymentInstructions: {
        token: TOKENS.alphaUsd,
        amount: content.price.toString(),
        to: content.contentOwner,
        memoFormat: `LICENSE:${contentHash}:${Date.now()}`,
      },
    });
  } catch (error) {
    console.error('Error checking access:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/license/buy
 * @desc Record a license purchase (called after on-chain payment)
 */
app.post('/api/license/buy', async (req, res) => {
  try {
    const { contentHash, agentAddress, txHash, memo } = req.body;

    if (!contentHash || !agentAddress || !txHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const content = contentRegistry.get(contentHash);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // In production: verify transaction on-chain
    // For demo: create license record
    const licenseKey = `${agentAddress}-${contentHash}`;
    const license = {
      agentAddress,
      contentHash,
      txHash,
      memo,
      pricePaid: content.price,
      expiry: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      createdAt: Date.now(),
    };

    // Store license (use Redis/DB in production)
    if (!global.licenses) global.licenses = new Map();
    global.licenses.set(licenseKey, license);

    // Update content stats
    content.totalRevenue += content.price;
    content.accessCount++;

    console.log(`✅ License purchased: ${agentAddress} -> ${contentHash}`);

    res.json({
      success: true,
      license,
      message: 'License activated successfully',
    });
  } catch (error) {
    console.error('Error recording license:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/license/batch
 * @desc Purchase multiple licenses at once
 */
app.post('/api/license/batch', async (req, res) => {
  try {
    const { contentHashes, agentAddress, txHash } = req.body;

    if (!contentHashes || !Array.isArray(contentHashes) || contentHashes.length === 0) {
      return res.status(400).json({ error: 'Invalid content hashes' });
    }

    if (!agentAddress || !txHash) {
      return res.status(400).json({ error: 'Missing agent address or tx hash' });
    }

    const results = [];
    let totalPrice = BigInt(0);

    for (const contentHash of contentHashes) {
      const content = contentRegistry.get(contentHash);
      if (content) {
        totalPrice += content.price;
        
        const license = {
          agentAddress,
          contentHash,
          txHash,
          pricePaid: content.price,
          expiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdAt: Date.now(),
        };

        const licenseKey = `${agentAddress}-${contentHash}`;
        if (!global.licenses) global.licenses = new Map();
        global.licenses.set(licenseKey, license);

        content.totalRevenue += content.price;
        results.push({ contentHash, success: true });
      } else {
        results.push({ contentHash, success: false, error: 'Content not found' });
      }
    }

    console.log(`✅ Batch license purchased: ${agentAddress} -> ${contentHashes.length} items`);

    res.json({
      success: true,
      totalItems: contentHashes.length,
      totalPrice: totalPrice.toString(),
      results,
    });
  } catch (error) {
    console.error('Error in batch purchase:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/license/check
 * @desc Check if agent has valid license
 */
app.get('/api/license/check', (req, res) => {
  const { agentAddress, contentHash } = req.query;

  if (!agentAddress || !contentHash) {
    return res.status(400).json({ error: 'Missing agent address or content hash' });
  }

  const license = checkLicense(agentAddress, contentHash);

  res.json({
    hasLicense: !!license,
    license: license || null,
  });
});

/**
 * @route GET /api/creator/:address/stats
 * @desc Get creator statistics
 */
app.get('/api/creator/:address/stats', (req, res) => {
  const { address } = req.params;
  
  const contents = Array.from(contentRegistry.values())
    .filter(c => c.contentOwner.toLowerCase() === address.toLowerCase());

  const totalRevenue = contents.reduce((sum, c) => sum + c.totalRevenue, BigInt(0));
  const totalAccesses = contents.reduce((sum, c) => sum + c.accessCount, 0);

  res.json({
    address,
    contentCount: contents.length,
    totalRevenue: totalRevenue.toString(),
    totalAccesses,
    contents: contents.map(c => ({
      contentHash: c.contentHash,
      price: c.price.toString(),
      totalRevenue: c.totalRevenue.toString(),
      accessCount: c.accessCount,
      active: c.active,
    })),
  });
});

/**
 * @route GET /api/analytics/overview
 * @desc Get platform analytics
 */
app.get('/api/analytics/overview', (req, res) => {
  const contents = Array.from(contentRegistry.values());
  
  const totalContent = contents.length;
  const totalRevenue = contents.reduce((sum, c) => sum + c.totalRevenue, BigInt(0));
  const totalAccesses = contents.reduce((sum, c) => sum + c.accessCount, 0);
  const activeContent = contents.filter(c => c.active).length;

  res.json({
    totalContent,
    activeContent,
    totalRevenue: totalRevenue.toString(),
    totalAccesses,
    avgPrice: contents.length > 0 
      ? (contents.reduce((sum, c) => sum + c.price, BigInt(0)) / BigInt(contents.length)).toString()
      : '0',
  });
});

// Helper function to check license
function checkLicense(agentAddress, contentHash) {
  if (!global.licenses) return null;
  
  const licenseKey = `${agentAddress}-${contentHash}`;
  const license = global.licenses.get(licenseKey);
  
  if (license && license.expiry > Date.now()) {
    return license;
  }
  
  return null;
}

// Initialize client
initializeClient();

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 OpenPayAI-Tempo Backend
==========================
Server running on port ${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
Tempo RPC: ${RPC_URL}
Chain ID: ${CHAIN_ID}

Endpoints:
  - Health:     GET  /health
  - Register:   POST /api/content/register
  - Get Info:   GET  /api/content/:contentHash
  - Access:     POST /api/content/:contentHash/access
  - Buy:        POST /api/license/buy
  - Batch Buy:  POST /api/license/batch
  - Check:      GET  /api/license/check
  - Stats:      GET  /api/creator/:address/stats
  - Analytics:  GET  /api/analytics/overview
  `);
});

export default app;
