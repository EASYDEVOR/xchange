import { useState, useCallback, useRef } from 'react';
import { validateOP20Contract, validateOP721Contract, btcToSats, FLAT_FEE_SATS, satsToBtc, explorerAddress } from '../lib/opnet.js';

export function CreateListingPage({ wallet, onSubmit, onCancel, actionLoading }) {
  const [assetType,      setAssetType]      = useState('OP_20');
  // OP_20 fields
  const [contractAddr,   setContractAddr]   = useState('');
  const [contractInfo,   setContractInfo]   = useState(null);   // { name, symbol, decimals }
  const [contractErr,    setContractErr]    = useState('');
  const [validating,     setValidating]     = useState(false);
  const [amount,         setAmount]         = useState('');
  // OP_721 fields
  const [nftContract,    setNftContract]    = useState('');
  const [nftInfo,        setNftInfo]        = useState(null);
  const [nftErr,         setNftErr]         = useState('');
  const [nftValidating,  setNftValidating]  = useState(false);
  const [nftId,          setNftId]          = useState('');
  // Common
  const [priceMode,      setPriceMode]      = useState('fixed');
  const [priceBtc,       setPriceBtc]       = useState('');
  const [desc,           setDesc]           = useState('');
  const [customEmoji,    setCustomEmoji]    = useState('');
  const [errors,         setErrors]         = useState({});
  const validateTimer = useRef(null);

  // ── Contract address validation (debounced 600 ms) ────────────────────────
  const handleContractChange = useCallback((val) => {
    setContractAddr(val);
    setContractInfo(null);
    setContractErr('');
    clearTimeout(validateTimer.current);
    if (!val.trim()) return;
    validateTimer.current = setTimeout(async () => {
      setValidating(true);
      const res = await validateOP20Contract(val.trim());
      setValidating(false);
      if (res.valid) { setContractInfo(res); setContractErr(''); }
      else setContractErr(res.error);
    }, 600);
  }, []);

  const handleNftContractChange = useCallback((val) => {
    setNftContract(val);
    setNftInfo(null);
    setNftErr('');
    clearTimeout(validateTimer.current);
    if (!val.trim()) return;
    validateTimer.current = setTimeout(async () => {
      setNftValidating(true);
      const res = await validateOP721Contract(val.trim());
      setNftValidating(false);
      if (res.valid) { setNftInfo(res); setNftErr(''); }
      else setNftErr(res.error);
    }, 600);
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (assetType === 'OP_20') {
      if (!contractAddr.trim()) e.contract = 'Paste the OP_20 contract address';
      else if (contractErr)     e.contract = contractErr;
      else if (!contractInfo)   e.contract = 'Validating contract…';
      if (!amount || parseFloat(amount) <= 0) e.amount = 'Enter amount to list';
    } else {
      if (!nftContract.trim()) e.nftContract = 'Paste the OP_721 contract address';
      else if (nftErr)         e.nftContract = nftErr;
      else if (!nftInfo)       e.nftContract = 'Validating contract…';
      if (!nftId.trim())       e.nftId = 'Enter the NFT token ID';
    }
    if (priceMode === 'fixed' && (!priceBtc || parseFloat(priceBtc) <= 0))
      e.price = 'Enter a valid BTC price';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!wallet) return;
    if (!validate()) return;
    const data = {
      type: assetType,
      contractAddress: assetType === 'OP_20' ? contractAddr.trim() : nftContract.trim(),
      name: assetType === 'OP_20'
        ? (contractInfo?.name || contractInfo?.symbol || contractAddr.slice(0, 12))
        : (nftInfo ? `${nftInfo.name} #${nftId}` : `NFT #${nftId}`),
      symbol:     assetType === 'OP_20' ? contractInfo?.symbol : null,
      amount:     assetType === 'OP_20' ? amount.trim() : null,
      collection: assetType === 'OP_721' ? (nftInfo?.name || nftContract.slice(0, 12)) : null,
      nftId:      assetType === 'OP_721' ? nftId.trim() : null,
      image:      customEmoji || (assetType === 'OP_721' ? '🎨' : '🔵'),
      priceMode,
      price:      priceMode === 'fixed' ? btcToSats(priceBtc) : null,
      desc:       desc.trim(),
    };
    onSubmit(data);
  };

  if (!wallet) return (
    <div className="empty-state">
      <div className="empty-icon">🔐</div>
      <div className="empty-title">Connect OP_WALLET first</div>
      <div className="empty-sub">You need a connected wallet to create a listing.</div>
    </div>
  );

  const isLocking = actionLoading?.startsWith('lock_');
  const priceSats = priceBtc ? btcToSats(priceBtc) : 0;

  return (
    <div className="form-page fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="back-btn" onClick={onCancel}>← Back</button>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Create OTC Listing</h2>
      </div>

      {/* Testnet notice */}
      <div className="net-notice">
        🧪 <strong>Testnet Mode</strong> — using OP_NET testnet. Contract addresses must exist on testnet.
        <a href="https://testnet.opnet.org" target="_blank" rel="noopener" style={{ color: 'var(--orange)', marginLeft: 8 }}>Open Explorer ↗</a>
      </div>

      {/* Step 1 – Asset type */}
      <div className="form-card">
        <div className="form-section-title">1. Asset Type</div>
        <div className="type-toggle">
          <button className={`type-btn${assetType === 'OP_20' ? ' active' : ''}`} onClick={() => setAssetType('OP_20')}>🔵 OP_20 Token</button>
          <button className={`type-btn${assetType === 'OP_721' ? ' active' : ''}`} onClick={() => setAssetType('OP_721')}>🎨 OP_721 NFT</button>
        </div>
      </div>

      {/* Step 2 – Contract address + asset details */}
      <div className="form-card">
        <div className="form-section-title">2. Contract Address &amp; Asset Details</div>

        {assetType === 'OP_20' ? (
          <>
            <FormField label="OP_20 Contract Address" error={errors.contract}>
              <div style={{ position: 'relative' }}>
                <input
                  className={`inp${errors.contract ? ' inp-error' : contractInfo ? ' inp-ok' : ''}`}
                  placeholder="opt1…  (paste your OP_20 contract address)"
                  value={contractAddr}
                  onChange={e => handleContractChange(e.target.value)}
                  spellCheck={false}
                />
                {validating && <span className="inp-spinner">⏳</span>}
                {contractInfo && !validating && <span className="inp-spinner" style={{ color: 'var(--green)' }}>✅</span>}
              </div>
              {contractInfo && (
                <div className="contract-preview">
                  <span className="cp-icon">🔵</span>
                  <div>
                    <span className="cp-name">{contractInfo.name}</span>
                    <span className="cp-symbol"> ({contractInfo.symbol})</span>
                    <span className="cp-dec"> · {contractInfo.decimals} decimals</span>
                  </div>
                  <a href={explorerAddress(contractAddr)} target="_blank" rel="noopener" className="cp-link">View ↗</a>
                </div>
              )}
              {!contractInfo && !contractErr && !validating && contractAddr && (
                <div className="field-hint">Paste a valid OP_20 contract address — starts with <code>opt1</code></div>
              )}
            </FormField>

            <FormField label={`Amount to List${contractInfo ? ` (${contractInfo.symbol})` : ''}`} error={errors.amount}>
              <input className={`inp${errors.amount ? ' inp-error' : ''}`} type="number" min="0" step="any" placeholder="e.g. 1000" value={amount} onChange={e => setAmount(e.target.value)} />
            </FormField>
          </>
        ) : (
          <>
            <FormField label="OP_721 Contract Address" error={errors.nftContract}>
              <div style={{ position: 'relative' }}>
                <input
                  className={`inp${errors.nftContract ? ' inp-error' : nftInfo ? ' inp-ok' : ''}`}
                  placeholder="opt1…  (paste your OP_721 NFT contract address)"
                  value={nftContract}
                  onChange={e => handleNftContractChange(e.target.value)}
                  spellCheck={false}
                />
                {nftValidating && <span className="inp-spinner">⏳</span>}
                {nftInfo && !nftValidating && <span className="inp-spinner" style={{ color: 'var(--green)' }}>✅</span>}
              </div>
              {nftInfo && (
                <div className="contract-preview">
                  <span className="cp-icon">🎨</span>
                  <div>
                    <span className="cp-name">{nftInfo.name}</span>
                    {nftInfo.symbol && <span className="cp-symbol"> ({nftInfo.symbol})</span>}
                  </div>
                  <a href={explorerAddress(nftContract)} target="_blank" rel="noopener" className="cp-link">View ↗</a>
                </div>
              )}
            </FormField>

            <FormField label="NFT Token ID" error={errors.nftId}>
              <input className={`inp${errors.nftId ? ' inp-error' : ''}`} placeholder="e.g. 441" value={nftId} onChange={e => setNftId(e.target.value)} />
            </FormField>
          </>
        )}

        <FormField label="Display Emoji / Icon (optional)">
          <input className="inp" placeholder="🚀" value={customEmoji} onChange={e => setCustomEmoji(e.target.value)} maxLength={2} style={{ width: 72 }} />
        </FormField>
      </div>

      {/* Step 3 – Pricing */}
      <div className="form-card">
        <div className="form-section-title">3. Pricing</div>
        <div className="type-toggle" style={{ marginBottom: 16 }}>
          <button className={`type-btn${priceMode === 'fixed' ? ' active' : ''}`} onClick={() => setPriceMode('fixed')}>💰 Fixed Price</button>
          <button className={`type-btn${priceMode === 'offers' ? ' active' : ''}`} onClick={() => setPriceMode('offers')}>🤝 Accept Offers</button>
        </div>
        {priceMode === 'fixed' && (
          <FormField label="Price (BTC)" error={errors.price}>
            <input className={`inp${errors.price ? ' inp-error' : ''}`} type="number" step="0.00001" min="0" placeholder="0.00500" value={priceBtc} onChange={e => setPriceBtc(e.target.value)} />
            {priceBtc && !isNaN(parseFloat(priceBtc)) && (
              <div className="field-hint">{btcToSats(priceBtc).toLocaleString()} sats</div>
            )}
          </FormField>
        )}

        {/* Fee breakdown */}
        <div className="fee-breakdown">
          <div className="fb-title">📋 Fee Breakdown</div>
          <div className="fb-row"><span>Flat listing fee (~$3 USD)</span><span className="fb-val">{satsToBtc(FLAT_FEE_SATS)}</span></div>
          {priceMode === 'fixed' && priceSats > 0 && (
            <div className="fb-row"><span>Protocol fee on trade (1% of buyer BTC)</span><span className="fb-val">{satsToBtc(Math.floor(priceSats * 0.01))}</span></div>
          )}
          <div className="fb-row fb-note"><span>All fees → treasury in BTC only. No % cut from tokens/NFTs.</span></div>
          <div className="fb-treasury">Treasury: <code>opt1ppzns…scnq4dvsyc</code></div>
        </div>
      </div>

      {/* Step 4 – Description */}
      <div className="form-card">
        <div className="form-section-title">4. Description (Optional)</div>
        <textarea className="inp" rows={3} placeholder="Reason for sale, notes for buyer…" value={desc} onChange={e => setDesc(e.target.value)} style={{ resize: 'vertical' }} maxLength={500} />
        <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{desc.length}/500</div>
      </div>

      {/* Step 5 – Escrow lock notice */}
      <div className="escrow-lock-notice">
        <div className="eln-icon">🔐</div>
        <div>
          <div className="eln-title">Asset will be locked in escrow before listing goes live</div>
          <div className="eln-steps">
            <span>1. Approve token spend</span> → <span>2. Lock asset in OP_NET escrow</span> → <span>3. Listing becomes visible</span>
          </div>
          <div className="eln-sub">Listing only appears in market <strong>after</strong> successful on-chain lock confirmation. Asset returned automatically on cancel or timeout.</div>
        </div>
      </div>

      <button
        className="btn btn-orange"
        style={{ width: '100%', padding: '15px', fontSize: 15, marginTop: 8 }}
        onClick={handleSubmit}
        disabled={isLocking}
      >
        {isLocking ? (
          <><span className="spinner-sm" /> Approving &amp; Locking Asset in Escrow…</>
        ) : (
          '🔐 Approve & Lock Asset → Create Listing'
        )}
      </button>

      <CreateListingStyles />
    </div>
  );
}

