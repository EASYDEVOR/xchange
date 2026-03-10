import { useState } from 'react';
import { satsToBtc, shortAddress, btcToSats, calcFees, FLAT_FEE_SATS, explorerAddress } from '../lib/opnet.js';
import { Modal } from '../components/Modal.jsx';
import { PrivateChat } from '../components/PrivateChat.jsx';

function timeAgo(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export function ListingDetailPage({ listing, offers = [], onBack, onBuy, onOffer, onAcceptOffer, onMarkComplete, wallet, actionLoading }) {
  const [offerBtc,    setOfferBtc]    = useState('');
  const [buyModal,    setBuyModal]    = useState(false);
  const [offerModal,  setOfferModal]  = useState(false);
  const [chat,        setChat]        = useState(null); // { myAddr, otherAddr }
  const [buyAgreed,   setBuyAgreed]   = useState(false);
  const [offerAgreed, setOfferAgreed] = useState(false);

  const isNFT   = listing.type === 'OP_721';
  const isMine  = wallet?.address === listing.seller;
  const isBuying  = actionLoading === 'buy_' + listing.id;
  const isOffering = actionLoading?.startsWith('offer_');

  const listingOffers = offers.filter(o => o.listingId === listing.id && o.status === 'pending');

  const handleBuyConfirm = async () => {
    const r = await onBuy(listing);
    setBuyModal(false);
    if (r?.chatWith) setChat({ myAddr: wallet.address, otherAddr: r.chatWith });
  };

  const handleOfferConfirm = async () => {
    const v = parseFloat(offerBtc);
    if (!v || v <= 0) return;
    const r = await onOffer(listing.id,
      listing.type === 'OP_20' ? `${listing.amount} ${listing.symbol}` : listing.name,
      listing.seller, offerBtc);
    setOfferModal(false); setOfferBtc('');
    if (r?.success) setChat({ myAddr: wallet.address, otherAddr: listing.seller });
  };

  const handleAccept = async (offerId, buyerAddr) => {
    const r = await onAcceptOffer(offerId);
    if (r?.chatWith || buyerAddr) setChat({ myAddr: wallet.address, otherAddr: r?.chatWith || buyerAddr });
  };

  const fees  = listing.price ? calcFees(listing.price) : null;
  const total = fees ? listing.price + fees.flat : 0;

  // Is there already an accepted buyer to chat with?
  const pendingBuyer = listing.soldTo && listing.status === 'pending_transfer' ? listing.soldTo : null;

  return (
    <div className="fade-in">
      <button className="back-btn" onClick={onBack}>← Back to Market</button>

      {/* Status bar */}
      <StatusBar listing={listing} />

      {/* Manual OTC notice */}
      <div className="manual-otc-banner">
        <span style={{ fontSize: 18 }}>💬</span>
        <span><strong>Manual OTC Active</strong> — No escrow yet. After a match, buyer &amp; seller connect via private encrypted chat to arrange the transfer directly.</span>
      </div>

      <div className="detail-layout">
        {/* Left */}
        <div className="detail-asset-panel">
          <div className="detail-emoji">{listing.image || (isNFT ? '🎨' : '🔵')}</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <span className={`type-badge ${isNFT ? 'nft' : 'token'}`}>{listing.type}</span>
            <span className="type-badge" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--red)' }}>💬 Manual OTC</span>
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

        {/* Right */}
        <div className="detail-right">
          <div className="info-panel">
            <div className="info-title">Listing Details</div>
            <InfoRow label="Listing ID" value={listing.id} mono />
            <InfoRow label="Seller" value={<a href={explorerAddress(listing.seller)} target="_blank" rel="noopener" style={{ color: 'var(--orange)', fontFamily: 'var(--mono)', fontSize: 12 }}>{shortAddress(listing.seller)}</a>} />
            <InfoRow label="Posted" value={timeAgo(listing.posted)} />
            {!isNFT && <InfoRow label="Amount" value={`${listing.amount} ${listing.symbol}`} mono />}
            {isNFT  && <InfoRow label="Token ID" value={`#${listing.nftId}`} mono />}
            <InfoRow label="Settlement" value="💬 Private chat (manual OTC)" />
            {listing.priceMode === 'fixed' && <InfoRow label="Price" value={satsToBtc(listing.price)} mono style={{ color: 'var(--green)', fontSize: 16, fontWeight: 800 }} />}
          </div>

          {/* Actions for non-owner */}
          {!isMine && listing.status === 'active' && (
            <div className="action-panel">
              {listing.priceMode === 'fixed' ? (
                <>
                  <div className="action-price-label">Price</div>
                  <div className="action-price">{satsToBtc(listing.price)}</div>
                  <div className="mini-fee-table" style={{ marginTop: 10 }}>
                    <div className="mft-row"><span>Asset price</span><span>{satsToBtc(listing.price)}</span></div>
                    <div className="mft-row"><span>Flat fee (~$3) → treasury</span><span>{satsToBtc(FLAT_FEE_SATS)}</span></div>
                    <div className="mft-row mft-total"><span>You pay to treasury</span><span style={{ color: 'var(--orange)' }}>{satsToBtc(FLAT_FEE_SATS)}</span></div>
                    <div className="mft-row" style={{ fontSize: 10, color: 'var(--muted)' }}><span>+ Asset price goes direct to seller via chat</span></div>
                  </div>
                  {wallet
                    ? <button className="btn btn-green" style={{ width: '100%', marginTop: 12 }} onClick={() => setBuyModal(true)} disabled={isBuying}>
                        {isBuying ? <><span className="spinner-sm" /> Processing…</> : '⚡ Buy Now — Open Chat'}
                      </button>
                    : <div className="action-no-wallet">Connect OP_WALLET to buy</div>}
                </>
              ) : (
                <>
                  <div className="action-price-label">Make an Offer</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
                    After your offer is accepted, a private chat opens between you and the seller to arrange transfer.
                  </div>
                  {wallet
                    ? <button className="btn btn-orange" style={{ width: '100%' }} onClick={() => setOfferModal(true)} disabled={isOffering}>
                        {isOffering ? <><span className="spinner-sm" /> Sending…</> : '🤝 Make Offer — Open Chat'}
                      </button>
                    : <div className="action-no-wallet">Connect OP_WALLET to make offers</div>}
                </>
              )}
            </div>
          )}

          {/* Owner: open chat with buyer if pending */}
          {isMine && pendingBuyer && (
            <div className="action-panel">
              <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--orange)' }}>🤝 Buyer Found!</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                Buyer: <code style={{ color: 'var(--orange)' }}>{shortAddress(pendingBuyer)}</code><br />
                Open the private chat to arrange asset transfer.
              </div>
              <button className="btn btn-orange" style={{ width: '100%' }} onClick={() => setChat({ myAddr: wallet.address, otherAddr: pendingBuyer })}>
                💬 Open Private Chat
              </button>
              <button className="btn btn-green" style={{ width: '100%', marginTop: 8 }} onClick={() => onMarkComplete(listing.id)}>
                ✅ Mark Transfer Complete
              </button>
            </div>
          )}

          {/* Offers panel */}
          {listingOffers.length > 0 && (
            <div className="offers-panel">
              <div className="offers-title">🤝 Offers ({listingOffers.length})</div>
              {listingOffers.map(o => (
                <div key={o.id} className="offer-row">
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{shortAddress(o.from)}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--orange)', fontFamily: 'var(--mono)' }}>{satsToBtc(o.amount)}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(o.date)}</div>
                  </div>
                  {isMine && (
                    <div style={{ display: 'flex', gap: 6, alignSelf: 'center' }}>
                      <button className="btn btn-green btn-sm" onClick={() => handleAccept(o.id, o.from)} disabled={actionLoading === 'accept_' + o.id}>
                        {actionLoading === 'accept_' + o.id ? '…' : '✅ Accept & Chat'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* How it works */}
          <div className="escrow-panel">
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>💬 How Manual OTC Works</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 2 }}>
              1. Seller lists asset (pays $3 fee)<br/>
              2. Buyer buys/offers (pays $3 fee)<br/>
              3. Private chat opens between both parties<br/>
              4. Agree on who sends first in chat<br/>
              5. Transfer tokens &amp; BTC directly wallet-to-wallet<br/>
              6. Seller marks listing complete<br/>
              <span style={{ color: 'var(--orange)', fontWeight: 700 }}>⚡ On-chain escrow coming soon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buy Modal */}
      <Modal open={buyModal} onClose={() => setBuyModal(false)} title="Confirm Purchase">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--bg3)', borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <div style={{ fontSize: 36 }}>{listing.image || '🔵'}</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{isNFT ? listing.name : `${listing.amount} ${listing.symbol}`}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>from {shortAddress(listing.seller)}</div>
          </div>
        </div>

        {/* Manual OTC warning in modal */}
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid var(--red)', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 12, color: 'var(--red)', lineHeight: 1.7 }}>
          ⚠️ <strong>No Escrow.</strong> Clicking confirm pays the $3 fee to treasury and opens a private chat with the seller. You must coordinate the actual asset+BTC transfer directly in chat. XCHANGE does not hold or guarantee funds.
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 18, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={buyAgreed} onChange={e => setBuyAgreed(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--orange)' }} />
          I understand this is a manual OTC trade — transfer happens via private chat
        </label>

        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
            <span>Fee to treasury (~$3)</span><span style={{ fontFamily: 'var(--mono)' }}>{satsToBtc(FLAT_FEE_SATS)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
            <span>Asset price (pay seller in chat)</span><span style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>{satsToBtc(listing.price)}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', paddingTop: 8 }}>Asset price is paid directly to seller — not via this app</div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setBuyModal(false)}>Cancel</button>
          <button className="btn btn-green" onClick={handleBuyConfirm} disabled={!buyAgreed || isBuying}>
            {isBuying ? <><span className="spinner-sm" /> Paying fee…</> : '💬 Pay $3 Fee & Open Chat'}
          </button>
        </div>
      </Modal>

      {/* Offer Modal */}
      <Modal open={offerModal} onClose={() => setOfferModal(false)} title="Make an Offer">
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.6, background: 'rgba(239,68,68,0.08)', border: '1.5px solid var(--red)', borderRadius: 10, padding: 14 }}>
          ⚠️ <strong>No Escrow.</strong> Your BTC is NOT locked. After seller accepts, a private chat opens. Transfer happens wallet-to-wallet in chat. XCHANGE does not mediate.
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={offerAgreed} onChange={e => setOfferAgreed(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--orange)' }} />
          I understand — transfer is manual via private chat
        </label>

        <label className="form-label">Your Offer (BTC)</label>
        <input className="inp" type="number" step="0.00001" min="0" placeholder="0.00100" value={offerBtc} onChange={e => setOfferBtc(e.target.value)} autoFocus style={{ marginBottom: 12 }} />

        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0' }}>
            <span>Fee to treasury (~$3)</span><span style={{ fontFamily: 'var(--mono)' }}>{satsToBtc(FLAT_FEE_SATS)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setOfferModal(false)}>Cancel</button>
          <button className="btn btn-orange" onClick={handleOfferConfirm} disabled={!offerBtc || parseFloat(offerBtc) <= 0 || !offerAgreed}>
            💬 Pay $3 Fee & Send Offer
          </button>
        </div>
      </Modal>

      {/* Private Chat */}
      {chat && (
        <PrivateChat
          myAddress={chat.myAddr}
          otherAddress={chat.otherAddr}
          listingId={listing.id}
          listingName={isNFT ? listing.name : `${listing.amount} ${listing.symbol}`}
          onClose={() => setChat(null)}
          onMarkComplete={isMine ? () => { onMarkComplete(listing.id); setChat(null); } : null}
        />
      )}

      <DetailStyles />
    </div>
  );
}

function StatusBar({ listing }) {
  const map = {
    active:           { color: 'var(--green)',  icon: '✅', text: 'Active — Accepting buyers' },
    pending_transfer: { color: 'var(--orange)', icon: '💬', text: 'Matched — Transfer in progress via private chat' },
    sold:             { color: 'var(--muted)',  icon: '🏁', text: 'Completed — Asset transferred' },
    cancelled:        { color: 'var(--red)',    icon: '✕',  text: 'Cancelled' },
  };
  const s = map[listing.status];
  if (!s) return null;
  return (
    <div style={{ background: `${s.color}15`, border: `1.5px solid ${s.color}`, borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, color: s.color }}>
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

function DetailStyles() {
  return (
    <style>{`
      .manual-otc-banner { display:flex; gap:10px; align-items:center; background:rgba(255,98,0,0.08); border:1.5px solid var(--orange); border-radius:10px; padding:12px 16px; margin-bottom:20px; font-size:13px; }
      .mini-fee-table { background:var(--bg3); border-radius:10px; padding:12px 14px; }
      .mft-row { display:flex; justify-content:space-between; font-size:12px; padding:4px 0; color:var(--muted); border-bottom:1px solid var(--border); }
      .mft-row:last-child { border-bottom:none; }
      .mft-total { font-weight:800; color:var(--text) !important; font-size:13px !important; padding-top:8px; margin-top:4px; }
      .offers-panel { background:var(--bg2); border:1.5px solid var(--border); border-radius:var(--radius); padding:18px; }
      .offers-title { font-size:14px; font-weight:700; margin-bottom:14px; color:var(--orange); }
      .offer-row { display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--border); }
      .offer-row:last-child { border-bottom:none; }
    `}</style>
  );
}
