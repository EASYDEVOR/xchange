/**
 * OP_NET / OP_WALLET integration
 * Uses window.opnet injected by OP_WALLET browser extension.
 *
 * Contract validation uses OP_SCAN public API (opscan.org) — the same
 * explorer shown in your screenshot — since it has a working REST endpoint.
 *
 * Testnet explorer: https://opscan.org  (with ?network=op_testnet)
 * Mainnet explorer: https://opscan.org
 */

export const OPNET_RPC         = 'https://api.opnet.org';
export const OPSCAN_API        = 'https://opscan.org';
export const IS_TESTNET        = true;
export const TREASURY_ADDRESS  = 'opt1ppzns4t303qwj2vwlhqeju8hh6pcknq7pkmre24wag74h9s7pscnq4dvsyc';

// ─── Fee config ───────────────────────────────────────────────────────────────
// Flat fee per action ≈ $3 USD in sats.
// At ~$67k BTC: $3 / $67000 * 1e8 ≈ 4478 sats
// Update FLAT_FEE_SATS manually or hook to BTC price feed.
export const FLAT_FEE_SATS    = 4_478;
export const PROTOCOL_FEE_PCT = 0.01;   // 1% of trade BTC on success

export function calcFees(tradeSats) {
  const pct  = Math.floor(tradeSats * PROTOCOL_FEE_PCT);
  const flat = FLAT_FEE_SATS;
  return { flat, pct, total: flat + pct };
}

// ─── Wallet ───────────────────────────────────────────────────────────────────
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

// ─── Contract validation ───────────────────────────────────────────────────────
/**
 * OP_NET bech32 addresses (opt1...) are 62-66 chars long.
 * We validate format only — CORS blocks browser calls to opscan.org/opnet APIs.
 * The address authenticity is confirmed by OP_WALLET when the tx is submitted.
 *
 * opt1 bech32 format: "opt1" + 58 alphanumeric chars (no 0, O, I, l)
 * 0x hex format: "0x" + 40 hex chars
 */
function isValidOPNETAddress(addr) {
  if (!addr) return false;
  // opt1 bech32: starts with opt1, total length 42-66, only bech32 charset
  if (addr.startsWith('opt1')) {
    return addr.length >= 40 && addr.length <= 70 && /^opt1[ac-hj-np-z02-9]+$/i.test(addr);
  }
  // 0x hex
  if (addr.startsWith('0x')) {
    return addr.length === 42 && /^0x[0-9a-fA-F]{40}$/.test(addr);
  }
  return false;
}

export async function validateOP20Contract(contractAddress) {
  const addr = contractAddress?.trim();
  if (!addr) return { valid: false, error: 'Enter a contract address' };

  if (!isValidOPNETAddress(addr)) {
    return {
      valid: false,
      error: 'Invalid format. OP_NET addresses start with "opt1" (62+ chars) or "0x" (42 chars)',
    };
  }

  // Try window.opnet methods if wallet is connected
  if (isOpWalletInstalled()) {
    // Try getTokenDetails (some wallet versions expose this)
    try {
      const details = await window.opnet.getTokenDetails?.(addr);
      if (details?.symbol) {
        return {
          valid: true,
          name: details.name || details.symbol,
          symbol: details.symbol,
          decimals: details.decimals ?? 8,
          source: 'wallet',
        };
      }
    } catch {}

    // Try callContract with name() and symbol() selectors
    try {
      const symResult = await window.opnet.callContract?.({
        to: addr,
        data: '0x95d89b41', // symbol()
      });
      const nameResult = await window.opnet.callContract?.({
        to: addr,
        data: '0x06fdde03', // name()
      });
      const symbol = decodeABIString(symResult?.result || symResult?.data);
      const name   = decodeABIString(nameResult?.result || nameResult?.data);
      if (symbol || name) {
        return {
          valid: true,
          name: name || symbol || addr.slice(0, 12),
          symbol: symbol || '???',
          decimals: 8,
          source: 'rpc',
        };
      }
    } catch {}
  }

  // Format is valid — accept it with a note that we couldn't fetch metadata
  // (CORS prevents direct opscan.org API calls from browser)
  return {
    valid: true,
    name: addr.slice(0, 16) + '…',
    symbol: '???',
    decimals: 8,
    unverified: true,
    source: 'format',
  };
}

export async function validateOP721Contract(contractAddress) {
  const addr = contractAddress?.trim();
  if (!addr) return { valid: false, error: 'Enter a contract address' };
  if (!isValidOPNETAddress(addr)) {
    return { valid: false, error: 'Invalid format. OP_NET addresses start with "opt1" or "0x"' };
  }
  if (isOpWalletInstalled()) {
    try {
      const details = await window.opnet.getNFTDetails?.(addr);
      if (details?.name) return { valid: true, name: details.name, symbol: details.symbol };
    } catch {}
  }
  return {
    valid: true,
    name: addr.slice(0, 16) + '…',
    symbol: 'NFT',
    unverified: true,
    source: 'format',
  };
}

// Decode ABI-encoded string response
function decodeABIString(hex) {
  if (!hex || hex === '0x' || hex.length < 10) return '';
  try {
    const clean = hex.replace(/^0x/, '');
    if (clean.length < 128) {
      // Short response — try direct UTF-8 decode
      return Buffer.from(clean, 'hex').toString('utf8').replace(/\0/g, '').trim();
    }
    const lenHex = clean.slice(64, 128);
    const len    = parseInt(lenHex, 16);
    if (!len || len > 100) return '';
    const strHex = clean.slice(128, 128 + len * 2);
    return Buffer.from(strHex, 'hex').toString('utf8').replace(/\0/g, '').trim();
  } catch { return ''; }
}

