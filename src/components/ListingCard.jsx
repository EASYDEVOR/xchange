import { shortAddress, satsToBtc } from '../lib/opnet.js';

function timeAgo(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export function ListingCard({ listing, offerCount = 0, onClick }) {
  const isNFT = listing.type === 'OP_721';
  return (
    <div className="listing-card fade-in" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="lc-emoji">{listing.image || (isNFT ? '🎨' : '🔵')}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <span className={`type-badge ${isNFT ? 'nft' : 'token'}`}>{listing.type}</span>
        <span className="type-badge" style={{ background: 'var(--green-dim)', color: 'var(--green)', fontSize: 9 }}>🔐 ESCROWED</span>
        {listing.priceMode === 'offers' && <span className="type-badge offers">OFFERS</span>}
        {offerCount > 0 && <span className="type-badge" style={{ background: 'var(--orange-dim)', color: 'var(--orange)' }}>{offerCount} offer{offerCount !== 1 ? 's' : ''}</span>}
      </div>
      <div className="lc-name">{isNFT ? listing.name : `${listing.amount} ${listing.symbol}`}</div>
      <div className="lc-sub">{listing.collection || listing.symbol || ''}</div>
      <div className="lc-price" style={{ color: listing.priceMode === 'offers' ? 'var(--orange)' : 'var(--green)' }}>
        {listing.priceMode === 'fixed' ? satsToBtc(listing.price) : '🤝 Accept Offers'}
      </div>
      {listing.desc && <div className="lc-desc">{listing.desc.slice(0, 70)}{listing.desc.length > 70 ? '…' : ''}</div>}
      <div className="lc-footer">
        <span className="lc-seller" title={listing.seller}>{shortAddress(listing.seller)}</span>
        <span className="lc-time">{timeAgo(listing.posted)}</span>
      </div>
    </div>
  );
}
