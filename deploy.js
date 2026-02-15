# Deployment Script for OpenPayAI Tempo
# This script deploys the smart contract and sets up the environment

import { createClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { tempoModerato } from 'viem/chains';
import { tempoActions } from 'viem/tempo';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PRIVATE_KEY = '0x0896de88c7c4c8cdf4c1ec70ffd654ae3c2aa068d3f3b9376c1e4dc589120dc2';
const RPC_URL = 'https://rpc.moderato.tempo.xyz';

// Token addresses on Tempo testnet
const TOKENS = {
  alphaUsd: '0x20c0000000000000000000000000000000000001',
  betaUsd: '0x20c0000000000000000000000000000000000002',
  pathUsd: '0x20c0000000000000000000000000000000000000',
};

async function deploy() {
  console.log('🚀 Deploying OpenPayAI to Tempo...\n');

  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`Deployer: ${account.address}`);

  const client = createClient({
    account,
    chain: tempoModerato,
    transport: http(RPC_URL),
  }).extend(tempoActions());

  // Check balance
  const balance = await client.token.getBalance({
    token: TOKENS.alphaUsd,
    account: account.address,
  });

  console.log(`Balance: ${Number(balance) / 1e6} AlphaUSD\n`);

  if (balance === 0n) {
    console.error('❌ No AlphaUSD balance! Get test tokens from faucet.');
    process.exit(1);
  }

  console.log('✅ Account ready for deployment');
  console.log('\n📋 Next Steps:');
  console.log('1. Deploy contract using Hardhat');
  console.log('2. Update CONTRACT_ADDRESS in .env');
  console.log('3. Start backend: npm run dev');
  console.log('4. Test agent: node agent.js');
}

deploy().catch(console.error);
