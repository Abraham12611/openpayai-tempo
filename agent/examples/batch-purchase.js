/**
 * Example: Batch Content Purchase
 * 
 * This example demonstrates how an AI agent can purchase
 * multiple content licenses in a single atomic transaction.
 */

import OpenPayAIAgent from '../agent.js';
import dotenv from 'dotenv';

dotenv.config();

async function runBatchPurchase() {
  console.log('🛒 Batch Purchase Example\n');

  // Initialize agent with fee sponsorship enabled
  const agent = new OpenPayAIAgent(process.env.AGENT_PRIVATE_KEY, {
    useFeeSponsorship: true,
    enableBatching: true,
    maxPricePerItem: BigInt(500000), // $0.50 max per item
    dailySpendingLimit: BigInt(5000000), // $5.00 daily limit
  });

  // Content hashes to purchase
  const contentHashes = [
    '0xabc123...', // Article 1
    '0xdef456...', // Article 2
    '0xghi789...', // Article 3
    '0xjkl012...', // Article 4
    '0xmno345...', // Article 5
  ];

  console.log(`Purchasing ${contentHashes.length} content licenses...\n`);

  try {
    // Purchase all at once with atomic batch
    const result = await agent.purchaseBatch(contentHashes, {
      atomic: true, // All succeed or all fail together
    });

    if (result.success) {
      console.log('\n✅ Batch purchase successful!');
      console.log(`   Method: ${result.method}`);
      console.log(`   Total price: $${Number(result.totalPrice) / 1e6}`);
      console.log(`   Transaction: ${result.receipt.transactionHash}`);
      console.log(`   Gas used: ${result.receipt.gasUsed}`);
      console.log(`   Block number: ${result.receipt.blockNumber}`);
      
      console.log('\n📦 Individual purchases:');
      result.purchases.forEach((purchase, index) => {
        console.log(`   ${index + 1}. ${purchase.contentHash}`);
        console.log(`      Price: $${Number(purchase.price) / 1e6}`);
        console.log(`      Memo: ${purchase.memo}`);
      });

      // Show updated stats
      const stats = agent.getStats();
      console.log('\n📊 Agent Stats:');
      console.log(`   Total spent: $${Number(stats.totalSpent) / 1e6}`);
      console.log(`   Spent today: $${Number(stats.spentToday) / 1e6}`);
      console.log(`   Remaining today: $${Number(stats.remainingToday) / 1e6}`);
    }
  } catch (error) {
    console.error('\n❌ Batch purchase failed:', error.message);
    
    // Since it's atomic, no partial purchases occurred
    console.log('   No licenses were purchased (atomic rollback)');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBatchPurchase().catch(console.error);
}

export default runBatchPurchase;
