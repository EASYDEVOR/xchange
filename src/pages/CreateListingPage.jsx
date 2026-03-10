import { useState, useCallback, useRef } from 'react';
import { validateOP20Contract, validateOP721Contract, btcToSats, FLAT_FEE_SATS, satsToBtc, explorerAddress } from '../lib/opnet.js';

export function CreateListingPage({ wallet, onSubmit, onCancel, actionLoading }) {
  const [assetType,    setAssetType]    = useState('OP_20');
  const [contractAddr, setContractAddr] = useState('');
  const [contractInfo, setContractInfo] = useState(null);
  const [contractErr,  setContractErr]  = useState('');
  const [validating,   setValidating]   = useState(false);
  const [amount,       setAmount]       = useState('');
  const [nftContract,  setNftContract]  = useState('');
  const [nftInfo,      setNftInfo]      = useState(null);
  const [nftErr,       setNftErr]       = useState('');
  const [nftValidating,setNftValidating]= useState(false);
  const [nftId,        setNftId]        = useState('');
  const [priceMode,    setPriceMode]    = useState('fixed');
  const [priceBtc,     setPriceBtc]     = useState('');
  const [desc,         setDesc]         = useState('');
  const [customEmoji,  setCustomEmoji]  = useState('');
  const [errors,       setErrors]       = useState({});
  const [agreed,       setAgreed]       = useState(false);
  const timer = useRef(null);

  const handleContractChange = useCallback((val) => {
    setContractAddr(val); setContractInfo(null); setContractErr('');
    clearTimeout(timer.current);
    if (!val.trim()) return;
    timer.current = setTimeout(async () => {
      setValidating(true);
      const res = await validateOP20Contract(val.trim());
      setValidating(false);
      if (res.valid) { setContractInfo(res); setContractErr(''); }
      else setContractErr(res.error);
    }, 600);
  }, []);

  const handleNftContractChange = useCallback((val) => {
    setNftContract(val); setNftInfo(null); setNftErr('');
    clearTimeout(timer.current);
    if (!val.trim()) return;
    timer.current = setTimeout(async () => {
      setNftValidating(true);
      const res = await validateOP721Contract(val.trim());
      setNftValidating(false);
      if (res.valid) { setNftInfo(res); setNftErr(''); }
      else setNftErr(res.error);
    }, 600);
  }, []);

  const validate = () => {
    const e = {};
    if (assetType === 'OP_20') {
      if (!contractAddr.trim()) e.contract = 'Paste the OP_20 contract address';
      else if (contractErr)     e.contract = contractErr;
      else if (!contractInfo)   e.contract = 'Validating…';
      if (!amount || parseFloat(amount) <= 0) e.amount = 'Enter amount to list';
    } else {
      if (!nftContract.trim()) e.nftContract = 'Paste the OP_721 contract address';
      else if (nftErr)         e.nftContract = nftErr;
      else if (!nftInfo)       e.nftContract = 'Validating…';
      if (!nftId.trim())       e.nftId = 'Enter the NFT token ID';
    }
    if (priceMode === 'fixed' && (!priceBtc || parseFloat(priceBtc) <= 0)) e.price = 'Enter a valid BTC price';
    if (!agreed) e.agreed = 'You must acknowledge the escrow notice';
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
      symbol:     assetType === 'OP_20' ? (contractInfo?.symbol || '???') : null,
      amount:     assetType === 'OP_20' ? amount.trim() : null,
      collection: assetType === 'OP_721' ? (nftInfo?.name || nftContract.slice(0, 12)) : null,
      nftId:      assetType === 'OP_721' ? nftId.trim() : null,
      image:      customEmoji || (assetType === 'OP_721' ? '🎨' : '🔵'),
      priceMode, price: priceMode === 'fixed' ? btcToSats(priceBtc) : null,
      desc: desc.trim(),
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

  const isCreating = actionLoading === 'creating';

  return (
    <div className="form-page fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="back-btn" onClick={onCancel}>← Back</button>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Create OTC Listing</h2>
      </div>

      {/* Testnet notice */}
      <div className="net-notice">
        🧪 <strong>Testnet Mode</strong> — OP_NET testnet. Addresses must exist on testnet.
        <a href="https://opscan.org" target="_blank" rel="noopener" style={{ color: 'var(--orange)', marginLeft: 8 }}>Open OP_SCAN ↗</a>
      </div>

      {/* ⚠️ ESCROW WARNING — must agree before listing */}
      <div className="escrow-warning-box">
        <div style={{ fontSize: 28, flexShrink: 0 }}>⚠️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8, color: 'var(--red)' }}>
            No Escrow — Manual OTC Transfer
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
            The on-chain escrow contract is <strong>not yet deployed</strong>. Listings go live immediately but asset transfer is <strong>manual</strong> — buyer and seller coordinate privately via the built-in chat after a match. XCHANGE does not hold funds or mediate disputes at this stage. Escrow will be added in a future update.
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--orange)' }} />
            I understand — transfers are manual via private chat until escrow is live
          </label>
          {errors.agreed && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>⚠️ {errors.agreed}</div>}
        </div>
      </div>

      {/* 1. Asset type */}
      <div className="form-card">
        <div className="form-section-title">1. Asset Type</div>
        <div className="type-toggle">
          <button className={`type-btn${assetType === 'OP_20' ? ' active' : ''}`} onClick={() => setAssetType('OP_20')}>🔵 OP_20 Token</button>
          <button className={`type-btn${assetType === 'OP_721' ? ' active' : ''}`} onClick={() => setAssetType('OP_721')}>🎨 OP_721 NFT</button>
        </div>
      </div>

      {/* 2. Contract + details */}
      <div className="form-card">
        <div className="form-section-title">2. Contract Address &amp; Asset Details</div>
        {assetType === 'OP_20' ? (
          <>
            <FormField label="OP_20 Contract Address" error={errors.contract}>
              <div style={{ position: 'relative' }}>
                <input className={`inp${errors.contract ? ' inp-error' : contractInfo ? ' inp-ok' : ''}`}
                  placeholder="opt1…  or  0x…" value={contractAddr}
                  onChange={e => handleContractChange(e.target.value)} spellCheck={false} />
                {validating && <span className="inp-spinner">⏳</span>}
                {contractInfo && !validating && <span className="inp-spinner" style={{ color: 'var(--green)' }}>✅</span>}
              </div>
              {contractInfo && (
                <div className="contract-preview" style={{ borderColor: contractInfo.unverified ? 'var(--orange)' : 'var(--green)', background: contractInfo.unverified ? 'var(--orange-dim)' : 'var(--green-dim)' }}>
                  <span style={{ fontSize: 20 }}>🔵</span>
                  <div>
                    {contractInfo.unverified
                      ? <span style={{ color: 'var(--orange)', fontWeight: 700 }}>Valid format ✓ — metadata loads on-chain</span>
                      : <><span style={{ fontWeight: 700 }}>{contractInfo.name}</span><span style={{ color: 'var(--orange)', fontWeight: 700 }}> ({contractInfo.symbol})</span></>}
                  </div>
                  <a href={`https://opscan.org/address/${contractAddr}?network=op_testnet`} target="_blank" rel="noopener" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--orange)', textDecoration: 'none' }}>opscan ↗</a>
                </div>
              )}
            </FormField>
            <FormField label={`Amount${contractInfo?.symbol ? ` (${contractInfo.symbol})` : ''}`} error={errors.amount}>
              <input className={`inp${errors.amount ? ' inp-error' : ''}`} type="number" min="0" step="any" placeholder="e.g. 1000" value={amount} onChange={e => setAmount(e.target.value)} />
            </FormField>
          </>
        ) : (
          <>
            <FormField label="OP_721 Contract Address" error={errors.nftContract}>
              <div style={{ position: 'relative' }}>
                <input className={`inp${errors.nftContract ? ' inp-error' : nftInfo ? ' inp-ok' : ''}`}
                  placeholder="opt1…  or  0x…" value={nftContract}
                  onChange={e => handleNftContractChange(e.target.value)} spellCheck={false} />
                {nftValidating && <span className="inp-spinner">⏳</span>}
                {nftInfo && !nftValidating && <span className="inp-spinner" style={{ color: 'var(--green)' }}>✅</span>}
              </div>
              {nftInfo && (
                <div className="contract-preview" style={{ borderColor: nftInfo.unverified ? 'var(--orange)' : 'var(--green)', background: nftInfo.unverified ? 'var(--orange-dim)' : 'var(--green-dim)' }}>
                  <span style={{ fontSize: 20 }}>🎨</span>
                  <div>{nftInfo.unverified ? <span style={{ color: 'var(--orange)', fontWeight: 700 }}>Valid format ✓</span> : <span style={{ fontWeight: 700 }}>{nftInfo.name}</span>}</div>
                  <a href={`https://opscan.org/address/${nftContract}?network=op_testnet`} target="_blank" rel="noopener" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--orange)', textDecoration: 'none' }}>opscan ↗</a>
                </div>
              )}
            </FormField>
            <FormField label="NFT Token ID" error={errors.nftId}>
              <input className={`inp${errors.nftId ? ' inp-error' : ''}`} placeholder="e.g. 441" value={nftId} onChange={e => setNftId(e.target.value)} />
            </FormField>
          </>
        )}
        <FormField label="Display Emoji (optional)">
          <input className="inp" placeholder="🚀" value={customEmoji} onChange={e => setCustomEmoji(e.target.value)} maxLength={2} style={{ width: 72 }} />
        </FormField>
      </div>

      {/* 3. Pricing */}
      <div className="form-card">
        <div className="form-section-title">3. Pricing</div>
        <div className="type-toggle" style={{ marginBottom: 16 }}>
          <button className={`type-btn${priceMode === 'fixed' ? ' active' : ''}`} onClick={() => setPriceMode('fixed')}>💰 Fixed Price</button>
          <button className={`type-btn${priceMode === 'offers' ? ' active' : ''}`} onClick={() => setPriceMode('offers')}>🤝 Accept Offers</button>
        </div>
        {priceMode === 'fixed' && (
          <FormField label="Price (BTC)" error={errors.price}>
            <input className={`inp${errors.price ? ' inp-error' : ''}`} type="number" step="0.00001" min="0" placeholder="0.00500" value={priceBtc} onChange={e => setPriceBtc(e.target.value)} />
            {priceBtc && !isNaN(parseFloat(priceBtc)) && <div className="field-hint">{btcToSats(priceBtc).toLocaleString()} sats</div>}
          </FormField>
        )}
        <div className="fee-breakdown">
          <div className="fb-title">💸 Fees on Submit</div>
          <div className="fb-row"><span>Flat listing fee (~$3 USD)</span><span className="fb-val">{satsToBtc(FLAT_FEE_SATS)}</span></div>
          <div className="fb-row fb-note"><span>Paid to treasury in BTC via OP_WALLET on submit. No % cut from tokens.</span></div>
        </div>
      </div>

      {/* 4. Description */}
      <div className="form-card">
        <div className="form-section-title">4. Description (Optional)</div>
        <textarea className="inp" rows={3} placeholder="Notes for buyer…" value={desc} onChange={e => setDesc(e.target.value)} style={{ resize: 'vertical' }} maxLength={500} />
        <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{desc.length}/500</div>
      </div>

      <button className="btn btn-orange" style={{ width: '100%', padding: '15px', fontSize: 15, marginTop: 8 }}
        onClick={handleSubmit} disabled={isCreating}>
        {isCreating ? <><span className="spinner-sm" /> Paying $3 fee &amp; Creating Listing…</> : '📋 Pay $3 Fee & Create Listing'}
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
      {error && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>⚠️ {error}</div>}
    </div>
  );
}

