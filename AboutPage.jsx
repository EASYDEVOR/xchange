import { Logo } from '../components/Logo.jsx';

export function AboutPage() {
  return (
    <div className="fade-in" style={{ maxWidth: 700 }}>
      <h2 className="section-title">ℹ️ About XCHANGE</h2>
      <div className="learn-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <Logo size={52} />
          <div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>XCHANGE</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>OTC P2P · Bitcoin L1 · OP_NET</div>
          </div>
        </div>
        <p>XCHANGE is a fully decentralized OTC peer-to-peer marketplace on Bitcoin L1 using OP_NET infrastructure. Trade OP_20 tokens and OP_721 NFTs directly for BTC — no AMMs, no slippage, no custody, no middlemen. Just provably fair escrow smart contracts.</p>
      </div>
      <div className="learn-card" style={{ marginBottom: 16 }}>
        <h3>🔗 Built On OP_NET</h3>
        <p style={{ marginTop: 8 }}>OP_NET is a Bitcoin-native smart contract platform enabling trustless, programmable settlement directly on Bitcoin Layer 1. All XCHANGE listings, offers, and trades are recorded on-chain. Your keys, your assets.</p>
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="https://opnet.org" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button className="btn btn-ghost btn-sm">🌐 opnet.org</button>
          </a>
          <a href="https://testnet.opnet.org" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button className="btn btn-ghost btn-sm">🧪 Testnet Explorer</button>
          </a>
        </div>
      </div>
      <div className="learn-card" style={{ marginBottom: 16 }}>
        <h3>🏆 Vibecode Submission</h3>
        <p style={{ marginTop: 8 }}>XCHANGE is submitted to <b>vibecode.finance</b> as a demonstration of next-generation OTC infrastructure on Bitcoin L1 via OP_NET. Fully open-source. Live on Vercel.</p>
        <div style={{ marginTop: 14 }}>
          <a href="https://vibecode.finance" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button className="btn btn-orange btn-sm">🏆 vibecode.finance</button>
          </a>
        </div>
      </div>
      <div className="learn-card">
        <h3>📬 Contact</h3>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm">𝕏 Twitter/X</button>
          <button className="btn btn-ghost btn-sm">💬 Telegram</button>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button className="btn btn-ghost btn-sm">🐙 GitHub</button>
          </a>
        </div>
      </div>
    </div>
  );
}
