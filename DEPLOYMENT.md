# Deployment Guide for OpenPayAI Tempo

## Prerequisites

- Node.js 18+
- Your wallet has test tokens (AlphaUSD, BetaUSD, pathUSD)
- Private key: 0x0896de88c7c4c8cdf4c1ec70ffd654ae3c2aa068d3f3b9376c1e4dc589120dc2

## Step 1: Deploy Smart Contract

Since we don't have Hardhat configured for Tempo yet, we'll use a simplified approach:

### Option A: Deploy via Tempo Explorer (Recommended for hackathon)

1. Go to https://explore.tempo.xyz
2. Connect your wallet (same as deployer address)
3. Use the "Deploy Contract" feature
4. Paste the contract code from `contract/OpenPayAITempo.sol`
5. Constructor args:
   - _owner: 0x031891A61200FedDd622EbACC10734BC90093B2A (your address)
   - _paymentToken: 0x20c0000000000000000000000000000000000001 (AlphaUSD)
6. Deploy and save the contract address

### Option B: Programmatic Deployment

```javascript
// deploy-contract.js
import { createClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { tempoModerato } from 'viem/chains';
import { tempoActions } from 'viem/tempo';

const BYTECODE = '0x...'; // Contract bytecode
const ABI = [...]; // Contract ABI

const account = privateKeyToAccount('0x0896de88c7c4c8cdf4c1ec70ffd654ae3c2aa068d3f3b9376c1e4dc589120dc2');
const client = createClient({
  account,
  chain: tempoModerato,
  transport: http('https://rpc.moderato.tempo.xyz'),
}).extend(tempoActions());

const hash = await client.deployContract({
  abi: ABI,
  bytecode: BYTECODE,
  args: [account.address, '0x20c0000000000000000000000000000000000001'],
});

console.log('Contract deployed:', hash);
```

## Step 2: Update Environment Variables

After deployment, update all `.env` files with the contract address:

```bash
# In .env, backend/.env.local, agent/.env.local, dashboard/.env.local
CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

## Step 3: Start Backend

```bash
cd backend
npm install
npm run dev
```

Test the backend:
```bash
curl http://localhost:3001/health
```

## Step 4: Test Agent

```bash
cd agent
npm install

# Test single purchase
node -e "
import OpenPayAIAgent from './agent.js';
const agent = new OpenPayAIAgent('0x0896de88c7c4c8cdf4c1ec70ffd654ae3c2aa068d3f3b9376c1e4dc589120dc2');
console.log(agent.getStats());
"
```

## Step 5: Deploy Frontend to Vercel

```bash
cd dashboard
npm install
npm run build

# Deploy to Vercel
vercel --prod
```

## Verification Checklist

- [ ] Contract deployed on Tempo testnet
- [ ] Contract address saved in all .env files
- [ ] Backend running and responding
- [ ] Agent can connect to Tempo
- [ ] Frontend deployed and accessible
- [ ] Demo video recorded

## Contract Address (After Deployment)

Update this section after deploying:

**Deployed Contract**: `0x...`
**Network**: Tempo Testnet (Moderato)
**Chain ID**: 42431
**Explorer**: https://explore.tempo.xyz/address/0x...
