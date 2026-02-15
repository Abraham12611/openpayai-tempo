import { createClient, http, parseAbi, stringToHex, pad } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { tempoModerato } from 'viem/chains';
import { tempoActions } from 'viem/tempo';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * OpenPayAI Agent for Tempo
 * 
 * Features:
 * - Autonomous content purchasing
 * - Fee sponsorship (gasless transactions)
 * - Parallel payments with 2D nonces
 * - Batch license purchasing
 * - Spending limits and controls
 */

// Configuration
const CONFIG = {
  RPC_URL: process.env.TEMPO_RPC_URL || 'https://rpc.moderato.tempo.xyz',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
  CHAIN_ID: 42431,
  TOKENS: {
    alphaUsd: '0x20c0000000000000000000000000000000000001',
    betaUsd: '0x20c0000000000000000000000000000000000002',
  },
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
};

// Contract ABI
const CONTRACT_ABI = parseAbi([
  'function purchaseLicense(bytes32 contentHash, bytes32 memo)',
  'function purchaseBatchLicense(bytes32[] contentHashes, bytes32[] memos)',
  'function contentRegistry(bytes32) view returns (uint256 price, address contentOwner, string contentURI, bool active, uint256 totalRevenue, uint256 accessCount)',
  'function hasValidLicense(address user, bytes32 contentHash) view returns (bool)',
  'event LicensePurchased(address indexed buyer, bytes32 indexed contentHash, uint256 price, bytes32 memo, uint256 expiry)',
]);

class OpenPayAIAgent {
  constructor(privateKey, options = {}) {
    this.account = privateKeyToAccount(privateKey);
    this.address = this.account.address;
    
    // Initialize Tempo client with actions
    this.client = createClient({
      account: this.account,
      chain: tempoModerato,
      transport: http(CONFIG.RPC_URL),
    }).extend(tempoActions());

    // Agent configuration
    this.config = {
      maxPricePerItem: options.maxPricePerItem || BigInt(10000000), // $10
      dailySpendingLimit: options.dailySpendingLimit || BigInt(100000000), // $100
      useFeeSponsorship: options.useFeeSponsorship !== false, // Default true
      enableBatching: options.enableBatching !== false, // Default true
      enableParallel: options.enableParallel !== false, // Default true
    };

    // Track spending
    this.spentToday = BigInt(0);
    this.lastReset = Date.now();
    this.purchaseHistory = [];

    console.log(`🤖 Agent initialized: ${this.address}`);
    console.log(`   Fee sponsorship: ${this.config.useFeeSponsorship ? '✅' : '❌'}`);
    console.log(`   Batch purchases: ${this.config.enableBatching ? '✅' : '❌'}`);
    console.log(`   Parallel payments: ${this.config.enableParallel ? '✅' : '❌'}`);
  }

  /**
   * Create a new agent wallet
   */
  static createAgent(options = {}) {
    const privateKey = generatePrivateKey();
    console.log('🔑 New agent wallet created');
    return new OpenPayAIAgent(privateKey, options);
  }

