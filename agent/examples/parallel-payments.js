/**
 * Example: Parallel Payments with 2D Nonces
 * 
 * This example demonstrates how an AI agent can execute
 * multiple payments simultaneously using Tempo's 2D nonces.
 * This is much faster than sequential payments!
 */

import OpenPayAIAgent from '../agent.js';
import dotenv from 'dotenv';

dotenv.config();

async function runParallelPayments() {
  console.log('⚡ Parallel Payments Example\n');

  // Initialize agent
  const agent = new OpenPayAIAgent(process.env.AGENT_PRIVATE_KEY, {
    useFeeSponsorship: true,
    enableParallel: true,
    maxPricePerItem: BigInt(1000000), // $1.00 max per item
    dailySpendingLimit: BigInt(10000000), // $10.00 daily limit
  });

  // Content to purchase in parallel
  const contentList = [
    { hash: '0x111111...', name: 'Tech Article 1' },
    { hash: '0x222222...', name: 'Tech Article 2' },
    { hash: '0x333333...', name: 'Tech Article 3' },
    { hash: '0x444444...', name: 'Tech Article 4' },
    { hash: '0x555555...', name: 'Tech Article 5' },
    { hash: '0x666666...', name: 'Tech Article 6' },
    { hash: '0x777777...', name: 'Tech Article 7' },
    { hash: '0x888888...', name: 'Tech Article 8' },
    { hash: '0x999999...', name: 'Tech Article 9' },
    { hash: '0xaaaaaa...', name: 'Tech Article 10' },
  ];

  console.log(`Executing ${contentList.length} parallel payments...\n`);
  console.log('Using 2D nonces for concurrent transaction execution\n');

  const startTime = Date.now();

  try {
    // Extract just the hashes for the batch call
    const contentHashes = contentList.map(c => c.hash);

    // Execute parallel purchase
    const result = await agent.purchaseBatch(contentHashes, {
      atomic: false, // Use parallel, not atomic batch
    });

    const duration = Date.now() - startTime;

    if (result.success) {
      console.log('\n✅ Parallel payments complete!');
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Average per transaction: ${(duration / contentList.length).toFixed(2)}ms`);
      console.log(`   Method: ${result.method}`);
      console.log(`   Successful: ${result.successful}/${result.purchases.length}`);
      
      if (result.failed > 0) {
        console.log(`   Failed: ${result.failed}`);
      }

      console.log('\n📦 Results:');
      result.purchases.forEach((purchase, index) => {
        const content = contentList[index];
        const status = purchase.success ? '✅' : '❌';
        console.log(`   ${status} ${content.name}`);
        if (purchase.success) {
          console.log(`      TX: ${purchase.txHash.slice(0, 20)}...`);
          console.log(`      Price: $${Number(purchase.price) / 1e6}`);
        } else {
          console.log(`      Error: ${purchase.error}`);
        }
      });

      // Show stats
      const stats = agent.getStats();
      console.log('\n📊 Performance:');
      console.log(`   Total transactions: ${stats.totalPurchases}`);
      console.log(`   Success rate: ${((result.successful / result.purchases.length) * 100).toFixed(1)}%`);
    }
  } catch (error) {
    console.error('\n❌ Parallel payments failed:', error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runParallelPayments().catch(console.error);
}

export default runParallelPayments;
