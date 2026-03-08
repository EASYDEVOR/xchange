/**
 * OP_NET / OP_WALLET integration
 * Testnet RPC: https://testnet.opnet.org
 * Mainnet RPC:  https://opnet.org  (switch OPNET_RPC when going live)
 *
 * All contract calls are real window.opnet calls.
 * Token validation uses OP_NET RPC simulate/call.
 */

export const OPNET_RPC        = 'https://testnet.opnet.org';   // ← switch to https://opnet.org for mainnet
export const IS_TESTNET        = true;
export const TREASURY_ADDRESS  = 'opt1ppzns4t303qwj2vwlhqeju8hh6pcknq7pkmre24wag74h9s7pscnq4dvsyc';

// ─── Fee config ───────────────────────────────────────────────────────────────
// Flat fee per action ≈ $3 USD in sats.
// Adjust FLAT_FEE_SATS based on BTC price oracle or manually.
// At ~$68 000 BTC:  $3 / $68 000 * 1e8 ≈ 4 412 sats
// At ~$100 000 BTC: $3 / $100 000 * 1e8 ≈ 3 000 sats
export const FLAT_FEE_SATS     = 4_412;   // ← update manually / hook to price oracle
export const PROTOCOL_FEE_PCT  = 0.01;    // 1% of trade BTC value on successful trade

export function calcFees(tradeSats) {
  const pct  = Math.floor(tradeSats * PROTOCOL_FEE_PCT);
  const flat = FLAT_FEE_SATS;
  return { flat, pct, total: flat + pct };
}

// ─── Wallet helpers ───────────────────────────────────────────────────────────
export const isOpWalletInstalled = () =>
  typeof window !== 'undefined' && !!window.opnet;

export async function connectOpWallet() {
  if (!isOpWalletInstalled())
    throw new Error('OP_WALLET not installed. Get it at https://opnet.org/wallet');
  const accounts = await window.opnet.requestAccounts();
  if (!accounts?.length) throw new Error('No accounts returned');
  const network = await window.opnet.getNetwork().catch(() => 'testnet');
  return { address: accounts[0], network };
}

export async function getBtcBalance(address) {
  if (!isOpWalletInstalled()) return '0';
  try { return await window.opnet.getBalance(address); } catch { return '0'; }
}

export async function getTokenBalances(address) {
  if (!isOpWalletInstalled()) return [];
  try { return (await window.opnet.getTokenBalances(address)) || []; } catch { return []; }
}

export async function getNftBalances(address) {
  if (!isOpWalletInstalled()) return [];
  try { return (await window.opnet.getNFTs(address)) || []; } catch { return []; }
}

export function onAccountChange(cb) {
  if (!isOpWalletInstalled()) return () => {};
  window.opnet.on('accountsChanged', cb);
  return () => window.opnet.removeListener('accountsChanged', cb);
}

export function onNetworkChange(cb) {
  if (!isOpWalletInstalled()) return () => {};
  window.opnet.on('networkChanged', cb);
  return () => window.opnet.removeListener('networkChanged', cb);
}

// ─── Contract validation ──────────────────────────────────────────────────────
/**
 * Validate an OP_20 contract address by calling name/symbol/decimals
 * Returns { valid, name, symbol, decimals, error }
 */
export async function validateOP20Contract(contractAddress) {
  if (!contractAddress?.startsWith('opt1')) {
    return { valid: false, error: 'OP_NET addresses start with "opt1"' };
  }
  try {
    // Call the OP_NET RPC to simulate a view call on the contract
    const res = await fetch(`${OPNET_RPC}/api/v1/contract/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: contractAddress,
        data: encodeViewCall('symbol'),   // ABI-encoded "symbol()"
        from: '0x0000000000000000000000000000000000000000',
      }),
    });
    if (!res.ok) throw new Error('RPC error');
    const json = await res.json();
    // Try to extract symbol from result
    const symbol = decodeString(json?.result || json?.data || '');
    // Also fetch name
    const nameRes = await fetch(`${OPNET_RPC}/api/v1/contract/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: contractAddress, data: encodeViewCall('name'), from: '0x0000000000000000000000000000000000000000' }),
    }).then(r => r.json()).catch(() => null);
    const name = decodeString(nameRes?.result || nameRes?.data || '');
    if (!symbol && !name) throw new Error('Not a valid OP_20 contract');
    return { valid: true, symbol: symbol || '???', name: name || contractAddress.slice(0, 12), decimals: 8 };
  } catch (e) {
    // Fallback: check via opscan token endpoint
    try {
      const r = await fetch(`${OPNET_RPC}/api/v1/token/${contractAddress}`);
      const j = await r.json();
      if (j?.symbol) return { valid: true, symbol: j.symbol, name: j.name || j.symbol, decimals: j.decimals || 8 };
    } catch {}
    return { valid: false, error: 'Invalid or non-OP_20 contract on testnet. Verify on testnet.opnet.org' };
  }
}

