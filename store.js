/**
 * Persistent store using localStorage.
 * Listings only enter the market AFTER successful escrow lock tx.
 * Schema additions:
 *   listing.escrowStatus: 'pending_lock' | 'locked' | 'sold' | 'cancelled' | 'refunded'
 *   listing.lockTxid:     on-chain tx of the escrow lock
 *   offer.escrowStatus:   'pending_lock' | 'locked' | 'accepted' | 'rejected' | 'refunded'
 *   offer.lockTxid:       on-chain tx of the BTC offer lock
 */

const LS = {
  LISTINGS: 'xchange_listings_v2',
  OFFERS:   'xchange_offers_v2',
  TXS:      'xchange_txs_v2',
};

// ─── Listings ─────────────────────────────────────────────────────────────────
export function getListings() {
  try { return JSON.parse(localStorage.getItem(LS.LISTINGS) || '[]'); } catch { return []; }
}

export function saveListing(listing) {
  const all = getListings();
  all.unshift(listing);
  localStorage.setItem(LS.LISTINGS, JSON.stringify(all));
  return listing;
}

export function updateListing(id, updates) {
  const all = getListings();
  const idx = all.findIndex(l => l.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates };
  localStorage.setItem(LS.LISTINGS, JSON.stringify(all));
  return all[idx];
}

export function deleteListing(id) {
  localStorage.setItem(LS.LISTINGS, JSON.stringify(getListings().filter(l => l.id !== id)));
}

// ─── Offers ──────────────────────────────────────────────────────────────────
export function getOffers() {
  try { return JSON.parse(localStorage.getItem(LS.OFFERS) || '[]'); } catch { return []; }
}

export function saveOffer(offer) {
  const all = getOffers();
  all.unshift(offer);
  localStorage.setItem(LS.OFFERS, JSON.stringify(all));
  return offer;
}

export function updateOffer(id, updates) {
  const all = getOffers();
  const idx = all.findIndex(o => o.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates };
  localStorage.setItem(LS.OFFERS, JSON.stringify(all));
  return all[idx];
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export function getTxHistory() {
  try { return JSON.parse(localStorage.getItem(LS.TXS) || '[]'); } catch { return []; }
}

export function saveTx(tx) {
  const all = getTxHistory();
  all.unshift(tx);
  localStorage.setItem(LS.TXS, JSON.stringify(all));
  return tx;
}

// ─── Utils ───────────────────────────────────────────────────────────────────
export function genId(prefix = 'X') {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}
