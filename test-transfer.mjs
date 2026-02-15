import { createClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { tempoModerato } from 'viem/chains';
import { tempoActions } from 'viem/tempo';

const PRIVATE_KEY = '0x0896de88c7c4c8cdf4c1ec70ffd654ae3c2aa068d3f3b9376c1e4dc589120dc2';

async function testTransfer() {
  console.log('🧪 Testing Tempo Transfer with Fee Sponsorship\n');
  
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`From: ${account.address}`);
  
  const client = createClient({
    account,
    chain: tempoModerato,
    transport: http('https://rpc.moderato.tempo.xyz'),
  }).extend(tempoActions());

  // Test recipient (one of the test wallets from hackathon docs)
  const recipient = '0xAcF8dBD0352a9D47135DA146EA5DbEfAD58340C4';
  const amount = 100000n; // 0.1 AlphaUSD

  console.log(`To: ${recipient}`);
  console.log(`Amount: 0.1 AlphaUSD\n`);

  try {
    const { receipt } = await client.token.transferSync({
      to: recipient,
      amount,
      token: '0x20c0000000000000000000000000000000000001',
      feePayer: true, // Using fee sponsorship!
    });

    console.log('✅ Transfer successful!');
    console.log(`   Transaction: ${receipt.transactionHash}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed}`);
    console.log(`   Status: ${receipt.status}`);
    
    // Check new balance
    const newBalance = await client.token.getBalance({
      token: '0x20c0000000000000000000000000000000000001',
      account: account.address,
    });
    
    console.log(`\n💰 New Balance: ${Number(newBalance) / 1e6} AlphaUSD`);
    
  } catch (error) {
    console.error('❌ Transfer failed:', error.message);
  }
}

testTransfer().catch(console.error);