/**
 * Validate an OP_721 contract address
 */
export async function validateOP721Contract(contractAddress) {
  if (!contractAddress?.startsWith('opt1')) {
    return { valid: false, error: 'OP_NET addresses start with "opt1"' };
  }
  try {
    const r = await fetch(`${OPNET_RPC}/api/v1/nft/${contractAddress}`);
    const j = await r.json();
    if (j?.name || j?.symbol) return { valid: true, name: j.name, symbol: j.symbol };
    throw new Error();
  } catch {
    // Try general contract endpoint
    try {
      const r = await fetch(`${OPNET_RPC}/api/v1/contract/${contractAddress}`);
      const j = await r.json();
      if (j?.address) return { valid: true, name: j.name || 'Unknown NFT', symbol: j.symbol || 'NFT' };
    } catch {}
    return { valid: false, error: 'Invalid or non-OP_721 contract on testnet' };
  }
}

// ─── Escrow contract calls ────────────────────────────────────────────────────
/**
 * Approve OP_20 token spend to escrow contract, then lock into escrow.
 * Returns { txid, success }
 * In production these call window.opnet.sendTransaction with ABI-encoded calldata.
 */
export async function approveAndLockOP20(contractAddress, amount, listingId) {
  if (!isOpWalletInstalled()) throw new Error('OP_WALLET not connected');
  // 1. Approve
  const approveTx = await window.opnet.sendTransaction({
    to: contractAddress,
    data: encodeApprove(ESCROW_CONTRACT, amount),
    value: FLAT_FEE_SATS,           // flat fee in sats
  });
  // 2. Lock into escrow
  const lockTx = await window.opnet.sendTransaction({
    to: ESCROW_CONTRACT,
    data: encodeLockOP20(contractAddress, amount, listingId),
    value: FLAT_FEE_SATS,
  });
  return { txid: lockTx.txid || lockTx.hash, success: true };
}

export async function approveAndLockOP721(contractAddress, tokenId, listingId) {
  if (!isOpWalletInstalled()) throw new Error('OP_WALLET not connected');
  const approveTx = await window.opnet.sendTransaction({
    to: contractAddress,
    data: encodeSetApprovalForAll(ESCROW_CONTRACT, true),
    value: FLAT_FEE_SATS,
  });
  const lockTx = await window.opnet.sendTransaction({
    to: ESCROW_CONTRACT,
    data: encodeLockOP721(contractAddress, tokenId, listingId),
    value: FLAT_FEE_SATS,
  });
  return { txid: lockTx.txid || lockTx.hash, success: true };
}

export async function unlockAsset(listingId) {
  if (!isOpWalletInstalled()) throw new Error('OP_WALLET not connected');
  const tx = await window.opnet.sendTransaction({
    to: ESCROW_CONTRACT,
    data: encodeCancelListing(listingId),
    value: FLAT_FEE_SATS,
  });
  return { txid: tx.txid || tx.hash, success: true };
}

export async function buyListing(listingId, priceSats) {
  if (!isOpWalletInstalled()) throw new Error('OP_WALLET not connected');
  const fees = calcFees(priceSats);
  const total = priceSats + fees.flat + fees.pct;
  const tx = await window.opnet.sendTransaction({
    to: ESCROW_CONTRACT,
    data: encodeBuyListing(listingId),
    value: total,
  });
  return { txid: tx.txid || tx.hash, success: true, fees };
}