function FormField({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="form-label">{label}</label>
      {children}
      {error && <div className="field-error">⚠️ {error}</div>}
    </div>
  );
}

function CreateListingStyles() {
  return (
    <style>{`
      .net-notice {
        background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.3);
        border-radius: 10px; padding: 10px 16px; font-size: 12px;
        color: var(--muted); margin-bottom: 18px;
      }
      .inp-ok { border-color: var(--green) !important; }
      .inp-spinner {
        position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
        font-size: 14px; pointer-events: none;
      }
      .contract-preview {
        display: flex; align-items: center; gap: 10px;
        margin-top: 8px; padding: 10px 14px;
        background: var(--green-dim); border: 1px solid var(--green);
        border-radius: 8px; font-size: 13px;
      }
      .cp-icon { font-size: 20px; }
      .cp-name { font-weight: 700; }
      .cp-symbol { color: var(--orange); font-weight: 700; }
      .cp-dec { color: var(--muted); font-size: 11px; }
      .cp-link { margin-left: auto; font-size: 11px; color: var(--orange); text-decoration: none; white-space: nowrap; }
      .cp-link:hover { text-decoration: underline; }
      .field-hint { font-size: 11px; color: var(--muted); margin-top: 4px; font-family: var(--mono); }
      .field-error { font-size: 11px; color: var(--red); margin-top: 4px; }
      .fee-breakdown {
        background: var(--bg3); border: 1px solid var(--border);
        border-radius: 10px; padding: 14px 16px; margin-top: 4px;
      }
      .fb-title { font-size: 12px; font-weight: 700; margin-bottom: 10px; color: var(--orange); }
      .fb-row { display: flex; justify-content: space-between; font-size: 12px; padding: 5px 0; color: var(--muted); border-bottom: 1px solid var(--border); }
      .fb-row:last-child { border-bottom: none; }
      .fb-val { font-family: var(--mono); color: var(--text); font-weight: 600; }
      .fb-note { font-size: 11px; color: var(--muted); display: block; }
      .fb-treasury { font-size: 10px; color: var(--muted); margin-top: 6px; font-family: var(--mono); word-break: break-all; }
      .fb-treasury code { color: var(--orange); }
      .escrow-lock-notice {
        display: flex; gap: 14px; align-items: flex-start;
        background: var(--orange-dim); border: 1.5px solid var(--orange);
        border-radius: var(--radius); padding: 18px; margin-bottom: 16px;
      }
      .eln-icon { font-size: 28px; flex-shrink: 0; }
      .eln-title { font-weight: 800; font-size: 14px; margin-bottom: 8px; }
      .eln-steps { font-size: 12px; color: var(--orange); font-family: var(--mono); margin-bottom: 6px; }
      .eln-sub { font-size: 12px; color: var(--muted); line-height: 1.6; }
    `}</style>
  );
}
