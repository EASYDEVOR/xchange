import { useState } from 'react';
import { satsToBtc, shortAddress, btcToSats, calcFees, FLAT_FEE_SATS, explorerAddress, explorerTx } from '../lib/opnet.js';
import { Modal } from '../components/Modal.jsx';

function timeAgo(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export function ListingDetailPage({ listing, offers = [], onBack, onBuy, onOffer, onAcceptOffer, wallet, actionLoading }) {
  const [offerBtc, setOfferBtc]         = useState('');
  const [buyModal, setBuyModal]         = useState(false);
  const [offerModal, setOfferModal]     = useState(false);
  const isNFT    = listing.type === 'OP_721';
  const isMine   = wallet?.address === listing.seller;
  const isBuying  = actionLoading === 'buy_' + listing.id;
  const isOffering = actionLoading?.startsWith('offer_');

  // Offers visible on this listing
  const listingOffers = offers.filter(o => o.listingId === listing.id && o.escrowStatus === 'locked');

  const handleBuyConfirm = () => { onBuy(listing); setBuyModal(false); };
  const handleOfferConfirm = () => {
    const v = parseFloat(offerBtc);
    if (!v || v <= 0) return;
    onOffer(listing.id, listing.type === 'OP_20' ? `${listing.amount} ${listing.symbol}` : listing.name, offerBtc);
    setOfferModal(false);
    setOfferBtc('');
  };

  const fees    = listing.price ? calcFees(listing.price) : null;
  const total   = fees ? listing.price + fees.flat + fees.pct : 0;

  return (
    <div className="fade-in">
      <button className="back-btn" onClick={onBack}>← Back to Market</button>

      {/* Escrow status bar */}
      <EscrowStatusBar listing={listing} />

      <div className="detail-layout">
        {/* Left – Asset */}
        <div className="detail-asset-panel">
          <div className="detail-emoji">{listing.image || (isNFT ? '🎨' : '🔵')}</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
            <span className={`type-badge ${isNFT ? 'nft' : 'token'}`}>{listing.type}</span>
            {listing.escrowStatus === 'locked' && <span className="type-badge" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>🔐 ESCROWED</span>}
            {listing.priceMode === 'offers' && <span className="type-badge offers">OFFERS</span>}
          </div>
          <div className="detail-name">{isNFT ? listing.name : `${listing.amount} ${listing.symbol}`}</div>
          {listing.collection && <div className="detail-coll">{listing.collection}</div>}
          {listing.contractAddress && (
            <div style={{ marginTop: 10 }}>
              <a href={explorerAddress(listing.contractAddress)} target="_blank" rel="noopener" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--orange)' }}>
                {shortAddress(listing.contractAddress)} ↗
              </a>
            </div>
          )}
          {listing.desc && <div className="detail-desc">{listing.desc}</div>}
        </div>

        {/* Right – Info + Actions */}
        <div className="detail-right">
          {/* Info table */}
          <div className="info-panel">
            <div className="info-title">Listing Details</div>
            <InfoRow label="Listing ID"   value={listing.id} mono />
            <InfoRow label="Seller"       value={<a href={explorerAddress(listing.seller)} target="_blank" rel="noopener" style={{ color: 'var(--orange)', fontFamily: 'var(--mono)', fontSize: 12 }}>{shortAddress(listing.seller)}</a>} />
            <InfoRow label="Posted"       value={timeAgo(listing.posted)} />
            {!isNFT && <InfoRow label="Amount"  value={`${listing.amount} ${listing.symbol}`} mono />}
            {isNFT  && <InfoRow label="Token ID" value={`#${listing.nftId}`} mono />}
            <InfoRow label="Price Mode"   value={listing.priceMode === 'fixed' ? '💰 Fixed Price' : '🤝 Accept Offers'} />
            {listing.priceMode === 'fixed' && <InfoRow label="Price" value={satsToBtc(listing.price)} mono style={{ color: 'var(--green)', fontSize: 16, fontWeight: 800 }} />}
            {listing.lockTxid && (
              <InfoRow label="Lock TX" value={<a href={explorerTx(listing.lockTxid)} target="_blank" rel="noopener" style={{ color: 'var(--orange)', fontFamily: 'var(--mono)', fontSize: 11 }}>{listing.lockTxid.slice(0, 16)}… ↗</a>} />
            )}
          </div>

          {/* Buy / Offer action */}
          {!isMine && (
            <div className="action-panel">
              {listing.priceMode === 'fixed' ? (
                <>
                  <div className="action-price-label">Price</div>
                  <div className="action-price">{satsToBtc(listing.price)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 4 }}>{Number(listing.price).toLocaleString()} sats</div>
                  {fees && (
                    <div className="mini-fee-table">
                      <div className="mft-row"><span>Asset price</span><span>{satsToBtc(listing.price)}</span></div>
                      <div className="mft-row"><span>Flat fee (~$3)</span><span>{satsToBtc(FLAT_FEE_SATS)}</span></div>
                      <div className="mft-row"><span>Protocol fee (1%)</span><span>{satsToBtc(fees.pct)}</span></div>
                      <div className="mft-row mft-total"><span>You pay</span><span style={{ color: 'var(--green)' }}>{satsToBtc(total)}</span></div>
                    </div>
                  )}
                  {wallet ? (
                    <button className="btn btn-green" style={{ width: '100%', marginTop: 12 }} onClick={() => setBuyModal(true)} disabled={isBuying}>
                      {isBuying ? <><span className="spinner-sm" /> Processing…</> : '⚡ Buy Now'}
                    </button>
                  ) : <div className="action-no-wallet">Connect OP_WALLET to buy</div>}
                </>
              ) : (
                <>
                  <div className="action-price-label">Make an Offer</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
                    Your BTC will be <strong>locked in escrow</strong> until the seller accepts or rejects. You can see your offer status on the Dashboard.
                  </div>
                  {wallet ? (
                    <button className="btn btn-orange" style={{ width: '100%' }} onClick={() => setOfferModal(true)} disabled={isOffering}>
                      {isOffering ? <><span className="spinner-sm" /> Locking BTC…</> : '🤝 Make Offer'}
                    </button>
                  ) : <div className="action-no-wallet">Connect OP_WALLET to make offers</div>}
                </>
              )}
              <div className="escrow-note">🔐 Escrow: Asset locked until trade confirmed. 48h timelock auto-refund. Fees to treasury in BTC only.</div>
            </div>
          )}

          {isMine && (
            <div className="action-panel">
              <div style={{ color: 'var(--orange)', fontWeight: 700, marginBottom: 6, fontSize: 14 }}>📋 Your Listing</div>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>Manage from Dashboard → My Listings.</div>
            </div>
          )}

          {/* Offers on this listing */}
          {listingOffers.length > 0 && (
            <div className="offers-panel">
              <div className="offers-title">🤝 Offers Received ({listingOffers.length})</div>
              {listingOffers.map(o => (
                <div key={o.id} className="offer-row">
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{shortAddress(o.from)}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--orange)', fontFamily: 'var(--mono)' }}>{satsToBtc(o.amount)}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(o.date)}</div>
                  </div>
                  {isMine && o.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6, alignSelf: 'center' }}>
                      <button className="btn btn-green btn-sm" onClick={() => onAcceptOffer(o.id)} disabled={actionLoading === 'accept_' + o.id}>
                        {actionLoading === 'accept_' + o.id ? '…' : 'Accept'}
                      </button>
                    </div>
                  )}
                  {o.status !== 'pending' && <span className={`status-badge status-${o.status}`}>{o.status}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Escrow how-it-works */}
          <div className="escrow-panel">
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>⚡ Escrow Flow</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.9 }}>
              1. Seller locked asset in escrow (this listing ✅)<br/>
              2. Buyer pays BTC (price + flat fee + 1% protocol fee)<br/>
              3. Smart contract holds everything until confirmed<br/>
              4. Confirmed → asset to buyer, BTC (minus fees) to seller<br/>
              5. Fees → treasury <code style={{ color: 'var(--orange)', fontSize: 10 }}>opt1ppzns…dvsyc</code><br/>
              6. 48h no-action → auto-refund both parties
            </div>
          </div>
        </div>
      </div>

      {/* Buy Modal */}
      <Modal open={buyModal} onClose={() => setBuyModal(false)} title="Confirm Purchase">
        <div className="confirm-asset-box">
          <div style={{ fontSize: 36 }}>{listing.image || '🔵'}</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{isNFT ? listing.name : `${listing.amount} ${listing.symbol}`}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>from {shortAddress(listing.seller)}</div>
          </div>
        </div>
        <div className="confirm-fee-table">
          <ConfirmRow label="Asset price"          val={satsToBtc(listing.price)} />
          <ConfirmRow label="Flat fee (~$3 USD)"   val={satsToBtc(FLAT_FEE_SATS)} />
          <ConfirmRow label="Protocol fee (1%)"    val={satsToBtc(fees?.pct)} />
          <ConfirmRow label="Total you pay"        val={satsToBtc(total)} bold green />
          <ConfirmRow label="Seller receives"      val={satsToBtc(listing.price - (fees?.pct || 0))} />
          <ConfirmRow label="Treasury receives"    val={satsToBtc((fees?.flat || 0) + (fees?.pct || 0))} muted />
        </div>
        <div className="confirm-note">🔐 BTC locked in escrow. Asset released on confirmation. 48h auto-refund if no action.</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={() => setBuyModal(false)}>Cancel</button>
          <button className="btn btn-green" onClick={handleBuyConfirm}>⚡ Confirm &amp; Pay</button>
        </div>
      </Modal>

      {/* Offer Modal */}
      <Modal open={offerModal} onClose={() => setOfferModal(false)} title="Make an Offer">
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
            Your BTC offer will be <strong>locked in escrow immediately</strong>. The seller can accept or reject. If accepted, the asset is transferred to you. If rejected, your BTC is refunded minus the flat fee.
          </div>
          <label className="form-label">Your Offer (BTC)</label>
          <input className="inp" type="number" step="0.00001" min="0" placeholder="0.00100" value={offerBtc} onChange={e => setOfferBtc(e.target.value)} autoFocus />
          {offerBtc && !isNaN(parseFloat(offerBtc)) && parseFloat(offerBtc) > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="confirm-fee-table" style={{ marginTop: 0 }}>
                <ConfirmRow label="Your offer" val={satsToBtc(btcToSats(offerBtc))} />
                <ConfirmRow label="Flat fee (~$3 USD)" val={satsToBtc(FLAT_FEE_SATS)} />
                <ConfirmRow label="Total locked in escrow" val={satsToBtc(btcToSats(offerBtc) + FLAT_FEE_SATS)} bold />
              </div>
            </div>
          )}
        </div>
        <div className="confirm-note">⚠️ Flat fee is non-refundable. Offer BTC is refunded if rejected.</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn btn-ghost" onClick={() => setOfferModal(false)}>Cancel</button>
          <button className="btn btn-orange" onClick={handleOfferConfirm} disabled={!offerBtc || parseFloat(offerBtc) <= 0}>
            🔐 Lock BTC &amp; Send Offer
          </button>
        </div>
      </Modal>

      <DetailStyles />
    </div>
  );
}