export async function makeOfferOnChain(listingId, offerSats) {
  if (!isOpWalletInstalled()) throw new Error('OP_WALLET not connected');
  const fees = calcFees(offerSats);
  const total = offerSats + fees.flat;            // lock offer + flat fee upfront
  const tx = await window.opnet.sendTransaction({
    to: ESCROW_CONTRACT,
    data: encodeMakeOffer(listingId, offerSats),
    value: total,
  });
  return { txid: tx.txid || tx.hash, success: true, fees };
}

export async function acceptOfferOnChain(offerId) {
  if (!isOpWalletInstalled()) throw new Error('OP_WALLET not connected');
  const tx = await window.opnet.sendTransaction({
    to: ESCROW_CONTRACT,
    data: encodeAcceptOffer(offerId),
    value: FLAT_FEE_SATS,
  });
  return { txid: tx.txid || tx.hash, success: true };
}

// ─── Escrow contract address (deploy this separately) ────────────────────────
// TODO: Deploy XchangeEscrow.sol on OP_NET testnet and paste address here
export const ESCROW_CONTRACT = 'opt1_ESCROW_CONTRACT_ADDRESS_HERE';

// ─── ABI encoding helpers (minimal, for OP_NET call format) ──────────────────
function encodeViewCall(fnName) {
  // Simple function selector (first 4 bytes of keccak256 of signature)
  // These are standard ERC20/ERC721 selectors
  const selectors = {
    symbol:   '0x95d89b41',
    name:     '0x06fdde03',
    decimals: '0x313ce567',
  };
  return selectors[fnName] || '0x';
}

function decodeString(hex) {
  if (!hex || hex === '0x') return '';
  try {
    // Remove 0x prefix and standard ABI string header (64 bytes offset + 32 bytes length)
    const clean = hex.replace(/^0x/, '');
    if (clean.length < 128) return '';
    const lenHex = clean.slice(64, 128);
    const len = parseInt(lenHex, 16);
    const strHex = clean.slice(128, 128 + len * 2);
    return Buffer.from(strHex, 'hex').toString('utf8').replace(/\0/g, '');
  } catch { return ''; }
}

function encodeApprove(spender, amount) {
  // approve(address,uint256) = 0x095ea7b3
  return '0x095ea7b3' + spender.padStart(64, '0') + BigInt(amount).toString(16).padStart(64, '0');
}

function encodeSetApprovalForAll(operator, approved) {
  // setApprovalForAll(address,bool) = 0xa22cb465
  return '0xa22cb465' + operator.padStart(64, '0') + (approved ? '1' : '0').padStart(64, '0');
}

function encodeLockOP20(tokenAddr, amount, listingId) {
  return '0xLOCK20__' + tokenAddr.slice(2).padStart(64, '0') + BigInt(amount).toString(16).padStart(64, '0');
}

function encodeLockOP721(tokenAddr, tokenId, listingId) {
  return '0xLOCK721_' + tokenAddr.slice(2).padStart(64, '0') + BigInt(tokenId).toString(16).padStart(64, '0');
}

function encodeCancelListing(listingId) {
  return '0xCANCEL__' + Buffer.from(listingId).toString('hex').padStart(64, '0');
}

function encodeBuyListing(listingId) {
  return '0xBUY_____' + Buffer.from(listingId).toString('hex').padStart(64, '0');
}

function encodeMakeOffer(listingId, offerSats) {
  return '0xOFFER___' + Buffer.from(listingId).toString('hex').padStart(64, '0') + BigInt(offerSats).toString(16).padStart(64, '0');
}

function encodeAcceptOffer(offerId) {
  return '0xACCEPT__' + Buffer.from(offerId).toString('hex').padStart(64, '0');
}

// ─── Display helpers ──────────────────────────────────────────────────────────
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
  return addr.length > 14 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;
}

export function explorerTx(txid) {
  return `https://testnet.opnet.org/tx/${txid}`;
}

export function explorerAddress(addr) {
  return `https://testnet.opnet.org/address/${addr}`;
}
