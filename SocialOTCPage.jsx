export function SocialOTCPage() {
  const mockListings = [
    { icon: '𝕏', platform: 'Twitter/X', name: '10K Follower Account', detail: 'Verified • 10,200 followers • 4yr aged', price: '0.05 BTC', mode: 'Fixed Price', tags: ['Verified', 'Aged', 'Niche: Crypto'] },
    { icon: '💬', platform: 'Discord', name: 'Active Server – 5K Members', detail: '5,100 members • Daily active • Gaming niche', price: null, mode: 'Offers Welcome', tags: ['Active', '5K+', 'Gaming'] },
    { icon: '🐙', platform: 'GitHub', name: 'Org with 800 Stars', detail: '3 repos • 800+ stars • Dev community', price: '0.018 BTC', mode: 'Fixed Price', tags: ['Dev', '800★', 'Org'] },
    { icon: '🤖', platform: 'Reddit', name: 'Subreddit 12K Subs', detail: 'r/cryptoalpha • 12K subscribers • 3yr old', price: null, mode: 'Offers Welcome', tags: ['12K subs', 'Crypto', 'Established'] },
    { icon: '👛', platform: 'Wallet', name: 'Full Wallet Surrender', detail: 'Complete key transfer • History included', price: '0.12 BTC', mode: 'Fixed Price', tags: ['Keys', 'Full Access', 'Verified'] },
    { icon: '📸', platform: 'Instagram', name: '25K Lifestyle Account', detail: '25K followers • 4.2% engagement • Fashion', price: null, mode: 'Offers Welcome', tags: ['25K', 'Fashion', 'High Eng.'] },
  ];

  return (
    <div className="fade-in social-page">
      <style>{`
        .social-page { }

        /* Hero */
        .social-hero {
          background: linear-gradient(135deg, var(--bg2), var(--bg3));
          border: 1.5px solid var(--border); border-radius: var(--radius);
          padding: 52px 32px; margin-bottom: 28px;
          position: relative; overflow: hidden; text-align: center;
        }
        .social-hero::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 100%, rgba(255,98,0,0.1), transparent 65%);
          pointer-events: none;
        }
        .social-hero::after {
          content: '🚀'; position: absolute; right: 32px; top: 24px;
          font-size: 80px; opacity: 0.06; pointer-events: none;
          animation: float 4s ease-in-out infinite;
        }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .sh-coming-pill {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--orange-dim); border: 1.5px solid var(--orange);
          color: var(--orange); padding: 6px 18px; border-radius: 99px;
          font-size: 12px; font-weight: 800; font-family: var(--mono);
          margin-bottom: 20px; letter-spacing: 1px;
        }
        .sh-coming-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--orange); animation: pulse 1.4s ease-in-out infinite; }
        .social-hero h1 { font-size: clamp(24px, 4vw, 40px); font-weight: 800; margin-bottom: 16px; line-height: 1.15; }
        .social-hero h1 span { color: var(--orange); }
        .social-hero .sh-desc { font-size: 14px; color: var(--muted); max-width: 640px; margin: 0 auto 24px; line-height: 1.75; }
        .sh-platforms { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 28px; }
        .sh-platform-pill {
          display: flex; align-items: center; gap: 7px;
          background: var(--bg); border: 1px solid var(--border);
          padding: 7px 16px; border-radius: 99px; font-size: 13px; font-weight: 600;
          transition: all 0.15s;
        }
        .sh-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

        /* Warning */
        .risk-banner {
          background: rgba(239,68,68,0.08); border: 1.5px solid var(--red);
          border-radius: var(--radius); padding: 16px 20px; margin-bottom: 28px;
          display: flex; gap: 14px; align-items: flex-start;
        }
        .risk-icon { font-size: 24px; flex-shrink: 0; margin-top: 2px; }
        .risk-title { font-weight: 800; font-size: 14px; color: var(--red); margin-bottom: 4px; }
        .risk-text { font-size: 12px; color: var(--muted); line-height: 1.7; }

        /* Upcoming label */
        .upcoming-label {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--bg2); border: 1px solid var(--border);
          padding: 5px 14px; border-radius: 99px; font-size: 11px;
          font-family: var(--mono); color: var(--muted); margin-bottom: 16px;
        }

        /* Mock grid */
        .mock-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 32px; }
        .mock-card {
          background: var(--bg2); border: 1.5px solid var(--border);
          border-radius: var(--radius); padding: 20px; position: relative;
          overflow: hidden;
        }
        .mock-card::after {
          content: 'COMING SOON';
          position: absolute; inset: 0; background: rgba(12,17,32,0.72);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; letter-spacing: 2px;
          color: var(--orange); font-family: var(--mono);
          backdrop-filter: blur(3px);
        }
        html.light .mock-card::after { background: rgba(245,247,255,0.78); }
        .mc-top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .mc-icon-wrap {
          width: 44px; height: 44px; border-radius: 12px;
          background: var(--bg3); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;
        }
        .mc-platform { font-size: 11px; color: var(--muted); font-family: var(--mono); }
        .mc-name { font-size: 15px; font-weight: 700; }
        .mc-detail { font-size: 12px; color: var(--muted); margin-bottom: 12px; line-height: 1.5; }
        .mc-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
        .mc-tag { background: var(--bg3); border: 1px solid var(--border); padding: 2px 8px; border-radius: 6px; font-size: 10px; color: var(--muted); font-family: var(--mono); }
        .mc-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--border); }
        .mc-price { font-family: var(--mono); font-weight: 700; font-size: 15px; color: var(--green); }
        .mc-mode { font-size: 11px; color: var(--orange); font-family: var(--mono); }

        /* Feature grid */
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; margin-bottom: 32px; }
        .feature-card {
          background: var(--bg2); border: 1.5px solid var(--border);
          border-radius: var(--radius); padding: 20px;
        }
        .feature-icon { font-size: 26px; margin-bottom: 10px; }
        .feature-title { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
        .feature-desc { font-size: 12px; color: var(--muted); line-height: 1.7; }

        /* CTA banner */
        .cta-banner {
          background: linear-gradient(135deg, var(--bg2), var(--bg3));
          border: 1.5px solid var(--orange);
          border-radius: var(--radius); padding: 36px 28px; text-align: center;
          position: relative; overflow: hidden;
        }
        .cta-banner::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 0%, rgba(255,98,0,0.12), transparent 60%);
          pointer-events: none;
        }
        .cta-banner h2 { font-size: 22px; font-weight: 800; margin-bottom: 8px; position: relative; }
        .cta-banner p { font-size: 14px; color: var(--muted); margin-bottom: 22px; position: relative; max-width: 500px; margin-left: auto; margin-right: auto; }
        .cta-hashtags { font-family: var(--mono); font-size: 12px; color: var(--orange); margin-bottom: 20px; position: relative; }
        .cta-buttons { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; position: relative; }

        @media(max-width: 600px) {
          .social-hero { padding: 32px 16px; }
          .mock-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Hero */}
      <div className="social-hero">
        <div className="sh-coming-pill">
          <span className="sh-coming-dot" />
          UPCOMING FEATURE — NOT AVAILABLE YET
        </div>
        <h1>Social OTC <span>&</span> Wallet Marketplace 🚀</h1>
        <p className="sh-desc">
          Sell or buy social media accounts (Discord servers, Twitter/X profiles, GitHub repos, Reddit communities)
          and wallet surrenders directly P2P with BTC escrow — no middleman, no slippage, trustlessly on Bitcoin L1 via OP_NET.
        </p>
        <div className="sh-platforms">
          {['𝕏 Twitter/X', '💬 Discord', '🐙 GitHub', '🤖 Reddit', '📸 Instagram', '👛 Crypto Wallets'].map(p => (
            <span key={p} className="sh-platform-pill">{p}</span>
          ))}
        </div>
        <div className="sh-ctas">
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button className="btn btn-orange">🔔 Follow for Updates</button>
          </a>
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button className="btn btn-ghost">📬 Join Waitlist</button>
          </a>
        </div>
      </div>

      {/* Risk warning */}
      <div className="risk-banner">
        <div className="risk-icon">⚠️</div>
        <div>
          <div className="risk-title">High-Risk Category — Use at Own Risk</div>
          <div className="risk-text">
            Trading social accounts and wallet access involves significant risk. Platform ToS may be violated. Always verify ownership proof before transacting.
            This feature will include mandatory risk acknowledgment, proof-of-ownership verification, and dispute resolution — but exercise extreme caution.
            XCHANGE and OP_NET take no responsibility for account bans, ToS violations, or loss of funds.
          </div>
        </div>
      </div>

      {/* Mock listings */}
      <div style={{ marginBottom: 10 }}>
        <span className="upcoming-label">🔒 Preview — Listings not functional yet</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Example Listings</h2>
        <span style={{ background: 'var(--orange-dim)', color: 'var(--orange)', padding: '3px 12px', borderRadius: 99, fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700 }}>COMING SOON</span>
      </div>
      <div className="mock-grid">
        {mockListings.map((l, i) => (
          <div key={i} className="mock-card">
            <div className="mc-top">
              <div className="mc-icon-wrap">{l.icon}</div>
              <div>
                <div className="mc-platform">{l.platform}</div>
                <div className="mc-name">{l.name}</div>
              </div>
            </div>
            <div className="mc-detail">{l.detail}</div>
            <div className="mc-tags">
              {l.tags.map(t => <span key={t} className="mc-tag">{t}</span>)}
            </div>
            <div className="mc-footer">
              <span className="mc-price">{l.price || '🤝 Offers'}</span>
              <span className="mc-mode">{l.mode}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Planned features */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Planned Features</h2>
      <div className="feature-grid">
        {[
          { icon: '📸', title: 'Proof of Ownership', desc: 'Sellers attach screenshots, follower counts, and on-chain attestations before listing goes live.' },
          { icon: '🤝', title: 'Offers & Counteroffers', desc: 'Full offer/counteroffer flow, same escrow system as the main OTC market.' },
          { icon: '🔄', title: 'Secure Transfer Protocol', desc: 'Structured handover — account credentials released only after BTC confirmed in escrow.' },
          { icon: '⚖️', title: 'Dispute Resolution', desc: 'OP_NET arbiter system for contested transfers. Time-locked escrow with third-party adjudication.' },
          { icon: '🛡️', title: 'Reputation System', desc: 'On-chain trade history and reputation scores for buyers and sellers.' },
          { icon: '🔔', title: 'Alerts & Watchlist', desc: 'Get notified when accounts matching your criteria are listed.' },
        ].map((f, i) => (
          <div key={i} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* CTA banner */}
      <div className="cta-banner">
        <h2>Launching Soon on OP_NET 🚀</h2>
        <p>Be among the first to list or buy when Social OTC goes live. Follow us for launch announcements and early access.</p>
        <div className="cta-hashtags">#XCHANGE &nbsp;·&nbsp; #BitcoinDeFi &nbsp;·&nbsp; #OPNET &nbsp;·&nbsp; #SocialOTC</div>
        <div className="cta-buttons">
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button className="btn btn-orange" style={{ padding: '11px 24px' }}>𝕏 Follow @XCHANGE</button>
          </a>
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button className="btn btn-ghost" style={{ padding: '11px 24px' }}>📬 Join Waitlist</button>
          </a>
          <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button className="btn btn-ghost" style={{ padding: '11px 24px' }}>💬 Discord Community</button>
          </a>
        </div>
      </div>
    </div>
  );
}
