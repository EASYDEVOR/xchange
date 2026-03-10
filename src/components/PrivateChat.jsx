import { useState, useEffect, useRef, useCallback } from 'react';
import { getMessages, sendMessage } from '../lib/chat.js';
import { shortAddress } from '../lib/opnet.js';

export function PrivateChat({ myAddress, otherAddress, listingId, listingName, onClose, onMarkComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const loadMessages = useCallback(() => {
    setMessages(getMessages(myAddress, otherAddress, listingId));
  }, [myAddress, otherAddress, listingId]);

  useEffect(() => {
    loadMessages();
    // Poll every 2 seconds to pick up messages from the other party
    pollRef.current = setInterval(loadMessages, 2000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    setSending(true);
    sendMessage(myAddress, otherAddress, listingId, input);
    setInput('');
    loadMessages();
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="pchat-overlay">
      <div className="pchat-window">
        {/* Header */}
        <div className="pchat-header">
          <div className="pchat-header-left">
            <div className="pchat-lock">🔒</div>
            <div>
              <div className="pchat-title">Private OTC Chat</div>
              <div className="pchat-sub">{listingName} · with {shortAddress(otherAddress)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {onMarkComplete && (
              <button className="btn btn-green btn-sm" onClick={onMarkComplete}>✅ Mark Complete</button>
            )}
            <button className="pchat-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Warning banner */}
        <div className="pchat-warning">
          ⚠️ <strong>Manual OTC — No Escrow.</strong> Agree on transfer details here. Send tokens/BTC directly to each other's wallets. XCHANGE is not responsible for disputes. Escrow coming soon.
        </div>

        {/* Messages */}
        <div className="pchat-messages">
          {messages.length === 0 && (
            <div className="pchat-empty">
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Start the conversation</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, maxWidth: 280, textAlign: 'center', lineHeight: 1.6 }}>
                Share your wallet address, agree on the transfer order, and confirm once done.
              </div>
            </div>
          )}
          {messages.map(m => {
            const isMine = m.from === myAddress;
            return (
              <div key={m.id} className={`pchat-msg ${isMine ? 'mine' : 'theirs'}`}>
                <div className="pchat-bubble">
                  {m.text}
                </div>
                <div className="pchat-meta">
                  {isMine ? 'You' : shortAddress(m.from)} · {fmtTime(m.ts)}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Suggested messages */}
        <div className="pchat-suggestions">
          {[
            'My wallet address: ' + myAddress,
            'Please send tokens first, I\'ll send BTC immediately after.',
            'I\'ll send BTC first, please confirm receipt.',
            'Transfer confirmed ✅',
          ].map(s => (
            <button key={s} className="pchat-suggest" onClick={() => setInput(s)}>
              {s.length > 40 ? s.slice(0, 40) + '…' : s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="pchat-input-row">
          <textarea
            className="pchat-input"
            placeholder="Type a message… (Enter to send)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={2}
          />
          <button className="btn btn-orange" onClick={handleSend} disabled={!input.trim() || sending}>
            Send
          </button>
        </div>
      </div>

      <ChatStyles />
    </div>
  );
}

function ChatStyles() {
  return (
    <style>{`
      .pchat-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.7);
        z-index: 500; display: flex; align-items: center; justify-content: center;
        padding: 20px;
      }
      .pchat-window {
        background: var(--bg2); border: 1.5px solid var(--border);
        border-radius: var(--radius); width: 100%; max-width: 520px;
        max-height: 85vh; display: flex; flex-direction: column;
        box-shadow: 0 24px 64px rgba(0,0,0,0.6);
        animation: fadeIn 0.2s ease;
      }
      .pchat-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 20px; border-bottom: 1px solid var(--border);
        background: var(--bg3); border-radius: var(--radius) var(--radius) 0 0;
      }
      .pchat-header-left { display: flex; align-items: center; gap: 12px; }
      .pchat-lock { font-size: 24px; }
      .pchat-title { font-size: 15px; font-weight: 800; }
      .pchat-sub { font-size: 11px; color: var(--muted); font-family: var(--mono); margin-top: 2px; }
      .pchat-close {
        background: none; border: none; cursor: pointer; color: var(--muted);
        font-size: 18px; padding: 4px 8px; border-radius: 6px;
      }
      .pchat-close:hover { color: var(--red); background: var(--red-dim); }
      .pchat-warning {
        background: rgba(239,68,68,0.1); border-bottom: 1px solid rgba(239,68,68,0.3);
        padding: 10px 16px; font-size: 11px; color: var(--red); line-height: 1.5;
      }
      .pchat-messages {
        flex: 1; overflow-y: auto; padding: 16px; display: flex;
        flex-direction: column; gap: 12px; min-height: 200px; max-height: 340px;
      }
      .pchat-empty {
        flex: 1; display: flex; flex-direction: column; align-items: center;
        justify-content: center; padding: 32px; color: var(--muted);
      }
      .pchat-msg { display: flex; flex-direction: column; max-width: 80%; }
      .pchat-msg.mine { align-self: flex-end; align-items: flex-end; }
      .pchat-msg.theirs { align-self: flex-start; align-items: flex-start; }
      .pchat-bubble {
        padding: 10px 14px; border-radius: 14px; font-size: 13px; line-height: 1.5;
        word-break: break-word; white-space: pre-wrap;
      }
      .pchat-msg.mine .pchat-bubble { background: var(--orange); color: #fff; border-bottom-right-radius: 4px; }
      .pchat-msg.theirs .pchat-bubble { background: var(--bg3); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
      .pchat-meta { font-size: 10px; color: var(--muted); margin-top: 3px; font-family: var(--mono); }
      .pchat-suggestions {
        padding: 8px 12px; display: flex; gap: 6px; flex-wrap: wrap;
        border-top: 1px solid var(--border); background: var(--bg3);
      }
      .pchat-suggest {
        background: var(--bg2); border: 1px solid var(--border); border-radius: 99px;
        padding: 4px 10px; font-size: 11px; cursor: pointer; color: var(--muted);
        font-family: var(--font); transition: all 0.14s; white-space: nowrap;
      }
      .pchat-suggest:hover { border-color: var(--orange); color: var(--orange); }
      .pchat-input-row {
        display: flex; gap: 10px; padding: 14px 16px;
        border-top: 1px solid var(--border); align-items: flex-end;
      }
      .pchat-input {
        flex: 1; background: var(--bg3); border: 1.5px solid var(--border);
        border-radius: 10px; color: var(--text); font-family: var(--font);
        font-size: 13px; padding: 10px 12px; outline: none; resize: none;
        transition: border-color 0.15s;
      }
      .pchat-input:focus { border-color: var(--orange); }
      .pchat-input::placeholder { color: var(--muted); }
    `}</style>
  );
}
