import { useState, useEffect, useRef, useCallback } from 'react';
import { getMessages, sendMessage, markRead } from '../lib/chat.js';
import { shortAddress } from '../lib/opnet.js';

export function PrivateChat({ myAddress, otherAddress, listingId, listingName, onClose, isSeller, onMarkComplete }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const bottomRef  = useRef(null);
  const pollRef    = useRef(null);

  const load = useCallback(() => {
    const msgs = getMessages(myAddress, otherAddress, listingId);
    setMessages(msgs);
    markRead(myAddress, otherAddress, listingId);
  }, [myAddress, otherAddress, listingId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 1500);
    return () => clearInterval(pollRef.current);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(myAddress, otherAddress, listingId, text);
    setInput('');
    load();
  };

  const fmt = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const QUICK = [
    `My address: ${myAddress}`,
    'Send tokens first, I send BTC right after ✅',
    'Send BTC first, I send tokens right after ✅',
    'Transfer confirmed, thank you! 🎉',
    'Can we negotiate the price?',
  ];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'var(--bg2)', border:'1.5px solid var(--border)', borderRadius:16, width:'100%', maxWidth:500, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)', background:'var(--bg3)', borderRadius:'16px 16px 0 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:22 }}>🔒</span>
            <div>
              <div style={{ fontWeight:800, fontSize:14 }}>Private OTC Chat</div>
              <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)' }}>{listingName} · {shortAddress(otherAddress)}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {isSeller && onMarkComplete && (
              <button className="btn btn-green btn-sm" onClick={onMarkComplete}>✅ Mark Complete</button>
            )}
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:20, padding:'2px 8px', borderRadius:6 }}>✕</button>
          </div>
        </div>

        {/* Warning */}
        <div style={{ padding:'10px 16px', background:'rgba(239,68,68,0.08)', borderBottom:'1px solid rgba(239,68,68,0.2)', fontSize:11, color:'var(--red)', lineHeight:1.6 }}>
          ⚠️ <strong>No escrow.</strong> Agree on transfer order here. Send assets directly wallet-to-wallet. XCHANGE does not hold funds or mediate disputes.
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:10, minHeight:180, maxHeight:320 }}>
          {messages.length === 0 && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--muted)', gap:8, padding:32 }}>
              <span style={{ fontSize:36 }}>💬</span>
              <div style={{ fontWeight:700 }}>Start the conversation</div>
              <div style={{ fontSize:12, textAlign:'center', maxWidth:260, lineHeight:1.6 }}>Share your wallet address and agree on who sends first.</div>
            </div>
          )}
          {messages.map(m => {
            const mine = m.from === myAddress;
            return (
              <div key={m.id} style={{ display:'flex', flexDirection:'column', maxWidth:'80%', alignSelf: mine ? 'flex-end' : 'flex-start', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ padding:'10px 14px', borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: mine ? 'var(--orange)' : 'var(--bg3)', border: mine ? 'none' : '1px solid var(--border)', color: mine ? '#fff' : 'var(--text)', fontSize:13, lineHeight:1.5, wordBreak:'break-word', whiteSpace:'pre-wrap' }}>
                  {m.text}
                </div>
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:3, fontFamily:'var(--mono)' }}>
                  {mine ? 'You' : shortAddress(m.from)} · {fmt(m.ts)}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        <div style={{ padding:'8px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:6, flexWrap:'wrap', background:'var(--bg3)' }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => setInput(q)} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:99, padding:'3px 10px', fontSize:11, cursor:'pointer', color:'var(--muted)', fontFamily:'var(--font)', transition:'all 0.14s', whiteSpace:'nowrap' }}
              onMouseEnter={e => { e.target.style.borderColor='var(--orange)'; e.target.style.color='var(--orange)'; }}
              onMouseLeave={e => { e.target.style.borderColor='var(--border)'; e.target.style.color='var(--muted)'; }}>
              {q.length > 38 ? q.slice(0,38)+'…' : q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ display:'flex', gap:10, padding:'12px 14px', borderTop:'1px solid var(--border)', alignItems:'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message… (Enter to send)"
            rows={2}
            style={{ flex:1, background:'var(--bg3)', border:'1.5px solid var(--border)', borderRadius:10, color:'var(--text)', fontFamily:'var(--font)', fontSize:13, padding:'10px 12px', outline:'none', resize:'none' }}
            onFocus={e => e.target.style.borderColor='var(--orange)'}
            onBlur={e => e.target.style.borderColor='var(--border)'}
          />
          <button className="btn btn-orange" onClick={handleSend} disabled={!input.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}