function EscrowStatusBar({ listing }) {
  const map = {
    locked:   { color: 'var(--green)',  icon: '🔐', text: 'Asset Locked in Escrow — Listing Active' },
    sold:     { color: 'var(--orange)', icon: '✅', text: 'Trade Completed — Asset Transferred' },
    cancelled:{ color: 'var(--red)',    icon: '↩️', text: 'Listing Cancelled — Asset Returned to Seller' },
    refunded: { color: 'var(--muted)',  icon: '⏱️', text: 'Timelock Expired — Assets Refunded' },
  };
  const s = map[listing.escrowStatus];
  if (!s) return null;
  return (
    <div style={{ background: `${s.color}15`, border: `1.5px solid ${s.color}`, borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, color: s.color }}>
      <span style={{ fontSize: 18 }}>{s.icon}</span> {s.text}
    </div>
  );
}

function InfoRow({ label, value, mono, style: st }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-val" style={{ ...(mono ? { fontFamily: 'var(--mono)', fontSize: 12 } : {}), ...st }}>{value}</span>
    </div>
  );
}

function ConfirmRow({ label, val, bold, green, muted }) {
  return (
    <div className="cft-row" style={{ opacity: muted ? 0.6 : 1 }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'var(--mono)', fontWeight: bold ? 800 : 600, color: green ? 'var(--green)' : 'var(--text)' }}>{val}</span>
    </div>
  );
}

function DetailStyles() {
  return (
    <style>{`
      .mini-fee-table { background: var(--bg3); border-radius: 10px; padding: 12px 14px; margin-top: 10px; }
      .mft-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; color: var(--muted); border-bottom: 1px solid var(--border); }
      .mft-row:last-child { border-bottom: none; }
      .mft-total { font-weight: 800; color: var(--text) !important; font-size: 13px !important; margin-top: 4px; padding-top: 8px; }
      .offers-panel { background: var(--bg2); border: 1.5px solid var(--border); border-radius: var(--radius); padding: 18px; }
      .offers-title { font-size: 14px; font-weight: 700; margin-bottom: 14px; color: var(--orange); }
      .offer-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); }
      .offer-row:last-child { border-bottom: none; }
      .confirm-asset-box { display: flex; gap: 14px; align-items: center; background: var(--bg3); border-radius: 10px; padding: 14px; margin-bottom: 18px; }
      .confirm-fee-table { background: var(--bg3); border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; }
      .cft-row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid var(--border); }
      .cft-row:last-child { border-bottom: none; }
      .confirm-note { font-size: 11px; color: var(--muted); background: var(--bg3); padding: 10px 12px; border-radius: 8px; line-height: 1.6; }
    `}</style>
  );
}
