import { useState, useEffect, useCallback } from 'react';
import {
  getListings, saveListing, updateListing, deleteListing,
  getOffers, saveOffer, updateOffer,
  getTxHistory, saveTx, genId,
} from '../lib/store.js';
import {
  approveAndLockOP20, approveAndLockOP721, unlockAsset,
  buyListing as buyOnChain, makeOfferOnChain, acceptOfferOnChain,
  btcToSats, calcFees, FLAT_FEE_SATS,
} from '../lib/opnet.js';

export function useListings(wallet) {
  const [listings, setListings]     = useState([]);
  const [offers, setOffers]         = useState([]);
  const [txHistory, setTxHistory]   = useState([]);
  const [actionLoading, setLoading] = useState('');  // tracks which action is in-flight

  const refresh = useCallback(() => {
    setListings(getListings());
    setOffers(getOffers());
    setTxHistory(getTxHistory());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Step 1: Save listing record in PENDING state, then lock asset on-chain
  const createAndLockListing = useCallback(async (data) => {
    const id = genId('L');
    // Save with pending_lock status — NOT visible in market yet
    const listing = saveListing({
      ...data,
      id,
      seller: wallet?.address,
      status: 'pending_lock',
      escrowStatus: 'pending_lock',
      lockTxid: null,
      posted: Date.now(),
    });
    setListings(getListings());

    setLoading('lock_' + id);
    try {
      let result;
      if (data.type === 'OP_20') {
        result = await approveAndLockOP20(data.contractAddress, btcToSats(data.amount), id);
      } else {
        result = await approveAndLockOP721(data.contractAddress, data.nftId, id);
      }
      // On-chain confirmed → activate listing
      updateListing(id, {
        status: 'active',
        escrowStatus: 'locked',
        lockTxid: result.txid,
      });
      setListings(getListings());
      saveTx({ id: genId('TX'), listingId: id, type: 'lock', actor: wallet?.address, txid: result.txid, fee: FLAT_FEE_SATS, date: Date.now(), status: 'completed' });
      setTxHistory(getTxHistory());
      return { success: true, txid: result.txid };
    } catch (e) {
      // Lock failed → mark as cancelled, remove from store
      deleteListing(id);
      setListings(getListings());
      throw e;
    } finally {
      setLoading('');
    }
  }, [wallet]);

  // ── Cancel listing → unlock asset from escrow
  const cancelListing = useCallback(async (id) => {
    setLoading('cancel_' + id);
    try {
      const result = await unlockAsset(id);
      updateListing(id, { status: 'cancelled', escrowStatus: 'refunded', cancelTxid: result.txid });
      setListings(getListings());
      saveTx({ id: genId('TX'), listingId: id, type: 'cancel', actor: wallet?.address, txid: result.txid, fee: FLAT_FEE_SATS, date: Date.now(), status: 'completed' });
      setTxHistory(getTxHistory());
      return { success: true };
    } finally {
      setLoading('');
    }
  }, [wallet]);

  // ── Buy fixed-price listing → pay BTC + fees to escrow
  const buyListing = useCallback(async (listing) => {
    setLoading('buy_' + listing.id);
    try {
      const result = await buyOnChain(listing.id, listing.price);
      updateListing(listing.id, { status: 'sold', escrowStatus: 'sold', soldTo: wallet?.address, soldAt: Date.now(), buyTxid: result.txid });
      setListings(getListings());
      saveTx({
        id: genId('TX'), listingId: listing.id, type: 'buy',
        buyer: wallet?.address, seller: listing.seller,
        amount: listing.price, fees: result.fees,
        txid: result.txid, date: Date.now(), status: 'completed',
      });
      setTxHistory(getTxHistory());
      return { success: true, txid: result.txid, fees: result.fees };
    } finally {
      setLoading('');
    }
  }, [wallet]);

  // ── Make offer → lock BTC in escrow
  const makeOffer = useCallback(async (listingId, listingName, btcAmount) => {
    const offerSats = btcToSats(btcAmount);
    const id = genId('O');
    // Save offer in pending_lock state
    const offer = saveOffer({
      id, listingId, listingName,
      from: wallet?.address,
      amount: offerSats,
      amountDisplay: btcAmount,
      status: 'pending_lock',
      escrowStatus: 'pending_lock',
      lockTxid: null,
      date: Date.now(),
    });
    setOffers(getOffers());
    setLoading('offer_' + id);
    try {
      const result = await makeOfferOnChain(listingId, offerSats);
      updateOffer(id, { status: 'pending', escrowStatus: 'locked', lockTxid: result.txid });
      setOffers(getOffers());
      saveTx({ id: genId('TX'), offerId: id, listingId, type: 'offer_lock', actor: wallet?.address, txid: result.txid, fee: FLAT_FEE_SATS, amount: offerSats, date: Date.now(), status: 'completed' });
      setTxHistory(getTxHistory());
      return { success: true, txid: result.txid };
    } catch (e) {
      // Remove failed offer
      setOffers(prev => prev.filter(o => o.id !== id));
      throw e;
    } finally {
      setLoading('');
    }
  }, [wallet]);

  // ── Accept offer → on-chain: BTC to seller (minus fees), asset to buyer
  const acceptOffer = useCallback(async (offerId) => {
    setLoading('accept_' + offerId);
    try {
      const result = await acceptOfferOnChain(offerId);
      const offer = getOffers().find(o => o.id === offerId);
      updateOffer(offerId, { status: 'accepted', escrowStatus: 'completed', acceptTxid: result.txid });
      if (offer) {
        updateListing(offer.listingId, { status: 'sold', escrowStatus: 'sold', soldTo: offer.from, soldAt: Date.now(), buyTxid: result.txid });
        const fees = calcFees(offer.amount);
        saveTx({
          id: genId('TX'), offerId, listingId: offer.listingId, type: 'accept_offer',
          buyer: offer.from, seller: wallet?.address,
          amount: offer.amount, fees,
          txid: result.txid, date: Date.now(), status: 'completed',
        });
      }
      setListings(getListings());
      setOffers(getOffers());
      setTxHistory(getTxHistory());
      return { success: true, txid: result.txid };
    } finally {
      setLoading('');
    }
  }, [wallet]);

  const rejectOffer = useCallback((offerId) => {
    updateOffer(offerId, { status: 'rejected', escrowStatus: 'refunded', rejectedAt: Date.now() });
    setOffers(getOffers());
  }, []);

  // ── Derived sets ──────────────────────────────────────────────────────────
  const addr           = wallet?.address;
  const activeListings = listings.filter(l => l.status === 'active' && l.escrowStatus === 'locked');
  const myListings     = listings.filter(l => l.seller === addr);
  const myOffers       = offers.filter(o => o.from === addr);
  const receivedOffers = offers.filter(o => {
    const l = listings.find(x => x.id === o.listingId);
    return l?.seller === addr && o.escrowStatus === 'locked';
  });
  const myTxHistory    = txHistory.filter(t =>
    t.buyer === addr || t.seller === addr || t.actor === addr ||
    myListings.some(l => l.id === t.listingId)
  );

  return {
    listings, activeListings, myListings, myOffers, receivedOffers, myTxHistory,
    actionLoading,
    createAndLockListing,
    cancelListing,
    buyListing,
    makeOffer,
    acceptOffer,
    rejectOffer,
    refresh,
  };
}