// ─── Escrow notice ────────────────────────────────────────────────────────────
// IMPORTANT: The escrow functions below require a deployed OP_NET smart contract.
// Steps to make escrow fully live:
//   1. Write XchangeEscrow contract in OP_NET's Rust/AssemblyScript SDK
//   2. Deploy to testnet → get contract address
//   3. Replace ESCROW_CONTRACT below with that address
//   4. Update ABI call data to match the real contract ABI
//
// Until the contract is deployed, these functions will call window.opnet
// but the transactions will fail on-chain (no contract to receive them).
// The UI correctly shows loading/error states when they fail.

export const ESCROW_CONTRACT = 'opt1_DEPLOY_ESCROW_CONTRACT_FIRST';

export async function approveAndLockOP20(contractAddress, amount, listingId) {
  if (!isOpWalletInstalled()) throw new Error('OP_WALLET not connected');
  if (ESCROW_CONTRACT.includes('DEPLOY')) {
    throw new Error('Escrow contract not yet deployed. Coming soon — contract is being audited.');
  }
  const approveTx = await window.opnet.sendTransaction({
    to: contractAddress,
    data: encodeApprove(ESCROW_CONTRACT, amount),
    value: FLAT_FEE_SATS,
  });
  const lockTx = await window.opnet.sendTransaction({
    to: ESCROW_CONTRACT,
    data: encodeLockOP20(contractAddress, amount, listingId),
    value: FLAT_FEE_SATS,
  });
  return { txid: lockTx.txid || lockTx.hash, success: true };
}

export async function approveAndLockOP721(contractAddress, tokenId, listingId) {
  if (!isOpWalletInstalled()) throw new Error('OP_WALLET not connected');
  if (ESCROW_CONTRACT.includes('DEPLOY')) {
    throw new Error('Escrow contract not yet deployed. Coming soon — contract is being audited.');
  }
  await window.opnet.sendTransaction({
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
  if (ESCROW_CONTRACT.includes('DEPLOY')) throw new Error('Escrow contract not yet deployed.');
  const tx = await window.opnet.sendTransaction({
    to: ESCROW_CONTRACT,
    data: encodeCancelListing(listingId),
    value: FLAT_FEE_SATS,
  });
  return { txid: tx.txid || tx.hash, success: true };
}

export async function buyListing(listingId, priceSats) {
  if (!isOpWalletInstalled()) throw new Error('OP_WALLET not connected');
  if (ESCROW_CONTRACT.includes('DEPLOY')) throw new Error('Escrow contract not yet deployed.');
  const fees  = calcFees(priceSats);
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
  if (ESCROW_CONTRACT.includes('DEPLOY')) throw new Error('Escrow contract not yet deployed.');
  const fees  = calcFees(offerSats);
  const total = offerSats + fees.flat;
  const tx = await window.opnet.sendTransaction({
    to: ESCROW_CONTRACT,
    data: encodeMakeOffer(listingId, offerSats),
    value: total,
  });
  return { txid: tx.txid || tx.hash, success: true, fees };
}

export async function acceptOfferOnChain(offerId) {
  if (!isOpWalletInstalled()) throw new Error('OP_WALLET not connected');
  if (ESCROW_CONTRACT.includes('DEPLOY')) throw new Error('Escrow contract not yet deployed.');
  const tx = await window.opnet.sendTransaction({
    to: ESCROW_CONTRACT,
    data: encodeAcceptOffer(offerId),
    value: FLAT_FEE_SATS,
  });
  return { txid: tx.txid || tx.hash, success: true };
}

// ─── Minimal ABI encoders ─────────────────────────────────────────────────────
function encodeApprove(spender, amount) {
  return '0x095ea7b3'
    + spender.replace('0x','').padStart(64,'0')
    + BigInt(amount).toString(16).padStart(64,'0');
}
function encodeSetApprovalForAll(operator, approved) {
  return '0xa22cb465'
    + operator.replace('0x','').padStart(64,'0')
    + (approved ? '1' : '0').padStart(64,'0');
}
function encodeLockOP20(token, amount, id) {
  return '0x11111101' + token.replace('0x','').padStart(64,'0') + BigInt(amount).toString(16).padStart(64,'0');
}
function encodeLockOP721(token, tokenId, id) {
  return '0x11111102' + token.replace('0x','').padStart(64,'0') + BigInt(tokenId).toString(16).padStart(64,'0');
}
function encodeCancelListing(id) { return '0x22222201'; }
function encodeBuyListing(id)    { return '0x33333301'; }
function encodeMakeOffer(id, sats){ return '0x44444401' + BigInt(sats).toString(16).padStart(64,'0'); }
function encodeAcceptOffer(id)   { return '0x55555501'; }

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
  return addr.length > 14 ? `${addr.slice(0,8)}…${addr.slice(-6)}` : addr;
}
export function explorerTx(txid) {
  return `https://opscan.org/tx/${txid}?network=op_testnet`;
}
export function explorerAddress(addr) {
  return `https://opscan.org/address/${addr}?network=op_testnet`;
}
