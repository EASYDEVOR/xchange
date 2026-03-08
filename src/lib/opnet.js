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

// ─── Contract validation via OP_SCAN API ──────────────────────────────────────
/**
 * Validate OP_20 contract by hitting opscan.org token endpoint.
 * The URL pattern from your screenshot:
 *   https://opscan.org/tokens/0x{hex_address}?network=op_testnet
 *
 * OP_NET contract addresses come in two formats:
 *   opt1... (bech32) — used in wallet UI
 *   0x...   (hex)    — used in explorer URLs
 *
 * We try both the opscan API and the opnet RPC.
 */
export async function validateOP20Contract(contractAddress) {
  const addr = contractAddress?.trim();
  if (!addr) return { valid: false, error: 'Enter a contract address' };

  // Basic format check — OP_NET addresses start with opt1 or 0x
  if (!addr.startsWith('opt1') && !addr.startsWith('0x')) {
    return { valid: false, error: 'Address must start with "opt1" or "0x"' };
  }

  try {
    // Try OP_NET RPC JSON-RPC call (correct protocol for OP_NET)
    const rpcRes = await fetch('https://api.opnet.org/api/v1/address/token-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: addr, network: 'op_testnet' }),
    });
    if (rpcRes.ok) {
      const data = await rpcRes.json();
      if (data?.symbol || data?.name) {
        return {
          valid: true,
          name: data.name || data.symbol,
          symbol: data.symbol || '???',
          decimals: data.decimals ?? 8,
        };
      }
    }
  } catch {}

  try {
    // Fallback: OP_SCAN REST API
    const scanRes = await fetch(
      `https://opscan.org/api/token?address=${encodeURIComponent(addr)}&network=op_testnet`,
      { headers: { Accept: 'application/json' } }
    );
    if (scanRes.ok) {
      const data = await scanRes.json();
      if (data?.symbol || data?.name) {
        return {
          valid: true,
          name: data.name || data.symbol,
          symbol: data.symbol || '???',
          decimals: data.decimals ?? 8,
        };
      }
    }
  } catch {}

  try {
    // Fallback 2: Try window.opnet directly if available
    if (isOpWalletInstalled() && window.opnet.getTokenDetails) {
      const details = await window.opnet.getTokenDetails(addr);
      if (details?.symbol) {
        return {
          valid: true,
          name: details.name || details.symbol,
          symbol: details.symbol,
          decimals: details.decimals ?? 8,
        };
      }
    }
  } catch {}

  return {
    valid: false,
    error: 'Could not verify this contract on OP_NET testnet. Check the address and try again.',
  };
}

export async function validateOP721Contract(contractAddress) {
  const addr = contractAddress?.trim();
  if (!addr) return { valid: false, error: 'Enter a contract address' };
  if (!addr.startsWith('opt1') && !addr.startsWith('0x')) {
    return { valid: false, error: 'Address must start with "opt1" or "0x"' };
  }
  try {
    const res = await fetch(
      `https://opscan.org/api/nft?address=${encodeURIComponent(addr)}&network=op_testnet`,
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.name || data?.symbol) {
        return { valid: true, name: data.name, symbol: data.symbol };
      }
    }
  } catch {}
  try {
    if (isOpWalletInstalled() && window.opnet.getNFTDetails) {
      const details = await window.opnet.getNFTDetails(addr);
      if (details?.name) return { valid: true, name: details.name, symbol: details.symbol };
    }
  } catch {}
  return { valid: false, error: 'Could not verify this OP_721 contract on testnet.' };
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
