/**
 * Private P2P chat — persisted in localStorage.
 * Room key is deterministic from both addresses + listingId.
 * Both parties read/write the same key so messages are shared
 * as long as they use the same browser/device.
 *
 * NOTE: localStorage is per-browser. For cross-device chat,
 * a backend (e.g. Firebase, Supabase) would be needed.
 * This works perfectly for same-browser testing and single-device use.
 */

function roomKey(addrA, addrB, listingId) {
  const [a, b] = [addrA, addrB].sort();
  return `xc_chat_${a}_${b}_${listingId}`;
}

export function getMessages(myAddr, otherAddr, listingId) {
  try {
    return JSON.parse(localStorage.getItem(roomKey(myAddr, otherAddr, listingId)) || '[]');
  } catch { return []; }
}

export function sendMessage(myAddr, otherAddr, listingId, text) {
  const key  = roomKey(myAddr, otherAddr, listingId);
  const msgs = getMessages(myAddr, otherAddr, listingId);
  const msg  = { id: Date.now() + '_' + Math.random().toString(36).slice(2), from: myAddr, text: text.trim(), ts: Date.now() };
  msgs.push(msg);
  localStorage.setItem(key, JSON.stringify(msgs));
  return msg;
}

// Get all chat rooms this address is involved in
export function getMyChats(myAddr) {
  const rooms = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('xc_chat_') || !key.includes(myAddr)) continue;
    try {
      const msgs = JSON.parse(localStorage.getItem(key) || '[]');
      if (!msgs.length) continue;
      // Parse listingId from key: xc_chat_addrA_addrB_listingId
      const parts = key.replace('xc_chat_', '').split('_');
      // listingId is everything after the two addresses
      const listingId = parts.slice(2).join('_');
      const otherAddr = parts[0] === myAddr ? parts[1] : parts[0];
      rooms.push({ key, listingId, otherAddr, msgs, lastMsg: msgs[msgs.length - 1], unread: msgs.filter(m => m.from !== myAddr && !m.read).length });
    } catch {}
  }
  return rooms.sort((a, b) => b.lastMsg.ts - a.lastMsg.ts);
}

export function markRead(myAddr, otherAddr, listingId) {
  const key  = roomKey(myAddr, otherAddr, listingId);
  const msgs = getMessages(myAddr, otherAddr, listingId);
  const updated = msgs.map(m => m.from !== myAddr ? { ...m, read: true } : m);
  localStorage.setItem(key, JSON.stringify(updated));
}
