# OpenPayAI for Tempo Hackathon

**AI agents paying for content with instant micropayments, fee sponsorship, and autonomous licensing.**

[![Tempo](https://img.shields.io/badge/Powered%20by-Tempo-6366f1)](https://tempo.xyz)
[![Track](https://img.shields.io/badge/Track-3%20AI%20Agents-green)](https://canteenapp-tempo.notion.site/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 🎯 Hackathon Submission

**Track**: 3 (AI Agents & Automation)  
**Prize**: $3,500 Grand Prize Competition  
**Demo**: [Video Link](https://youtube.com/your-demo)  
**Live App**: [https://openpayai-tempo.vercel.app](https://openpayai-tempo.vercel.app)

---

## 💡 Problem Statement

Content providers face a growing dilemma: they want their websites to remain open and discoverable by traditional search crawlers, yet they don't want to give away their content for free to AI crawlers that scrape data for training and RAG purposes.

Cloudflare introduced pay-per-crawl in July 2025, but it's centralized and monopolistic. **OpenPayAI** creates a decentralized alternative on Tempo where AI agents autonomously pay for content access using instant stablecoin micropayments.

---

## 🚀 Solution

OpenPayAI enables:
- **Content creators** to monetize AI access to their content
- **AI agents** to autonomously purchase licenses with micropayments
- **Instant settlement** via Tempo's sub-second finality
- **Gasless transactions** through fee sponsorship
- **Parallel payments** using 2D nonces for bulk purchasing

### Key Features

✨ **Fee Sponsorship** - AI agents don't need to hold gas tokens  
⚡ **Instant Settlement** - Sub-second payment confirmation  
🔄 **Parallel Payments** - Purchase multiple licenses simultaneously  
📦 **Batch Transactions** - Atomic multi-license purchases  
📝 **Transfer Memos** - On-chain content tracking  
🤖 **Autonomous Agents** - Self-funding, self-managing AI commerce

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenPayAI System                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐               │
│  │   Creator    │         │  AI Agent    │               │
│  │  Dashboard   │         │   (Node.js)  │               │
│  └──────┬───────┘         └──────┬───────┘               │
│         │                        │                        │
│         ▼                        ▼                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Backend API (Express)                 │ │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐ │ │
│  │  │  Content   │  │  License   │  │  Analytics   │ │ │
│  │  │  Registry  │  │  Manager   │  │    Engine    │ │ │
│  │  └────────────┘  └────────────┘  └──────────────┘ │ │
│  └────────────────────┬───────────────────────────────┘ │
│                       │                                   │
│                       ▼                                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Tempo Blockchain                      │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │  OpenPayAI Contract (TIP-20)                 │ │ │
│  │  │  - Content registration                      │ │ │
│  │  │  - License purchases with memos              │ │ │
│  │  │  - Batch operations                          │ │ │
│  │  │  - Fee sponsorship support                   │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │                                                         │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │  TIP-20 Token (AlphaUSD)                     │ │ │
│  │  │  - transferWithMemo()                        │ │ │
│  │  │  - Instant settlement                        │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎥 Demo

### 30-Second Pitch
> "AI agents are scraping content everywhere, but creators get nothing. OpenPayAI on Tempo enables autonomous AI-to-creator micropayments with instant settlement. Agents purchase content licenses in under a second, gas-free, using stablecoins."

### Live Demo Flow

1. **Creator registers content** ($0.05 per access)
2. **AI agent discovers content** via API
3. **Agent checks price** ($0.05) and decides to purchase
4. **Instant payment** via Tempo with fee sponsorship
5. **Agent retrieves content** with valid license
6. **Creator earns** instantly, no platform fees

**Key Tempo Features Demonstrated:**
- ✅ Fee sponsorship (agent has 0 tokens, pays 0 gas)
- ✅ Sub-second settlement
- ✅ Transfer memos for content tracking
- ✅ 2D nonces for parallel purchases
- ✅ Batch atomic transactions

---

## 🛠️ Tech Stack

### Blockchain
- **Network**: Tempo Testnet (Moderato)
- **Token Standard**: TIP-20
- **Settlement**: < 1 second
- **Gas**: Sponsored (users pay 0)

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **SDK**: Viem + Tempo SDK
- **API**: RESTful

### AI Agent
- **Language**: JavaScript (Node.js)
- **Autonomy**: Self-managing wallets
- **Features**: Parallel payments, batch ops, spending limits

### Frontend
- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **State**: React Query
- **Charts**: Recharts

---

## 📦 Project Structure

```
openpayai-tempo/
├── contract/
│   └── OpenPayAITempo.sol      # Smart contract
├── backend/
│   ├── server.js                # Express API
│   └── package.json
├── agent/
│   ├── agent.js                 # AI agent implementation
│   ├── examples/
│   │   ├── batch-purchase.js
│   │   └── parallel-payments.js
│   └── package.json
├── dashboard/
│   ├── app/                     # Next.js pages
│   ├── components/              # React components
│   └── package.json
├── shared/
│   └── config.js                # Shared configuration
└── README.md                    # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Tempo testnet wallet with AlphaUSD

### 1. Clone Repository

```bash
git clone https://github.com/Abraham12611/openpayai-tempo.git
cd openpayai-tempo
```

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env.local
# Edit .env.local with your keys
npm run dev
```

### 3. Setup AI Agent

```bash
cd ../agent
npm install
cp .env.example .env.local
# Edit .env.local with agent private key
node agent.js
```

### 4. Setup Dashboard

```bash
cd ../dashboard
npm install
cp .env.example .env.local
npm run dev
```

---

## 🔧 Configuration

### Environment Variables

#### Backend (.env.local)
```env
PORT=3001
TEMPO_RPC_URL=https://rpc.moderato.tempo.xyz
SERVER_PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
FRONTEND_URL=http://localhost:3000
```

#### Agent (.env.local)
```env
TEMPO_RPC_URL=https://rpc.moderato.tempo.xyz
BACKEND_URL=http://localhost:3001
AGENT_PRIVATE_KEY=0x...
MAX_PRICE_PER_ITEM=10000000
DAILY_SPENDING_LIMIT=100000000
USE_FEE_SPONSORSHIP=true
```

#### Dashboard (.env.local)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_TEMPO_RPC_URL=https://rpc.moderato.tempo.xyz
```

---

## 💡 Usage Examples

### Register Content

```javascript
// Creator registers content for $0.05 per access
const content = {
  contentHash: '0xabc123...',
  price: '50000', // $0.05 in 6 decimals
  contentURI: 'https://example.com/article',
  ownerAddress: '0xYourAddress...'
};

await fetch('http://localhost:3001/api/content/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(content)
});
```

### AI Agent Purchases License

```javascript
import OpenPayAIAgent from './agent.js';

// Create agent with fee sponsorship
const agent = new OpenPayAIAgent(privateKey, {
  useFeeSponsorship: true,
  maxPricePerItem: BigInt(10000000), // $10
  dailySpendingLimit: BigInt(100000000) // $100
});

// Purchase single license
await agent.purchaseLicense('0xabc123...');

// Batch purchase with parallel execution
await agent.purchaseBatch([
  '0xabc123...',
  '0xdef456...',
  '0xghi789...'
]);
```

### Check License Status

```bash
curl http://localhost:3001/api/license/check?agentAddress=0x...&contentHash=0x...
```

---

## 🎯 Tempo Features Demonstrated

### 1. Fee Sponsorship
```javascript
await client.token.transferSync({
  to: contentOwner,
  amount: price,
  token: alphaUsd,
  feePayer: true, // ✅ Gasless!
});
```

### 2. Transfer Memos
```javascript
const memo = pad(stringToHex(`LICENSE:${contentHash}:${timestamp}`), { size: 32 });

await client.token.transferSync({
  to: contentOwner,
  amount: price,
  token: alphaUsd,
  memo, // ✅ On-chain tracking
});
```

### 3. Parallel Payments (2D Nonces)
```javascript
await Promise.all(contentList.map((content, index) =>
  client.token.transferSync({
    to: content.owner,
    amount: content.price,
    token: alphaUsd,
    feePayer: true,
    nonceKey: index + 1, // ✅ Parallel execution
  })
));
```

### 4. Batch Transactions
```javascript
const calls = contentList.map(content => ({
  to: alphaUsd,
  data: encodeTransfer(content.owner, content.price, memo)
}));

await client.sendTransaction({ 
  calls, // ✅ Atomic batch
  feePayer: true 
});
```

---

## 📊 Business Model

### For Content Creators
- Set your own price ($0.01 - $10 per access)
- Instant revenue, no platform fees
- Full control over content
- Analytics dashboard

### For AI Agents
- Autonomous purchasing
- Spending limits and controls
- Batch discounts for bulk access
- No gas fees with sponsorship

### Revenue Potential
- $0.05 × 10,000 AI accesses = $500 revenue
- vs. $0 with traditional scraping
- Instant settlement vs. 30-day payout

---

## 🗺️ Roadmap

### Phase 1: Hackathon (Current)
- ✅ Core smart contract
- ✅ Backend API
- ✅ AI agent with fee sponsorship
- ✅ Creator dashboard
- ✅ Parallel & batch payments

### Phase 2: Production
- Multi-currency support (EUR, GBP)
- Dynamic pricing algorithms
- Subscription models
- Advanced analytics
- Mobile apps

### Phase 3: Scale
- AI agent marketplace
- Content discovery engine
- Automated pricing optimization
- Enterprise API
- Cross-chain expansion

---

## 🤝 Team

- **Abraham** - Full Stack Developer
  - Smart contract development
  - Backend architecture
  - AI agent implementation

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 🙏 Acknowledgments

- **Tempo Team** - For the amazing L1 blockchain optimized for payments
- **Canteen** - For organizing this hackathon
- **ETHGlobal** - For inspiration from ETHOnline 2025

---

## 📞 Contact

- GitHub: [@Abraham12611](https://github.com/Abraham12611)
- Demo: [YouTube](https://youtube.com/your-demo)
- Live: [Vercel](https://openpayai-tempo.vercel.app)

---

**Built with ❤️ for the Tempo Hackathon 2026**
