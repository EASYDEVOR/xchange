import { useState } from 'react';
import { ListingCard } from '../components/ListingCard.jsx';
import { Logo } from '../components/Logo.jsx';

export function MarketPage({ listings, offers = [], onSelect, onCreateListing, wallet }) {
  const [search,      setSearch]      = useState('');
  const [filterType,  setFilterType]  = useState('all');
  const [filterMode,  setFilterMode]  = useState('all');
  const [sort,        setSort]        = useState('newest');

  const filtered = listings
    .filter(l => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (l.name || '').toLowerCase().includes(q)
        || (l.symbol || '').toLowerCase().includes(q)
        || (l.collection || '').toLowerCase().includes(q)
        || (l.seller || '').toLowerCase().includes(q)
        || (l.contractAddress || '').toLowerCase().includes(q);
    })
    .filter(l => filterType === 'all' || l.type === filterType)
    .filter(l => filterMode === 'all' || l.priceMode === filterMode)
    .sort((a, b) => {
      if (sort === 'newest')     return b.posted - a.posted;
      if (sort === 'oldest')     return a.posted - b.posted;
      if (sort === 'price_asc')  return (a.price || Infinity) - (b.price || Infinity);
      if (sort === 'price_desc') return (b.price || 0) - (a.price || 0);
      return 0;
    });

  const offerCount = (listingId) => offers.filter(o => o.listingId === listingId && o.escrowStatus === 'locked').length;

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="hero-inner">
          <div className="hero-logo">
            <Logo size={64} />
            <div>
              <h1 className="hero-title">X<span style={{ color: 'var(--orange)' }}>CHANGE</span></h1>
              <div className="hero-sub">OTC P2P Trading on Bitcoin L1</div>
            </div>
          </div>
          <p className="hero-desc">No slippage. No price impact. Direct peer-to-peer trading for OP_20 tokens and OP_721 NFTs against BTC. All assets locked in on-chain escrow before listing.</p>
          <div className="hero-pills">
            <span className="pill green">✅ Zero Slippage</span>
            <span className="pill orange">🔐 Asset Escrowed First</span>
            <span className="pill">⛓️ Bitcoin L1</span>
            <span className="pill">🤝 Real P2P</span>
            <span className="pill">🧪 Testnet</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-wrap">
          <input className="inp" placeholder="🔍  Search by name, symbol, contract address, seller…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="inp sel" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="OP_20">OP_20 Tokens</option>
          <option value="OP_721">OP_721 NFTs</option>
        </select>
        <select className="inp sel" value={filterMode} onChange={e => setFilterMode(e.target.value)}>
          <option value="all">All Prices</option>
          <option value="fixed">Fixed Price</option>
          <option value="offers">Offers Only</option>
        </select>
        <select className="inp sel" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
        </select>
        <button className="btn btn-orange" onClick={onCreateListing}>+ Create Listing</button>
      </div>

      <div className="listings-header">
        <h2>Active Listings</h2>
        <span className="count-badge">{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{search ? '🔍' : '📋'}</div>
          <div className="empty-title">{search ? 'No listings match your search' : 'No listings yet'}</div>
          <div className="empty-sub">
            {search ? 'Try a different search term or contract address.' : 'Every listing requires the seller to lock their asset in escrow first — so every listing you see is 100% real.'}
          </div>
          {!search && (
            <button className="btn btn-orange" style={{ marginTop: 16 }} onClick={onCreateListing}>+ Create First Listing</button>
          )}
        </div>
      ) : (
        <div className="listings-grid">
          {filtered.map(l => (
            <ListingCard key={l.id} listing={l} offerCount={offerCount(l.id)} onClick={() => onSelect(l)} />
          ))}
        </div>
      )}
    </div>
  );
}
