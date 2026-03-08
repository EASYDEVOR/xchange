import { useState } from 'react';
import { satsToBtc, shortAddress, explorerTx, FLAT_FEE_SATS } from '../lib/opnet.js';

function timeAgo(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export function DashboardPage({ wallet, myListings, myOffers, receivedOffers, onCancel, onAcceptOffer, onRejectOffer, actionLoading }) {
  const [tab, setTab] = useState('listings');

  if (!wallet) return (
    <div className="empty-state">
      <div className="empty-icon">🔐</div>
      <div className="empty-title">Wallet Required</div>
      <div className="empty-sub">Connect your OP_WALLET to view your dashboard.</div>
    </div>
  );

  const tabs = [
    { id: 'listings',      label: `My Listings (${myListings.length})` },
    { id: 'offers_sent',   label: `Offers Sent (${myOffers.length})` },
    { id: 'offers_recv',   label: `Offers Received (${receivedOffers.length})` },
  ];

  return (
    <div className="fade-in">
      <h2 className="section-title">My Dashboard</h2>
      <div className="dash-addr">{wallet.address}</div>
      <div className="dash-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`dash-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'listings' && (
        myListings.length === 0 ? <EmptyTab icon="📋" text="No listings yet" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Asset</th><th>Contract</th><th>Price</th><th>Escrow</th><th>Status</th><th>Posted</th><th>Actions</th></tr></thead>
              <tbody>
                {myListings.map(l => (
                  <tr key={l.id}>
                    <td><b>{l.type === 'OP_20' ? `${l.amount} ${l.symbol}` : l.name}</b></td>
                    <td>
                      {l.contractAddress ? (
                        <a href={`https://testnet.opnet.org/address/${l.contractAddress}`} target="_blank" rel="noopener" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--orange)' }}>
                          {shortAddress(l.contractAddress)} ↗
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', color: l.priceMode === 'fixed' ? 'var(--green)' : 'var(--orange)', fontSize: 12 }}>
                      {l.priceMode === 'fixed' ? satsToBtc(l.price) : '🤝 Offers'}
                    </td>
                    <td>
                      <span className={`status-badge status-${l.escrowStatus === 'locked' ? 'active' : l.escrowStatus}`}>
                        {l.escrowStatus === 'locked' ? '🔐 locked' : l.escrowStatus}
                      </span>
                    </td>
                    <td><span className={`status-badge status-${l.status}`}>{l.status}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{timeAgo(l.posted)}</td>
                    <td>
                      {l.status === 'active' && (
                        <button className="btn btn-red btn-sm"
                          onClick={() => onCancel(l.id)}
                          disabled={actionLoading === 'cancel_' + l.id}
                        >
                          {actionLoading === 'cancel_' + l.id ? '…' : 'Cancel & Unlock'}
                        </button>
                      )}
                      {l.lockTxid && (
                        <a href={explorerTx(l.lockTxid)} target="_blank" rel="noopener" style={{ marginLeft: 6, fontSize: 11, color: 'var(--orange)' }}>TX ↗</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'offers_sent' && (
        myOffers.length === 0 ? <EmptyTab icon="🤝" text="No offers sent yet" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Listing</th><th>Offer Amount</th><th>BTC Locked</th><th>Escrow</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {myOffers.map(o => (
                  <tr key={o.id}>
                    <td><b>{o.listingName}</b></td>
                    <td style={{ fontFamily: 'var(--mono)', color: 'var(--orange)', fontSize: 12 }}>{satsToBtc(o.amount)}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{satsToBtc(o.amount + FLAT_FEE_SATS)}</td>
                    <td><span className={`status-badge status-${o.escrowStatus === 'locked' ? 'active' : o.escrowStatus}`}>
                      {o.escrowStatus === 'locked' ? '🔐 locked' : o.escrowStatus}
                    </span></td>
                    <td><span className={`status-badge status-${o.status}`}>{o.status}</span></td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{timeAgo(o.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'offers_recv' && (
        receivedOffers.length === 0 ? <EmptyTab icon="📬" text="No offers received yet" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Listing</th><th>From</th><th>Offer</th><th>Escrow</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {receivedOffers.map(o => (
                  <tr key={o.id}>
                    <td><b>{o.listingName}</b></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{shortAddress(o.from)}</td>
                    <td style={{ fontFamily: 'var(--mono)', color: 'var(--orange)', fontSize: 13, fontWeight: 700 }}>{satsToBtc(o.amount)}</td>
                    <td><span className="status-badge status-active">🔐 locked</span></td>
                    <td><span className={`status-badge status-${o.status}`}>{o.status}</span></td>
                    <td>
                      {o.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-green btn-sm" onClick={() => onAcceptOffer(o.id)} disabled={actionLoading === 'accept_' + o.id}>
                            {actionLoading === 'accept_' + o.id ? '…' : '✅ Accept'}
                          </button>
                          <button className="btn btn-red btn-sm" onClick={() => onRejectOffer(o.id)}>
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function EmptyTab({ icon, text }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><div className="empty-title">{text}</div></div>;
}
