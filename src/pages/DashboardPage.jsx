import { useState } from 'react';
import { satsToBtc, shortAddress, explorerAddress, FLAT_FEE_SATS } from '../lib/opnet.js';
import { getMyChats } from '../lib/chat.js';
import { PrivateChat } from '../components/PrivateChat.jsx';
import { getListings } from '../lib/store.js';

function timeAgo(ts) {
  const d=(Date.now()-ts)/1000;
  if(d<60) return 'just now';
  if(d<3600) return `${Math.floor(d/60)}m ago`;
  if(d<86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

export function DashboardPage({ wallet, myListings, myOffers, receivedOffers, onCancel, onAcceptOffer, onRejectOffer, onMarkComplete, actionLoading }) {
  const [tab,  setTab]  = useState('listings');
  const [chat, setChat] = useState(null);

  if (!wallet) return (
    <div className="empty-state"><div className="empty-icon">🔐</div><div className="empty-title">Connect OP_WALLET to view dashboard</div></div>
  );

  const myChats = getMyChats(wallet.address);
  const allListings = getListings();

  const tabs = [
    { id:'listings',   label:`My Listings (${myListings.length})` },
    { id:'offers_sent',label:`Offers Sent (${myOffers.length})` },
    { id:'offers_recv',label:`Offers Received (${receivedOffers.length})` },
    { id:'chats',      label:`💬 Chats (${myChats.length})` },
  ];

  return (
    <div className="fade-in">
      <h2 className="section-title">My Dashboard</h2>
      <div className="dash-addr">{wallet.address}</div>

      <div className="dash-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`dash-tab${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* My Listings */}
      {tab === 'listings' && (
        myListings.length === 0
          ? <Empty icon="📋" text="No listings yet" />
          : <div className="table-wrap"><table className="table">
              <thead><tr><th>Asset</th><th>Contract</th><th>Price</th><th>Status</th><th>Posted</th><th>Actions</th></tr></thead>
              <tbody>
                {myListings.map(l => (
                  <tr key={l.id}>
                    <td><strong>{l.type==='OP_20' ? `${l.amount} ${l.symbol||''}` : l.name}</strong></td>
                    <td><a href={explorerAddress(l.contractAddress)} target="_blank" rel="noopener" style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--orange)' }}>{shortAddress(l.contractAddress)} ↗</a></td>
                    <td style={{ fontFamily:'var(--mono)', fontSize:12, color: l.priceMode==='fixed'?'var(--green)':'var(--orange)' }}>
                      {l.priceMode==='fixed' ? satsToBtc(l.price) : '🤝 Offers'}
                    </td>
                    <td><span className={`status-badge status-${l.status.replace('_','-')}`}>{l.status}</span></td>
                    <td style={{ color:'var(--muted)', fontSize:12 }}>{timeAgo(l.posted)}</td>
                    <td style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {l.status==='active' && (
                        <button className="btn btn-red btn-sm" onClick={() => onCancel(l.id)} disabled={actionLoading==='cancel_'+l.id}>Cancel</button>
                      )}
                      {(l.status==='pending_transfer'||l.status==='active') && l.buyerAddress && (
                        <button className="btn btn-orange btn-sm" onClick={() => setChat({ myAddr: wallet.address, otherAddr: l.buyerAddress, listingId: l.id, listingName: l.type==='OP_20'?`${l.amount} ${l.symbol||''}`:l.name })}>💬 Chat</button>
                      )}
                      {l.status==='pending_transfer' && (
                        <button className="btn btn-green btn-sm" onClick={() => onMarkComplete(l.id)}>✅ Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
      )}

      {/* Offers Sent */}
      {tab === 'offers_sent' && (
        myOffers.length === 0
          ? <Empty icon="🤝" text="No offers sent yet" />
          : <div className="table-wrap"><table className="table">
              <thead><tr><th>Listing</th><th>Offer Amount</th><th>Fee Paid</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {myOffers.map(o => {
                  const listing = allListings.find(l => l.id === o.listingId);
                  return (
                    <tr key={o.id}>
                      <td><strong>{o.listingName}</strong></td>
                      <td style={{ fontFamily:'var(--mono)', color:'var(--orange)', fontWeight:700 }}>{satsToBtc(o.amount)}</td>
                      <td style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>{satsToBtc(FLAT_FEE_SATS)}</td>
                      <td><span className={`status-badge status-${o.status}`}>{o.status}</span></td>
                      <td style={{ color:'var(--muted)', fontSize:12 }}>{timeAgo(o.date)}</td>
                      <td>
                        {o.status==='accepted' && listing && (
                          <button className="btn btn-orange btn-sm" onClick={() => setChat({ myAddr: wallet.address, otherAddr: listing.seller, listingId: o.listingId, listingName: o.listingName })}>💬 Open Chat</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
      )}

      {/* Offers Received */}
      {tab === 'offers_recv' && (
        receivedOffers.length === 0
          ? <Empty icon="📬" text="No offers received yet" />
          : <div className="table-wrap"><table className="table">
              <thead><tr><th>Listing</th><th>From</th><th>Offer</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {receivedOffers.map(o => (
                  <tr key={o.id}>
                    <td><strong>{o.listingName}</strong></td>
                    <td style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>{shortAddress(o.from)}</td>
                    <td style={{ fontFamily:'var(--mono)', color:'var(--orange)', fontWeight:800, fontSize:14 }}>{satsToBtc(o.amount)}</td>
                    <td><span className={`status-badge status-${o.status}`}>{o.status}</span></td>
                    <td>
                      {o.status==='pending' && (
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-green btn-sm" onClick={() => { onAcceptOffer(o.id).then(r => { if(r?.chatWith) setChat({ myAddr:wallet.address, otherAddr:r.chatWith, listingId:o.listingId, listingName:o.listingName }); }); }} disabled={actionLoading==='accept_'+o.id}>
                            {actionLoading==='accept_'+o.id ? '…' : '✅ Accept & Chat'}
                          </button>
                          <button className="btn btn-red btn-sm" onClick={() => onRejectOffer(o.id)}>Reject</button>
                        </div>
                      )}
                      {o.status==='accepted' && (
                        <button className="btn btn-orange btn-sm" onClick={() => setChat({ myAddr:wallet.address, otherAddr:o.from, listingId:o.listingId, listingName:o.listingName })}>💬 Open Chat</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
      )}

      {/* Chats tab */}
      {tab === 'chats' && (
        myChats.length === 0
          ? <Empty icon="💬" text="No active chats" sub="Chats appear here after you buy, sell, or accept an offer" />
          : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {myChats.map(room => {
                const listing = allListings.find(l => l.id === room.listingId);
                const listingName = listing ? (listing.type==='OP_20' ? `${listing.amount} ${listing.symbol||''}` : listing.name) : room.listingId;
                return (
                  <div key={room.key} onClick={() => setChat({ myAddr:wallet.address, otherAddr:room.otherAddr, listingId:room.listingId, listingName })}
                    style={{ background:'var(--bg2)', border:'1.5px solid var(--border)', borderRadius:12, padding:'14px 18px', cursor:'pointer', display:'flex', alignItems:'center', gap:14, transition:'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor='var(--orange)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                    <div style={{ width:44, height:44, borderRadius:50, background:'var(--orange-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>💬</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{listingName}</div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>with {shortAddress(room.otherAddr)}</div>
                      <div style={{ fontSize:12, color:'var(--muted)', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {room.lastMsg.from===wallet.address ? 'You: ' : ''}{room.lastMsg.text}
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{timeAgo(room.lastMsg.ts)}</div>
                      {room.unread > 0 && (
                        <div style={{ background:'var(--orange)', color:'#fff', borderRadius:99, width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800 }}>{room.unread}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
      )}

      {/* Chat overlay */}
      {chat && (
        <PrivateChat
          myAddress={chat.myAddr}
          otherAddress={chat.otherAddr}
          listingId={chat.listingId}
          listingName={chat.listingName}
          isSeller={myListings.some(l => l.id === chat.listingId)}
          onClose={() => setChat(null)}
          onMarkComplete={myListings.some(l => l.id === chat.listingId) ? () => { onMarkComplete(chat.listingId); setChat(null); } : null}
        />
      )}
    </div>
  );
}

function Empty({ icon, text, sub }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{text}</div>
      {sub && <div className="empty-sub">{sub}</div>}
    </div>
  );
}
