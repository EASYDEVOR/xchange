import { useState } from 'react';
import { satsToBtc, shortAddress, btcToSats, FLAT_FEE_SATS, explorerAddress } from '../lib/opnet.js';
import { Modal } from '../components/Modal.jsx';
import { PrivateChat } from '../components/PrivateChat.jsx';

function timeAgo(ts) {
  const d = (Date.now()-ts)/1000;
  if (d<60) return 'just now';
  if (d<3600) return `${Math.floor(d/60)}m ago`;
  if (d<86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

export function ListingDetailPage({ listing, offers=[], onBack, onBuy, onOffer, onAcceptOffer, onMarkComplete, wallet, actionLoading }) {
  const [offerBtc,   setOfferBtc]   = useState('');
  const [buyModal,   setBuyModal]   = useState(false);
  const [offerModal, setOfferModal] = useState(false);
  const [chat,       setChat]       = useState(null);
  const [buyAgreed,  setBuyAgreed]  = useState(false);
  const [offAgreed,  setOffAgreed]  = useState(false);

  const isNFT    = listing.type === 'OP_721';
  const isMine   = wallet?.address === listing.seller;
  const isBuying = actionLoading === 'buy_' + listing.id;
  const isOffering = actionLoading?.startsWith('offer_');

  // All offers on this listing — visible to everyone
  const listingOffers = offers.filter(o => o.listingId === listing.id);
  const pendingOffers = listingOffers.filter(o => o.status === 'pending');
  const acceptedOffer = listingOffers.find(o => o.status === 'accepted');

  const assetLabel = isNFT ? listing.name : `${listing.amount} ${listing.symbol || ''}`.trim();

  const openChat = (otherAddr) => {
    if (!wallet) return;
    setChat({ myAddr: wallet.address, otherAddr });
  };

  const handleBuyConfirm = async () => {
    if (!buyAgreed) return;
    setBuyModal(false);
    const r = await onBuy(listing);
    if (r?.chatWith) openChat(r.chatWith);
  };

  const handleOfferConfirm = async () => {
    if (!offAgreed || !offerBtc || parseFloat(offerBtc) <= 0) return;
    setOfferModal(false);
    const r = await onOffer(listing.id, assetLabel, listing.seller, offerBtc);
    setOfferBtc('');
    // Chat opens when seller accepts — show toast-like info
  };

  const handleAccept = async (offerId, buyerAddr) => {
    const r = await onAcceptOffer(offerId);
    if (r?.success) openChat(buyerAddr);
  };

  return (
    <div className="fade-in">
      <button className="back-btn" onClick={onBack}>← Back to Market</button>

      {/* Status bar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderRadius:10, marginBottom:16, fontSize:13, fontWeight:700,
        background: listing.status==='active' ? 'rgba(34,197,94,0.08)' : listing.status==='pending_transfer' ? 'rgba(255,98,0,0.08)' : listing.status==='sold' ? 'rgba(100,100,100,0.08)' : 'rgba(239,68,68,0.08)',
        border: `1.5px solid ${listing.status==='active' ? 'var(--green)' : listing.status==='pending_transfer' ? 'var(--orange)' : listing.status==='sold' ? 'var(--muted)' : 'var(--red)'}`,
        color: listing.status==='active' ? 'var(--green)' : listing.status==='pending_transfer' ? 'var(--orange)' : listing.status==='sold' ? 'var(--muted)' : 'var(--red)'
      }}>
        <span style={{ fontSize:20 }}>
          {listing.status==='active' ? '✅' : listing.status==='pending_transfer' ? '💬' : listing.status==='sold' ? '🏁' : '✕'}
        </span>
        {listing.status==='active' && 'Active — Accepting buyers & offers'}
        {listing.status==='pending_transfer' && 'Transfer in progress — Private chat open'}
        {listing.status==='sold' && 'Sold — Transfer completed'}
        {listing.status==='cancelled' && 'Cancelled'}
      </div>

      {/* Manual OTC notice */}
      <div style={{ display:'flex', gap:10, alignItems:'center', background:'rgba(255,98,0,0.06)', border:'1.5px solid var(--orange)', borderRadius:10, padding:'10px 16px', marginBottom:20, fontSize:12 }}>
        <span style={{ fontSize:18 }}>💬</span>
        <span><strong>Manual OTC:</strong> No escrow. Buyer &amp; seller arrange transfer directly via private chat after a match. Escrow coming soon.</span>
      </div>

      <div className="detail-layout">
        {/* Asset panel */}
        <div className="detail-asset-panel">
          <div className="detail-emoji">{listing.image || (isNFT ? '🎨' : '🔵')}</div>
          <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:12, flexWrap:'wrap' }}>
            <span className={`type-badge ${isNFT ? 'nft' : 'token'}`}>{listing.type}</span>
            <span className="type-badge" style={{ background:'rgba(255,98,0,0.1)', color:'var(--orange)' }}>💬 Manual OTC</span>
            {listing.priceMode==='offers' && <span className="type-badge offers">OFFERS</span>}
            {listing.status==='sold' && <span className="type-badge" style={{ background:'var(--muted)', color:'var(--bg)' }}>SOLD</span>}
          </div>
          <div className="detail-name">{assetLabel}</div>
          {listing.collection && <div className="detail-coll">{listing.collection}</div>}
          {listing.contractAddress && (
            <a href={explorerAddress(listing.contractAddress)} target="_blank" rel="noopener"
              style={{ display:'block', marginTop:10, fontFamily:'var(--mono)', fontSize:11, color:'var(--orange)' }}>
              {shortAddress(listing.contractAddress)} ↗
            </a>
          )}
          {listing.desc && <div className="detail-desc">{listing.desc}</div>}
        </div>

        {/* Right panel */}
        <div className="detail-right">
          {/* Info */}
          <div className="info-panel">
            <div className="info-title">Listing Details</div>
            {[
              ['ID', listing.id],
              ['Seller', <a href={explorerAddress(listing.seller)} target="_blank" rel="noopener" style={{ color:'var(--orange)', fontFamily:'var(--mono)', fontSize:12 }}>{shortAddress(listing.seller)}</a>],
              ['Posted', timeAgo(listing.posted)],
              !isNFT && ['Amount', `${listing.amount} ${listing.symbol || ''}`],
              isNFT  && ['Token ID', `#${listing.nftId}`],
              ['Settlement', '💬 Private chat (manual OTC)'],
              listing.priceMode==='fixed' && ['Price', <span style={{ color:'var(--green)', fontFamily:'var(--mono)', fontSize:16, fontWeight:800 }}>{satsToBtc(listing.price)}</span>],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} className="info-row"><span className="info-label">{label}</span><span className="info-val">{value}</span></div>
            ))}
          </div>

          {/* Buy/Offer actions */}
          {!isMine && listing.status === 'active' && (
            <div className="action-panel">
              {listing.priceMode === 'fixed' ? (
                <>
                  <div className="action-price-label">Price</div>
                  <div className="action-price">{satsToBtc(listing.price)}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', marginBottom:8 }}>{listing.price?.toLocaleString()} sats</div>
                  <div style={{ background:'var(--bg3)', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', color:'var(--muted)', padding:'3px 0', borderBottom:'1px solid var(--border)' }}>
                      <span>$3 fee to treasury (on confirm)</span><span style={{ fontFamily:'var(--mono)' }}>{satsToBtc(FLAT_FEE_SATS)}</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--muted)', paddingTop:6 }}>Asset price paid to seller directly in chat</div>
                  </div>
                  {wallet
                    ? <button className="btn btn-green" style={{ width:'100%' }} onClick={() => setBuyModal(true)} disabled={isBuying}>
                        {isBuying ? <><span className="spinner-sm"/> Processing…</> : '⚡ Buy Now — Open Chat'}
                      </button>
                    : <div className="action-no-wallet">Connect OP_WALLET to buy</div>}
                </>
              ) : (
                <>
                  <div className="action-price-label">Make an Offer</div>
                  <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.7, marginBottom:14 }}>
                    After seller accepts, a private chat opens to arrange the transfer.
                  </div>
                  {wallet
                    ? <button className="btn btn-orange" style={{ width:'100%' }} onClick={() => setOfferModal(true)} disabled={isOffering}>
                        {isOffering ? <><span className="spinner-sm"/> Paying fee…</> : '🤝 Make Offer'}
                      </button>
                    : <div className="action-no-wallet">Connect OP_WALLET to make offers</div>}
                </>
              )}
            </div>
          )}

          {/* Seller panel when buyer found */}
          {isMine && listing.status === 'pending_transfer' && listing.buyerAddress && (
            <div className="action-panel">
              <div style={{ fontWeight:800, color:'var(--orange)', marginBottom:8 }}>🤝 Buyer Found!</div>
              <div style={{ fontSize:13, color:'var(--muted)', marginBottom:14, lineHeight:1.6 }}>
                Buyer: <code style={{ color:'var(--orange)', fontSize:12 }}>{shortAddress(listing.buyerAddress)}</code><br/>
                Open chat to coordinate the transfer.
              </div>
              <button className="btn btn-orange" style={{ width:'100%', marginBottom:8 }} onClick={() => openChat(listing.buyerAddress)}>
                💬 Open Private Chat
              </button>
              <button className="btn btn-green" style={{ width:'100%' }} onClick={() => onMarkComplete(listing.id)}>
                ✅ Mark Transfer Complete
              </button>
            </div>
          )}

          {/* All offers — visible to everyone */}
          {listingOffers.length > 0 && (
            <div className="offers-panel">
              <div className="offers-title">🤝 Offers ({listingOffers.length})</div>
              {listingOffers.map(o => (
                <div key={o.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>{shortAddress(o.from)}</div>
                    <div style={{ fontSize:15, fontWeight:800, color:'var(--orange)', fontFamily:'var(--mono)' }}>{satsToBtc(o.amount)}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{timeAgo(o.date)}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                    <span className={`status-badge status-${o.status}`}>{o.status}</span>
                    {isMine && o.status === 'pending' && (
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-green btn-sm" onClick={() => handleAccept(o.id, o.from)} disabled={actionLoading==='accept_'+o.id}>
                          {actionLoading==='accept_'+o.id ? '…' : '✅ Accept & Chat'}
                        </button>
                        <button className="btn btn-red btn-sm" onClick={() => {/* reject */}}>Reject</button>
                      </div>
                    )}
                    {/* Buyer can reopen chat if offer accepted */}
                    {!isMine && o.from === wallet?.address && o.status === 'accepted' && (
                      <button className="btn btn-orange btn-sm" onClick={() => openChat(listing.seller)}>💬 Open Chat</button>
                    )}
                    {/* Seller can reopen chat with accepted offer buyer */}
                    {isMine && o.status === 'accepted' && (
                      <button className="btn btn-orange btn-sm" onClick={() => openChat(o.from)}>💬 Chat</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* How it works */}
          <div className="escrow-panel">
            <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>💬 How This Works</div>
            <div style={{ fontSize:12, color:'var(--muted)', lineHeight:2 }}>
              1. Seller lists → pays $3 fee<br/>
              2. Buyer clicks Buy / Make Offer → pays $3 fee<br/>
              3. Private chat opens between both parties<br/>
              4. Agree on who sends first<br/>
              5. Transfer directly wallet-to-wallet<br/>
              6. Seller marks complete → listing shows SOLD<br/>
              <span style={{ color:'var(--orange)', fontWeight:700 }}>⚡ On-chain escrow coming soon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buy Modal */}
      <Modal open={buyModal} onClose={() => setBuyModal(false)} title="Confirm Purchase">
        <div style={{ background:'var(--bg3)', borderRadius:10, padding:14, marginBottom:16, display:'flex', gap:12, alignItems:'center' }}>
          <span style={{ fontSize:36 }}>{listing.image||'🔵'}</span>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>{assetLabel}</div>
            <div style={{ color:'var(--muted)', fontSize:12 }}>from {shortAddress(listing.seller)}</div>
          </div>
        </div>
        <div style={{ background:'rgba(239,68,68,0.08)', border:'1.5px solid var(--red)', borderRadius:10, padding:14, marginBottom:14, fontSize:12, color:'var(--red)', lineHeight:1.7 }}>
          ⚠️ <strong>No Escrow.</strong> OP_WALLET will pop up to pay the $3 fee to treasury. The actual asset price ({satsToBtc(listing.price)}) is paid <strong>directly to the seller in chat</strong>. XCHANGE does not hold or guarantee funds.
        </div>
        <label style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:16, cursor:'pointer', fontSize:13 }}>
          <input type="checkbox" checked={buyAgreed} onChange={e => setBuyAgreed(e.target.checked)} style={{ marginTop:3, accentColor:'var(--orange)' }} />
          I understand — transfer is manual via private chat
        </label>
        <div style={{ background:'var(--bg3)', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
            <span>Fee to treasury (wallet popup)</span><span style={{ fontFamily:'var(--mono)', color:'var(--orange)' }}>{satsToBtc(FLAT_FEE_SATS)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'4px 0' }}>
            <span>Asset price (pay seller in chat)</span><span style={{ fontFamily:'var(--mono)', color:'var(--green)', fontWeight:700 }}>{satsToBtc(listing.price)}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setBuyModal(false)}>Cancel</button>
          <button className="btn btn-green" onClick={handleBuyConfirm} disabled={!buyAgreed||isBuying}>
            {isBuying ? <><span className="spinner-sm"/>Paying…</> : '💸 Pay $3 & Open Chat'}
          </button>
        </div>
      </Modal>

      {/* Offer Modal */}
      <Modal open={offerModal} onClose={() => setOfferModal(false)} title="Make an Offer">
        <div style={{ background:'rgba(239,68,68,0.08)', border:'1.5px solid var(--red)', borderRadius:10, padding:14, marginBottom:14, fontSize:12, color:'var(--red)', lineHeight:1.7 }}>
          ⚠️ <strong>No Escrow.</strong> Your BTC is NOT locked. The $3 fee is paid now. If seller accepts, a private chat opens for manual transfer.
        </div>
        <label style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:14, cursor:'pointer', fontSize:13 }}>
          <input type="checkbox" checked={offAgreed} onChange={e => setOffAgreed(e.target.checked)} style={{ marginTop:3, accentColor:'var(--orange)' }} />
          I understand — transfer is manual via private chat
        </label>
        <div className="form-label">Your Offer Amount (BTC)</div>
        <input className="inp" type="number" step="0.00001" min="0" placeholder="0.00100" value={offerBtc} onChange={e => setOfferBtc(e.target.value)} autoFocus style={{ marginBottom:12 }} />
        {offerBtc && !isNaN(parseFloat(offerBtc)) && (
          <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', marginBottom:12 }}>{btcToSats(offerBtc).toLocaleString()} sats</div>
        )}
        <div style={{ background:'var(--bg3)', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
            <span>Fee to treasury (wallet popup)</span><span style={{ fontFamily:'var(--mono)', color:'var(--orange)' }}>{satsToBtc(FLAT_FEE_SATS)}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setOfferModal(false)}>Cancel</button>
          <button className="btn btn-orange" onClick={handleOfferConfirm} disabled={!offAgreed||!offerBtc||parseFloat(offerBtc)<=0||isOffering}>
            {isOffering ? <><span className="spinner-sm"/>Paying…</> : '💸 Pay $3 & Send Offer'}
          </button>
        </div>
      </Modal>

      {/* Private Chat */}
      {chat && (
        <PrivateChat
          myAddress={chat.myAddr}
          otherAddress={chat.otherAddr}
          listingId={listing.id}
          listingName={assetLabel}
          isSeller={isMine}
          onClose={() => setChat(null)}
          onMarkComplete={isMine ? () => { onMarkComplete(listing.id); setChat(null); } : null}
        />
      )}

      <style>{`
        .offers-panel{background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--radius);padding:18px}
        .offers-title{font-size:14px;font-weight:700;margin-bottom:14px;color:var(--orange)}
      `}</style>
    </div>
  );
}
