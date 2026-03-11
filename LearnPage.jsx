export function LearnPage() {
  const articles = [
    { icon: '🔄', title: 'What is OTC Trading?', body: 'Over-the-Counter (OTC) trading means you trade directly with another person — no exchange or order book in between. You agree on a price, the deal settles directly between the two parties. XCHANGE facilitates this on Bitcoin L1 using OP_NET smart contracts as the trust layer.' },
    { icon: '📉', title: 'Why Zero Slippage?', body: 'Slippage occurs when you trade against a liquidity pool and the price shifts as your order executes. In OTC, you agree on an exact price upfront — so what you see is exactly what you pay. No front-running, no sandwich attacks, no surprise fees.' },
    { icon: '🔐', title: 'Provably Fair Escrow', body: 'When a seller creates a listing, their asset is locked in a transparent OP_NET smart contract. When a buyer pays, their BTC is also locked. Only when both parties confirm does the swap happen — atomically, on-chain, and without any trusted third party.' },
    { icon: '⏱️', title: 'Timelock Refunds', body: 'If a trade is started but not completed within 48 hours, the smart contract automatically refunds both parties. This prevents funds from being stuck indefinitely and ensures neither party can hold assets hostage.' },
    { icon: '🎯', title: 'Fixed Price vs Offers', body: 'Sellers choose: set a firm BTC price (buyer pays exact amount to escrow), or enable Accept Offers mode where buyers submit BTC proposals and sellers can accept, reject, or counter. Both modes use the same escrow system.' },
    { icon: '🛡️', title: 'Security & Fees', body: 'All contracts use ReentrancyGuard, role-based access controls, and an emergency pause mechanism. Every action emits an on-chain event for full auditability. A 1% protocol fee on successful trades funds ongoing XCHANGE development.' },
  ];
  return (
    <div className="fade-in">
      <h2 className="section-title">📖 Learn</h2>
      <div className="learn-grid">
        {articles.map((a, i) => (
          <div key={i} className="learn-card">
            <div className="learn-icon">{a.icon}</div>
            <h3>{a.title}</h3>
            <p>{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
