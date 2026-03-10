import { useState, useEffect, useCallback } from 'react';
import {
  getListings, saveListing, updateListing,
  getOffers, saveOffer, updateOffer,
  getTxHistory, saveTx, genId,
} from '../lib/store.js';
import { btcToSats, calcFees, FLAT_FEE_SATS, payFlatFee } from '../lib/opnet.js';

export function useListings(wallet) {
  const [listings, setListings]     = useState([]);
  const [offers, setOffers]         = useState([]);
  const [txHistory, setTxHistory]   = useState([]);
  const [actionLoading, setLoading] = useState('');

  const refresh = useCallback(() => {
    setListings(getListings());
    setOffers(getOffers());
    setTxHistory(getTxHistory());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Create listing — pay $3 fee to treasury then save
  const createAndLockListing = useCallback(async (data) => {
    setLoading('creating');
    try {
      await payFlatFee('listing');
      const id = genId('L');
      saveListing({
        ...data, id,
        seller: wallet?.address,
        status: 'active',
        escrowStatus: 'manual',
        lockTxid: null,
        posted: Date.now(),
      });
      setListings(getListings());
      saveTx({ id: genId('TX'), listingId: id, type: 'listing_fee', actor: wallet?.address, fee: FLAT_FEE_SATS, date: Date.now(), status: 'completed' });
      setTxHistory(getTxHistory());
      return { success: true };
    } finally { setLoading(''); }
  }, [wallet]);

  // ── Cancel listing
  const cancelListing = useCallback((id) => {
    updateListing(id, { status: 'cancelled', escrowStatus: 'cancelled' });
    setListings(getListings());
  }, []);

  // ── Buy listing — pay $3 fee, then open chat with seller
  const buyListing = useCallback(async (listing) => {
    setLoading('buy_' + listing.id);
    try {
      await payFlatFee('buy');
      updateListing(listing.id, { status: 'pending_transfer', escrowStatus: 'manual', soldTo: wallet?.address, soldAt: Date.now() });
      setListings(getListings());
      saveTx({ id: genId('TX'), listingId: listing.id, type: 'buy_fee', buyer: wallet?.address, seller: listing.seller, amount: listing.price, fees: calcFees(listing.price), date: Date.now(), status: 'pending_transfer' });
      setTxHistory(getTxHistory());
      return { success: true, chatWith: listing.seller };
    } finally { setLoading(''); }
  }, [wallet]);

  // ── Make offer — pay $3 fee then save offer
  const makeOffer = useCallback(async (listingId, listingName, sellerAddress, btcAmount) => {
    setLoading('offer_' + listingId);
    try {
      await payFlatFee('offer');
      const id = genId('O');
      saveOffer({
        id, listingId, listingName,
        from: wallet?.address,
        sellerAddress,
        amount: btcToSats(btcAmount),
        amountDisplay: btcAmount,
        status: 'pending',
        escrowStatus: 'manual',
        date: Date.now(),
      });
      setOffers(getOffers());
      return { success: true, offerId: id };
    } finally { setLoading(''); }
  }, [wallet]);

  // ── Accept offer — open chat with buyer
  const acceptOffer = useCallback(async (offerId) => {
    setLoading('accept_' + offerId);
    try {
      const offer = getOffers().find(o => o.id === offerId);
      updateOffer(offerId, { status: 'accepted', escrowStatus: 'manual' });
      if (offer) {
        updateListing(offer.listingId, { status: 'pending_transfer', soldTo: offer.from, soldAt: Date.now() });
        saveTx({ id: genId('TX'), offerId, listingId: offer.listingId, type: 'accept_offer', buyer: offer.from, seller: wallet?.address, amount: offer.amount, fees: calcFees(offer.amount), date: Date.now(), status: 'pending_transfer' });
      }
      setListings(getListings());
      setOffers(getOffers());
      setTxHistory(getTxHistory());
      return { success: true, chatWith: offer?.from };
    } finally { setLoading(''); }
  }, [wallet]);

  const rejectOffer = useCallback((offerId) => {
    updateOffer(offerId, { status: 'rejected' });
    setOffers(getOffers());
  }, []);

  const markTransferComplete = useCallback((listingId) => {
    updateListing(listingId, { status: 'sold', escrowStatus: 'completed' });
    setListings(getListings());
  }, []);

  const addr           = wallet?.address;
  const activeListings = listings.filter(l => l.status === 'active');
  const myListings     = listings.filter(l => l.seller === addr);
  const myOffers       = offers.filter(o => o.from === addr);
  const receivedOffers = offers.filter(o => {
    const l = listings.find(x => x.id === o.listingId);
    return l?.seller === addr && o.status === 'pending';
  });
  const myTxHistory = txHistory.filter(t =>
    t.buyer === addr || t.seller === addr || t.actor === addr ||
    myListings.some(l => l.id === t.listingId)
  );

  return {
    listings, activeListings, myListings, myOffers, receivedOffers, myTxHistory,
    offers, actionLoading,
    createAndLockListing, cancelListing, buyListing,
    makeOffer, acceptOffer, rejectOffer, markTransferComplete, refresh,
  };
}
