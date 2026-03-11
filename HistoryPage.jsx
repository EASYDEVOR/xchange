import { satsToBtc, shortAddress } from '../lib/opnet.js';

export function HistoryPage({ wallet, txHistory }) {
  if (!wallet) return (
    <div className="empty-state">
      <div className="empty-icon">🔐</div>
      <div className="empty-title">Wallet Required</div>
      <div className="empty-sub">Connect your OP_WALLET to view your transaction history.</div>
    </div>
  );
  return (
    <div className="fade-in">
      <h2 className="section-title">Transaction History</h2>
      {txHistory.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📜</div><div className="empty-title">No transactions yet</div></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>TX ID</th><th>Type</th><th>Asset ID</th><th>Amount</th><th>Counterparty</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {txHistory.map(t => (
                <tr key={t.id}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{t.id}</td>
                  <td><span className={`chip chip-${t.type}`}>{t.type === 'buy' ? '▼ BUY' : '▲ SELL'}</span></td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{t.listingId}</td>
                  <td style={{ fontFamily: 'var(--mono)', color: t.type === 'buy' ? 'var(--red)' : 'var(--green)' }}>
                    {t.type === 'buy' ? '−' : '+'}{satsToBtc(t.amount)}
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>{shortAddress(t.buyer)}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(t.date).toLocaleString()}</td>
                  <td><span className={`status-badge status-${t.status}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
