import { useState, useRef, useEffect } from 'react';
import { shortAddress, satsToBtc } from '../lib/opnet.js';

export function WalletButton({ wallet, balances, connecting, error, installed, onConnect, onDisconnect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!installed) return (
    <a href="https://opnet.org/wallet" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
        📥 Install OP_WALLET
      </button>
    </a>
  );

  if (!wallet) return (
    <button className="btn btn-orange btn-sm" onClick={onConnect} disabled={connecting}>
      {connecting ? <><span className="spinner-sm" />Connecting…</> : '🟠 Connect OP_WALLET'}
    </button>
  );

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)} style={{ fontFamily: 'var(--mono)', fontSize: 11, gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
        {shortAddress(wallet.address)}
        <span style={{ opacity: 0.5 }}>▾</span>
      </button>
      {open && (
        <div className="wallet-dropdown slide-in">
          <div className="wd-addr">{wallet.address}</div>
          <div className="wd-network">
            <span className="wd-dot" style={{ background: wallet.network === 'mainnet' ? 'var(--green)' : 'var(--orange)' }} />
            {wallet.network || 'testnet'}
          </div>
          <div className="wd-divider" />
          <div className="wd-bal-row"><span>BTC Balance</span><span>{balances.btc !== null ? satsToBtc(balances.btc) : '—'}</span></div>
          <div className="wd-bal-row"><span>OP_20 Tokens</span><span>{balances.tokens?.length ?? 0}</span></div>
          <div className="wd-bal-row"><span>OP_721 NFTs</span><span>{balances.nfts?.length ?? 0}</span></div>
          <div className="wd-divider" />
          <button className="btn btn-red btn-sm" style={{ width: '100%' }} onClick={() => { onDisconnect(); setOpen(false); }}>
            Disconnect
          </button>
        </div>
      )}
      {error && <div style={{ position: 'absolute', top: 40, right: 0, background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'var(--red)', whiteSpace: 'nowrap', zIndex: 200 }}>{error}</div>}
    </div>
  );
}