  /**
   * Check content price before purchasing
   */
  async checkContent(contentHash) {
    try {
      const response = await axios.get(`${CONFIG.BACKEND_URL}/api/content/${contentHash}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error checking content:', error.message);
      return null;
    }
  }

  /**
   * Check if agent already has license
   */
  async hasLicense(contentHash) {
    try {
      const response = await axios.get(`${CONFIG.BACKEND_URL}/api/license/check`, {
        params: {
          agentAddress: this.address,
          contentHash,
        },
      });
      return response.data.hasLicense;
    } catch (error) {
      return false;
    }
  }

  /**
   * Purchase single content license
   * Uses fee sponsorship for gasless experience
   */
  async purchaseLicense(contentHash, options = {}) {
    try {
      // Reset spending if needed
      this._resetDailySpendingIfNeeded();

      // Check if already has license
      const hasLicense = await this.hasLicense(contentHash);
      if (hasLicense && !options.force) {
        console.log(`ℹ️  Already have license for ${contentHash}`);
        return { skipped: true, reason: 'Already licensed' };
      }

      // Check content exists and price
      const content = await this.checkContent(contentHash);
      if (!content) {
        throw new Error('Content not found');
      }

      const price = BigInt(content.price);

      // Validate against limits
      if (price > this.config.maxPricePerItem) {
        throw new Error(`Price $${Number(price) / 1e6} exceeds max $${Number(this.config.maxPricePerItem) / 1e6}`);
      }

      if (this.spentToday + price > this.config.dailySpendingLimit) {
        throw new Error('Daily spending limit would be exceeded');
      }

      console.log(`💰 Purchasing license for ${contentHash}`);
      console.log(`   Price: $${Number(price) / 1e6} AlphaUSD`);

      // Create memo for this purchase
      const timestamp = Date.now();
      const memo = this._encodeMemo(contentHash, timestamp);

      // Execute purchase with fee sponsorship!
      // This is the Tempo magic - agent doesn't need gas tokens
      const { receipt } = await this.client.token.transferSync({
        to: content.contentOwner,
        amount: price,
        token: CONFIG.TOKENS.alphaUsd,
        memo,
        feePayer: this.config.useFeeSponsorship, // ✅ Gasless!
      });

      // Record purchase
      this.spentToday += price;
      const purchase = {
        contentHash,
        price: price.toString(),
        txHash: receipt.transactionHash,
        timestamp,
        blockNumber: receipt.blockNumber,
        memo,
      };
      this.purchaseHistory.push(purchase);

      // Notify backend
      await axios.post(`${CONFIG.BACKEND_URL}/api/license/buy`, {
        contentHash,
        agentAddress: this.address,
        txHash: receipt.transactionHash,
        memo,
      });

      console.log(`✅ License purchased!`);
      console.log(`   TX: ${receipt.transactionHash}`);
      console.log(`   Spent today: $${Number(this.spentToday) / 1e6}`);

      return {
        success: true,
        purchase,
        receipt,
      };
    } catch (error) {
      console.error('❌ Purchase failed:', error.message);
      throw error;
    }
  }

  /**
   * Purchase multiple licenses in batch
   * Demonstrates Tempo's batch capabilities
   */
  async purchaseBatch(contentHashes, options = {}) {
    try {
      this._resetDailySpendingIfNeeded();

      console.log(`🛒 Batch purchasing ${contentHashes.length} licenses...`);

      // Filter out already licensed content
      const toPurchase = [];
      for (const hash of contentHashes) {
        const hasLicense = await this.hasLicense(hash);
        if (!hasLicense || options.force) {
          toPurchase.push(hash);
        }
      }

      if (toPurchase.length === 0) {
        console.log('ℹ️  All content already licensed');
        return { skipped: true, reason: 'Already licensed' };
      }

      // Check all content and calculate total
      let totalPrice = BigInt(0);
      const contentInfos = [];

      for (const hash of toPurchase) {
        const content = await this.checkContent(hash);
        if (content) {
          const price = BigInt(content.price);
          totalPrice += price;
          contentInfos.push({ hash, price, owner: content.contentOwner });
        }
      }

      // Validate limits
      if (totalPrice > this.config.dailySpendingLimit - this.spentToday) {
        throw new Error('Batch would exceed daily spending limit');
      }

      console.log(`   Items: ${toPurchase.length}`);
      console.log(`   Total: $${Number(totalPrice) / 1e6} AlphaUSD`);

      // Method 1: Individual transactions with 2D nonces (parallel!)
      if (this.config.enableParallel && !options.atomic) {
        return await this._purchaseParallel(contentInfos);
      }

      // Method 2: Batch transaction (atomic!)
      if (this.config.enableBatching) {
        return await this._purchaseBatchAtomic(contentInfos);
      }

      // Method 3: Sequential (fallback)
      return await this._purchaseSequential(contentInfos);
    } catch (error) {
      console.error('❌ Batch purchase failed:', error.message);
      throw error;
    }
  }

  /**
   * Purchase in parallel using 2D nonces
   * All transactions execute simultaneously!
   */
  async _purchaseParallel(contentInfos) {
    console.log('⚡ Executing parallel payments with 2D nonces...');

    const purchases = await Promise.all(
      contentInfos.map(async (info, index) => {
        const timestamp = Date.now();
        const memo = this._encodeMemo(info.hash, timestamp, index);

        try {
          const { receipt } = await this.client.token.transferSync({
            to: info.owner,
            amount: info.price,
            token: CONFIG.TOKENS.alphaUsd,
            memo,
            feePayer: this.config.useFeeSponsorship,
            nonceKey: index + 1, // ✅ 2D nonce for parallel execution!
          });

          this.spentToday += info.price;

          return {
            contentHash: info.hash,
            price: info.price.toString(),
            txHash: receipt.transactionHash,
            success: true,
          };
        } catch (error) {
          return {
            contentHash: info.hash,
            price: info.price.toString(),
            success: false,
            error: error.message,
          };
        }
      })
    );

    // Notify backend of all purchases
    const successful = purchases.filter(p => p.success);
    if (successful.length > 0) {
      await axios.post(`${CONFIG.BACKEND_URL}/api/license/batch`, {
        contentHashes: successful.map(p => p.contentHash),
        agentAddress: this.address,
        txHash: successful[0].txHash, // Use first tx as reference
      });
    }

    console.log(`✅ Parallel purchase complete: ${successful.length}/${contentInfos.length} successful`);

    return {
      success: true,
      method: 'parallel',
      purchases,
      successful: successful.length,
      failed: contentInfos.length - successful.length,
    };
  }

  /**
   * Purchase in atomic batch
   * All succeed or all fail together
   */
  async _purchaseBatchAtomic(contentInfos) {
    console.log('📦 Executing atomic batch transaction...');

    const timestamp = Date.now();
    const memos = [];

    // Build batch calls
    const calls = contentInfos.map((info, index) => {
      const memo = this._encodeMemo(info.hash, timestamp, index);
      memos.push(memo);

      return {
        to: CONFIG.TOKENS.alphaUsd,
        data: this._encodeTransferCall(info.owner, info.price, memo),
      };
    });

    // Execute batch
    const hash = await this.client.sendTransaction({
      calls,
      feePayer: this.config.useFeeSponsorship,
    });

    const receipt = await this.client.waitForTransactionReceipt({ hash });

    if (receipt.status !== 'success') {
      throw new Error('Batch transaction failed');
    }

    // Update spending
    const totalPrice = contentInfos.reduce((sum, info) => sum + info.price, BigInt(0));
    this.spentToday += totalPrice;

    // Record purchases
    const purchases = contentInfos.map((info, index) => ({
      contentHash: info.hash,
      price: info.price.toString(),
      txHash: hash,
      timestamp,
      memo: memos[index],
    }));

    this.purchaseHistory.push(...purchases);

    // Notify backend
    await axios.post(`${CONFIG.BACKEND_URL}/api/license/batch`, {
      contentHashes: contentInfos.map(info => info.hash),
      agentAddress: this.address,
      txHash: hash,
    });

    console.log(`✅ Atomic batch complete: ${contentInfos.length} licenses`);
    console.log(`   TX: ${hash}`);

    return {
      success: true,
      method: 'atomic-batch',
      purchases,
      totalPrice: totalPrice.toString(),
      receipt,
    };
  }

  /**
   * Purchase sequentially (fallback)
   */
  async _purchaseSequential(contentInfos) {
    console.log('🔄 Executing sequential purchases...');
    const purchases = [];

    for (const info of contentInfos) {
      const result = await this.purchaseLicense(info.hash);
      purchases.push(result);
    }

    return {
      success: true,
      method: 'sequential',
      purchases,
    };
  }

  /**
   * Retrieve content after purchasing license
   */
  async retrieveContent(contentHash) {
    try {
      // Check license first
      const hasLicense = await this.hasLicense(contentHash);
      if (!hasLicense) {
        throw new Error('No valid license for this content');
      }

      // Create authentication signature
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `${timestamp},${contentHash}`;
      const signature = await this.account.signMessage({ message });

      // Request content
      const response = await axios.post(
        `${CONFIG.BACKEND_URL}/api/content/${contentHash}/access`,
        {
          agentAddress: this.address,
          signature,
          timestamp,
        },
        {
          headers: {
            'User-Agent': 'AI-Agent-Crawler',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Content retrieval failed:', error.message);
      throw error;
    }
  }

  /**
   * Get agent statistics
   */
  getStats() {
    return {
      address: this.address,
      totalSpent: this.purchaseHistory.reduce(
        (sum, p) => sum + BigInt(p.price),
        BigInt(0)
      ).toString(),
      spentToday: this.spentToday.toString(),
      dailyLimit: this.config.dailySpendingLimit.toString(),
      remainingToday: (this.config.dailySpendingLimit - this.spentToday).toString(),
      totalPurchases: this.purchaseHistory.length,
      purchaseHistory: this.purchaseHistory.slice(-10), // Last 10
    };
  }

  /**
   * Reset daily spending if needed
   */
  _resetDailySpendingIfNeeded() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (now - this.lastReset > oneDay) {
      this.spentToday = BigInt(0);
      this.lastReset = now;
      console.log('🔄 Daily spending reset');
    }
  }

  /**
   * Encode memo for Tempo
   */
  _encodeMemo(contentHash, timestamp, index = 0) {
    // Format: LICENSE:<contentHash>:<timestamp>:<index>
    const memoStr = `LICENSE:${contentHash.slice(0, 20)}:${timestamp}:${index}`;
    return pad(stringToHex(memoStr.slice(0, 64)), { size: 32 });
  }

  /**
   * Encode transfer call for batching
   */
  _encodeTransferCall(to, amount, memo) {
    // This would be implemented with proper ABI encoding
    // For now, return placeholder
    return '0x';
  }
}

// Export for use as module
export default OpenPayAIAgent;

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`
🤖 OpenPayAI Agent for Tempo
=============================

Usage:
  node agent.js <command> [options]

Commands:
  purchase <contentHash>     Purchase single license
  batch <hash1,hash2,...>    Purchase multiple licenses
  check <contentHash>        Check content price
  stats                      Show agent statistics
  create                     Create new agent wallet

Environment Variables:
  TEMPO_RPC_URL             Tempo RPC endpoint
  BACKEND_URL               Backend API URL
  AGENT_PRIVATE_KEY         Agent wallet private key

Examples:
  node agent.js purchase 0xabc123...
  node agent.js batch 0xabc...,0xdef...,0xghi...
  node agent.js create
`);
}