function CreateListingStyles() {
  return (
    <style>{`
      .net-notice { background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.3); border-radius:10px; padding:10px 16px; font-size:12px; color:var(--muted); margin-bottom:16px; }
      .escrow-warning-box { display:flex; gap:14px; background:rgba(239,68,68,0.07); border:2px solid var(--red); border-radius:var(--radius); padding:20px; margin-bottom:16px; }
      .contract-preview { display:flex; align-items:center; gap:10px; margin-top:8px; padding:10px 14px; border:1.5px solid; border-radius:8px; font-size:13px; }
      .inp-ok { border-color:var(--green) !important; }
      .inp-spinner { position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:14px; pointer-events:none; }
      .field-hint { font-size:11px; color:var(--muted); margin-top:4px; font-family:var(--mono); }
      .fee-breakdown { background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:14px 16px; margin-top:4px; }
      .fb-title { font-size:12px; font-weight:700; margin-bottom:10px; color:var(--orange); }
      .fb-row { display:flex; justify-content:space-between; font-size:12px; padding:5px 0; color:var(--muted); border-bottom:1px solid var(--border); }
      .fb-row:last-child { border-bottom:none; }
      .fb-val { font-family:var(--mono); color:var(--text); font-weight:600; }
      .fb-note { font-size:11px; display:block; }
    `}</style>
  );
}
