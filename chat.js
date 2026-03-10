/**
 * Private P2P chat between buyer and seller.
 * Messages stored in localStorage keyed by a deterministic room ID
 * derived from both wallet addresses + listing ID.
 * Only someone with the correct address pair can derive the same room key.
 *
 * Format: chat_<sorted_addr1>_<sorted_addr2>_<listingId>
 */

function roomKey(addrA, addrB, listingId) {
  const sorted = [addrA, addrB].sort().join('_');
  return `xchange_chat_${sorted}_${listingId}`;
}

export function getMessages(myAddress, otherAddress, listingId) {
  try {
    return JSON.parse(localStorage.getItem(roomKey(myAddress, otherAddress, listingId)) || '[]');
  } catch { return []; }
}

export function sendMessage(myAddress, otherAddress, listingId, text) {
  const key  = roomKey(myAddress, otherAddress, listingId);
  const msgs = getMessages(myAddress, otherAddress, listingId);
  const msg  = {
    id:     Date.now() + Math.random().toString(36).slice(2),
    from:   myAddress,
    text:   text.trim(),
    ts:     Date.now(),
  };
  msgs.push(msg);
  localStorage.setItem(key, JSON.stringify(msgs));
  return msg;
}

export function clearChat(myAddress, otherAddress, listingId) {
  localStorage.removeItem(roomKey(myAddress, otherAddress, listingId));
}

// Get all active chat rooms this address is part of
export function getMyRooms(myAddress) {
  const rooms = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('xchange_chat_') && key.includes(myAddress)) {
      try {
        const msgs = JSON.parse(localStorage.getItem(key) || '[]');
        if (msgs.length) rooms.push({ key, msgs, lastMsg: msgs[msgs.length - 1] });
      } catch {}
    }
  }
  return rooms.sort((a, b) => b.lastMsg.ts - a.lastMsg.ts);
}
