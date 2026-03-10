/**
 * OP_NET / OP_WALLET integration
 * Testnet mode. Switch OPNET_RPC for mainnet when ready.
 */

export const OPNET_RPC         = 'https://testnet.opnet.org';
export const IS_TESTNET        = true;
export const TREASURY_ADDRESS  = 'opt1ppzns4t303qwj2vwlhqeju8hh6pcknq7pkmre24wag74h9s7pscnq4dvsyc';

// â”€â”€ Fee config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Flat fee per action â‰ˆ $3 USD in sats.
// At ~$67k BTC: $3 / $67000 * 1e8 â‰ˆ 4478 sats. Update manually or hook oracle.
export const FLAT_FEE_SATS    = 4_478;
export const PROTOCOL_FEE_PCT = 0.01; // 1% of trade BTC on successful trade

export function calcFees(tradeSats) {
  const pct  = Math.floor((tradeSats || 0) * PROTOCOL_FEE_PCT);
  const flat = FLAT_FEE_SATS;
  return { flat, pct, total: flat + pct };
}

// â”€â”€ Wallet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const isOpWalletInstalled = () =>
  typeof window !== 'undefined' && !!window.opnet;

export async function connectOpWallet() {
  if (!isOpWalletInstalled())
    throw new Error('OP_WALLET not installed. Get it at https://opnet.org/wallet');
  const accounts = await window.opnet.requestAccounts();
  if (!accounts?.length) throw new Error('No accounts returned');
  const network = await window.opnet.getNetwork?.().catch(() => 'testnet');
  return { address: accounts[0], network };
}

export async function getBtcBalance(address) {
  if (!isOpWalletInstalled()) return '0';
  try { return await window.opnet.getBalance(address); } catch { return '0'; }
}

export async function getTokenBalances(address) {
  if (!isOpWalletInstalled()) return [];
  try { return (await window.opnet.getTokenBalances?.(address)) || []; } catch { return []; }
}

export async function getNftBalances(address) {
  if (!isOpWalletInstalled()) return [];
  try { return (await window.opnet.getNFTs?.(address)) || []; } catch { return []; }
}

export function onAccountChange(cb) {
  if (!isOpWalletInstalled()) return () => {};
  window.opnet.on('accountsChanged', cb);
  return () => window.opnet.removeListener?.('accountsChanged', cb);
}

export function onNetworkChange(cb) {
  if (!isOpWalletInstalled()) return () => {};
  window.opnet.on('networkChanged', cb);
  return () => window.opnet.removeListener?.('networkChanged', cb);
}

// â”€â”€ $3 flat fee payment to treasury â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Called on: create listing, buy now, make offer
// Sends FLAT_FEE_SATS directly to treasury via OP_WALLET
export async function payFlatFee(action = 'action') {
  if (!isOpWalletInstalled()) throw new Error('OP_WALLET not connected');
  try {
    const tx = await window.opnet.sendTransaction({
      to: TREASURY_ADDRESS,
      value: FLAT_FEE_SATS,   // sats
      data: '0x',
      memo: `XCHANGE fee: ${action}`,
    });
    return { txid: tx?.txid || tx?.hash || 'pending', success: true };
  } catch (e) {
    // If wallet doesn't support sendTransaction yet, log and continue
    // so the user flow isn't blocked
    console.warn('Fee tx failed (wallet may not support yet):', e.message);
    return { txid: null, success: false, error: e.message };
  }
}

// â”€â”€ Contract address validation (format-based, CORS-safe) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function isValidOPNETAddress(addr) {
  if (!addr) return false;
  if (addr.startsWith('opt1'))
    return addr.length >= 40 && addr.length <= 70 && /^opt1[ac-hj-np-z02-9]+$/i.test(addr);
  if (addr.startsWith('0x'))
    return addr.length === 42 && /^0x[0-9a-fA-F]{40}$/.test(addr);
  return false;
}

export async function validateOP20Contract(contractAddress) {
  const addr = contractAddress?.trim();
  if (!addr) return { valid: false, error: 'Enter a contract address' };
  if (!isValidOPNETAddress(addr)) {
    return { valid: false, error: 'Invalid format â€” must start with "opt1" (62+ chars) or "0x" (42 chars)' };
  }
  // Try wallet methods if connected
  if (isOpWalletInstalled()) {
    try {
      const d = await window.opnet.getTokenDetails?.(addr);
      if (d?.symbol) return { valid: true, name: d.name || d.symbol, symbol: d.symbol, decimals: d.decimals ?? 8 };
    } catch {}
    try {
      const sym  = await window.opnet.callContract?.({ to: addr, data: '0x95d89b41' });
      const name = await window.opnet.callContract?.({ to: addr, data: '0x06fdde03' });
      const s = decodeABIString(sym?.result || sym?.data);
      const n = decodeABIString(name?.result || name?.data);
      if (s || n) return { valid: true, name: n || s, symbol: s || '???', decimals: 8 };
    } catch {}
  }
  return { valid: true, name: addr.slice(0, 14) + 'â€¦', symbol: '???', decimals: 8, unverified: true };
}

export async function validateOP721Contract(contractAddress) {
  const addr = contractAddress?.trim();
  if (!addr) return { valid: false, error: 'Enter a contract address' };
  if (!isValidOPNETAddress(addr))
    return { valid: false, error: 'Invalid format â€” must start with "opt1" or "0x"' };
  if (isOpWalletInstalled()) {
    try {
      const d = await window.opnet.getNFTDetails?.(addr);
      if (d?.name) return { valid: true, name: d.name, symbol: d.symbol };
    } catch {}
  }
  return { valid: true, name: addr.slice(0, 14) + 'â€¦', symbol: 'NFT', unverified: true };
}

function decodeABIString(hex) {
  if (!hex || hex === '0x' || hex.length < 10) return '';
  try {
    const clean = hex.replace(/^0x/, '');
    if (clean.length < 128) return Buffer.from(clean, 'hex').toString('utf8').replace(/\0/g, '').trim();
    const len = parseInt(clean.slice(64, 128), 16);
    if (!len || len > 100) return '';
    return Buffer.from(clean.slice(128, 128 + len * 2), 'hex').toString('utf8').replace(/\0/g, '').trim();
  } catch { return ''; }
}

// â”€â”€ Display helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function satsToBtc(sats) {
  if (!sats && sats !== 0) return 'â€”';
  const btc = Number(sats) / 1e8;
  if (btc === 0) return '0 BTC';
  return btc.toFixed(8).replace(/\.?0+$/, '') + ' BTC';
}
export function btcToSats(btc) {
  if (!btc) return 0;
  return Math.round(parseFloat(btc) * 1e8);
}
export function shortAddress(addr) {
  if (!addr) return '';
  return addr.length > 14 ? `${addr.slice(0, 8)}â€¦${addr.slice(-6)}` : addr;
}
export function explorerTx(txid) {
  return `https://opscan.org/tx/${txid}?network=op_testnet`;
}
export function explorerAddress(addr) {
  return `https://opscan.org/address/${addr}?network=op_testnet`;
}
