import { useState, useEffect, useCallback } from 'react';
import {
  isOpWalletInstalled,
  connectOpWallet,
  getBtcBalance,
  getTokenBalances,
  getNftBalances,
  onAccountChange,
  onNetworkChange,
} from '../lib/opnet.js';

export function useWallet() {
  const [wallet, setWallet] = useState(null); // { address, network }
  const [balances, setBalances] = useState({ btc: null, tokens: [], nfts: [] });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const installed = isOpWalletInstalled();

  const loadBalances = useCallback(async (address) => {
    const [btc, tokens, nfts] = await Promise.all([
      getBtcBalance(address),
      getTokenBalances(address),
      getNftBalances(address),
    ]);
    setBalances({ btc, tokens, nfts });
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const result = await connectOpWallet();
      setWallet(result);
      await loadBalances(result.address);
    } catch (e) {
      setError(e.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }, [loadBalances]);

  const disconnect = useCallback(() => {
    setWallet(null);
    setBalances({ btc: null, tokens: [], nfts: [] });
  }, []);

  const refreshBalances = useCallback(() => {
    if (wallet?.address) loadBalances(wallet.address);
  }, [wallet, loadBalances]);

  // Auto-reconnect if already authorized
  useEffect(() => {
    if (!installed) return;
    window.opnet.getAccounts?.().then(accounts => {
      if (accounts?.length) {
        window.opnet.getNetwork?.().then(network => {
          const address = accounts[0];
          setWallet({ address, network });
          loadBalances(address);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [installed, loadBalances]);

  // Listen for changes
  useEffect(() => {
    const unsub1 = onAccountChange((accounts) => {
      if (!accounts?.length) { disconnect(); return; }
      const address = accounts[0];
      setWallet(w => ({ ...w, address }));
      loadBalances(address);
    });
    const unsub2 = onNetworkChange((network) => {
      setWallet(w => w ? { ...w, network } : w);
    });
    return () => { unsub1(); unsub2(); };
  }, [disconnect, loadBalances]);

  return { wallet, balances, connecting, error, installed, connect, disconnect, refreshBalances };
}
