import { useState, useEffect, useCallback } from 'react';
import { getListings, saveListing, updateListing, getOffers, saveOffer, updateOffer, getTxHistory, saveTx, genId } from '../lib/store.js';
import { btcToSats, calcFees, FLAT_FEE_SATS, payFlatFee } from '../lib/opnet.js';

export function useListings(wallet) {
  const [listings,     setListings]  = useState([]);
  const [offers,       setOffers]    = useState([]);
  const [txHistory,    setTxHistory] = useState([]);
  const [actionLoading,setLoading]   = useState('');

  const refresh = useCallback(() => {
    setListings(getListings());
    setOffers(getOffers());
    setTxHistory(getTxHistory());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Create listing: pay $3 fee via wallet popup, then save listing
  const createAndLockListing = useCallback(async (data) => {
    setLoading('creating');
    try {
      const feeResult = await payFlatFee('listing');
      const id = genId('L');
      saveListing({
        ...data, id,
        seller: wallet?.address,
        status: 'active',
        escrowStatus: 'manual',
        feeTxid: feeResult.txid,
        posted: Date.now(),
      });
      setListings(getListings());
      saveTx({ id: genId('TX'), listingId: id, type: 'listing_fee', actor: wallet?.address, fee: FLAT_FEE_SATS, txid: feeResult.txid, date: Date.now() });
      setTxHistory(getTxHistory());
      return { success: true };
    } finally { setLoading(''); }
  }, [wallet]);

  const cancelListing = useCallback((id) => {
    // Keep listing visible but marked cancelled — don't delete it
    updateListing(id, { status: 'cancelled' });
    setListings(getListings());
  }, []);

  // ── Buy: pay $3 fee via wallet popup, mark listing pending, open chat
  const buyListing = useCallback(async (listing) => {
    setLoading('buy_' + listing.id);
    try {
      const feeResult = await payFlatFee('buy');
      updateListing(listing.id, { status: 'pending_transfer', buyerAddress: wallet?.address, buyerAt: Date.now(), buyFeeTxid: feeResult.txid });
      setListings(getListings());
      saveTx({ id: genId('TX'), listingId: listing.id, type: 'buy_fee', buyer: wallet?.address, seller: listing.seller, fee: FLAT_FEE_SATS, txid: feeResult.txid, date: Date.now() });
      setTxHistory(getTxHistory());
      return { success: true, chatWith: listing.seller };
    } finally { setLoading(''); }
  }, [wallet]);

  // ── Offer: pay $3 fee via wallet popup, save offer
  const makeOffer = useCallback(async (listingId, listingName, sellerAddress, btcAmount) => {
    setLoading('offer_' + listingId);
    try {
      const feeResult = await payFlatFee('offer');
      const id = genId('O');
      saveOffer({ id, listingId, listingName, from: wallet?.address, sellerAddress, amount: btcToSats(btcAmount), amountDisplay: btcAmount, status: 'pending', feeTxid: feeResult.txid, date: Date.now() });
      setOffers(getOffers());
      saveTx({ id: genId('TX'), offerId: id, listingId, type: 'offer_fee', actor: wallet?.address, fee: FLAT_FEE_SATS, txid: feeResult.txid, date: Date.now() });
      setTxHistory(getTxHistory());
      return { success: true, offerId: id };
    } finally { setLoading(''); }
  }, [wallet]);

  // ── Accept offer: mark accepted, mark listing pending_transfer, open chat
  const acceptOffer = useCallback(async (offerId) => {
    setLoading('accept_' + offerId);
    try {
      const offer = getOffers().find(o => o.id === offerId);
      updateOffer(offerId, { status: 'accepted', acceptedAt: Date.now() });
      if (offer) {
        updateListing(offer.listingId, { status: 'pending_transfer', buyerAddress: offer.from, acceptedOfferId: offerId });
        saveTx({ id: genId('TX'), offerId, listingId: offer.listingId, type: 'accept_offer', buyer: offer.from, seller: wallet?.address, amount: offer.amount, fees: calcFees(offer.amount), date: Date.now() });
      }
      setListings(getListings());
      setOffers(getOffers());
      setTxHistory(getTxHistory());
      return { success: true, chatWith: offer?.from, listingId: offer?.listingId };
    } finally { setLoading(''); }
  }, [wallet]);

  const rejectOffer = useCallback((offerId) => {
    updateOffer(offerId, { status: 'rejected', rejectedAt: Date.now() });
    setOffers(getOffers());
  }, []);

  // Seller marks trade done — listing shows as SOLD but stays visible
  const markTransferComplete = useCallback((listingId) => {
    updateListing(listingId, { status: 'sold', soldAt: Date.now() });
    setListings(getListings());
  }, []);

  const addr           = wallet?.address;
  const activeListings = listings.filter(l => l.status === 'active' || l.status === 'pending_transfer');
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
