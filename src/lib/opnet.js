/**
 * OP_NET / OP_WALLET integration
 * Honest status:
 *   - window.opnet.sendBitcoin()  = real BTC send (supported by OP_WALLET)
 *   - window.opnet.requestAccounts() = real wallet connect
 *   - Contract validation = format-check only (CORS blocks RPC from browser)
 *   - Escrow contract = not yet deployed
 */

export const IS_TESTNET        = true;
export const TREASURY_ADDRESS  = 'opt1ppzns4t303qwj2vwlhqeju8hh6pcknq7pkmre24wag74h9s7pscnq4dvsyc';

// ~$3 at $67k BTC. Update this number manually when BTC price changes significantly.
export const FLAT_FEE_SATS    = 4_478;
export const PROTOCOL_FEE_PCT = 0.01;

export function calcFees(tradeSats) {
  const pct  = Math.floor((tradeSats || 0) * PROTOCOL_FEE_PCT);
  return { flat: FLAT_FEE_SATS, pct, total: FLAT_FEE_SATS + pct };
}

// ── Wallet ────────────────────────────────────────────────────────────────
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

// ── $3 Fee payment via OP_WALLET ──────────────────────────────────────────
// Uses window.opnet.sendBitcoin which is the real OP_WALLET BTC send method.
// This WILL pop up the wallet for user confirmation.
export async function payFlatFee(action = 'action') {
  if (!isOpWalletInstalled()) throw new Error('OP_WALLET not connected');

  // Try the methods OP_WALLET actually exposes for sending BTC
  const methods = [
    () => window.opnet.sendBitcoin({ to: TREASURY_ADDRESS, amount: FLAT_FEE_SATS }),
    () => window.opnet.sendBitcoin(TREASURY_ADDRESS, FLAT_FEE_SATS),
    () => window.opnet.send({ to: TREASURY_ADDRESS, value: FLAT_FEE_SATS }),
    () => window.opnet.sendTransaction({ to: TREASURY_ADDRESS, value: FLAT_FEE_SATS }),
    () => window.opnet.transfer({ to: TREASURY_ADDRESS, amount: FLAT_FEE_SATS }),
  ];

  let lastErr;
  for (const method of methods) {
    try {
      const tx = await method();
      const txid = tx?.txid || tx?.hash || tx?.id || tx;
      if (txid) return { txid: String(txid), success: true };
    } catch (e) {
      lastErr = e;
      // If user explicitly rejected, stop trying other methods
      if (e.message?.toLowerCase().includes('reject') ||
          e.message?.toLowerCase().includes('denied') ||
          e.message?.toLowerCase().includes('cancel')) {
        throw new Error('Fee payment cancelled by user.');
      }
    }
  }
  // If none worked, log but don't block — wallet API varies by version
  console.warn('Fee payment via wallet API not available:', lastErr?.message);
  return { txid: null, success: false };
}

// ── Known tokens on OP_NET testnet ────────────────────────────────────────
export const KNOWN_TOKENS = [
  {
    address: 'opt1sqzkx6wm5acawl9m6nay2mjsm6wagv7gazcgtczds',
    name: 'Motoswap',
    symbol: 'MOTO',
    decimals: 8,
    emoji: '🏍️',
    description: 'Motoswap governance token',
  },
  {
    address: 'opt1p5kzh0gjfkpnp8gek7k6ttlmhz7p0qzh5ry3jkp',
    name: 'Pills Token',
    symbol: 'PILLS',
    decimals: 8,
    emoji: '💊',
    description: 'Pills token on OP_NET',
  },
];

// ── Contract validation ────────────────────────────────────────────────────
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

  // Check known tokens first — instant result with real name/symbol
  const known = KNOWN_TOKENS.find(t => t.address.toLowerCase() === addr.toLowerCase());
  if (known) return { valid: true, ...known };

  if (!isValidOPNETAddress(addr))
    return { valid: false, error: 'Invalid format — must start with "opt1" (40+ chars) or "0x" (42 chars)' };

  // Try wallet callContract if available
  if (isOpWalletInstalled()) {
    try {
      const sym  = await window.opnet.callContract?.({ to: addr, data: '0x95d89b41' });
      const name = await window.opnet.callContract?.({ to: addr, data: '0x06fdde03' });
      const s = decodeABIString(sym?.result || sym?.data);
      const n = decodeABIString(name?.result || name?.data);
      if (s || n) return { valid: true, name: n || s, symbol: s || n, decimals: 8 };
    } catch {}
  }

  // Valid format but metadata unknown
  return { valid: true, name: null, symbol: null, decimals: 8, unverified: true };
}

export async function validateOP721Contract(contractAddress) {
  const addr = contractAddress?.trim();
  if (!addr) return { valid: false, error: 'Enter a contract address' };
  if (!isValidOPNETAddress(addr))
    return { valid: false, error: 'Invalid format — must start with "opt1" or "0x"' };
  if (isOpWalletInstalled()) {
    try {
      const d = await window.opnet.getNFTDetails?.(addr);
      if (d?.name) return { valid: true, name: d.name, symbol: d.symbol };
    } catch {}
  }
  return { valid: true, name: null, symbol: null, unverified: true };
}

function decodeABIString(hex) {
  if (!hex || hex === '0x' || hex.length < 10) return '';
  try {
    const clean = hex.replace(/^0x/, '');
    if (clean.length < 128) return Buffer.from(clean,'hex').toString('utf8').replace(/\0/g,'').trim();
    const len = parseInt(clean.slice(64,128), 16);
    if (!len || len > 100) return '';
    return Buffer.from(clean.slice(128, 128+len*2),'hex').toString('utf8').replace(/\0/g,'').trim();
  } catch { return ''; }
}

// ── Display helpers ───────────────────────────────────────────────────────
export function satsToBtc(sats) {
  if (!sats && sats !== 0) return '—';
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
  return addr.length > 14 ? `${addr.slice(0,8)}…${addr.slice(-6)}` : addr;
}
export function explorerAddress(addr) {
  return `https://opscan.org/address/${addr}?network=op_testnet`;
}
export function explorerTx(txid) {
  return `https://opscan.org/tx/${txid}?network=op_testnet`;
}
