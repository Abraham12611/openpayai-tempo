import { createClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { tempoModerato } from 'viem/chains';
import { tempoActions } from 'viem/tempo';

const PRIVATE_KEY = '0x0896de88c7c4c8cdf4c1ec70ffd654ae3c2aa068d3f3b9376c1e4dc589120dc2';

async function checkWallet() {
  console.log('🔍 Checking wallet...\n');
  
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`Address: ${account.address}`);
  
  const client = createClient({
    account,
    chain: tempoModerato,
    transport: http('https://rpc.moderato.tempo.xyz'),
  }).extend(tempoActions());

  const tokens = {
    AlphaUSD: '0x20c0000000000000000000000000000000000001',
    BetaUSD: '0x20c0000000000000000000000000000000000002',
    ThetaUSD: '0x20c0000000000000000000000000000000000003',
    pathUSD: '0x20c0000000000000000000000000000000000000',
  };

  console.log('\n💰 Balances:');
  for (const [name, address] of Object.entries(tokens)) {
    try {
      const balance = await client.token.getBalance({
        token: address,
        account: account.address,
      });
      console.log(`  ${name}: ${Number(balance) / 1e6}`);
    } catch (e) {
      console.log(`  ${name}: Error fetching balance`);
    }
  }
}

checkWallet().catch(console.error);
