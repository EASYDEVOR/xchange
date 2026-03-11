import { useState, useCallback, useRef } from 'react';
import { validateOP20Contract, validateOP721Contract, btcToSats, FLAT_FEE_SATS, satsToBtc, KNOWN_TOKENS } from '../lib/opnet.js';

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
  const [nftVal,       setNftVal]       = useState(false);
  const [nftId,        setNftId]        = useState('');
  const [priceMode,    setPriceMode]    = useState('fixed');
  const [priceBtc,     setPriceBtc]     = useState('');
  const [desc,         setDesc]         = useState('');
  const [customEmoji,  setCustomEmoji]  = useState('');
  const [agreed,       setAgreed]       = useState(false);
  const [errors,       setErrors]       = useState({});
  const timer = useRef(null);

  const runValidation = useCallback(async (val) => {
    setValidating(true);
    const res = await validateOP20Contract(val.trim());
    setValidating(false);
    if (res.valid) { setContractInfo(res); setContractErr(''); }
    else { setContractInfo(null); setContractErr(res.error); }
  }, []);

  const handleContractChange = useCallback((val) => {
    setContractAddr(val); setContractInfo(null); setContractErr('');
    clearTimeout(timer.current);
    if (val.trim().length >= 10) timer.current = setTimeout(() => runValidation(val), 500);
  }, [runValidation]);

  const selectKnownToken = (token) => {
    setContractAddr(token.address);
    setContractInfo({ valid: true, ...token });
    setContractErr('');
  };

  const handleNftChange = useCallback(async (val) => {
    setNftContract(val); setNftInfo(null); setNftErr('');
    if (val.trim().length < 10) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setNftVal(true);
      const res = await validateOP721Contract(val.trim());
      setNftVal(false);
      if (res.valid) { setNftInfo(res); setNftErr(''); }
      else { setNftInfo(null); setNftErr(res.error); }
    }, 500);
  }, []);

  const validate = () => {
    const e = {};
    if (assetType === 'OP_20') {
      if (!contractAddr.trim()) e.contract = 'Paste a contract address or pick a suggested token';
      else if (contractErr)     e.contract = contractErr;
      else if (!contractInfo)   e.contract = 'Still validating…';
      if (!amount || parseFloat(amount) <= 0) e.amount = 'Enter amount to list';
    } else {
      if (!nftContract.trim()) e.nftContract = 'Paste the OP_721 contract address';
      else if (nftErr)         e.nftContract = nftErr;
      else if (!nftInfo)       e.nftContract = 'Still validating…';
      if (!nftId.trim())       e.nftId = 'Enter the NFT token ID';
    }
    if (priceMode === 'fixed' && (!priceBtc || parseFloat(priceBtc) <= 0)) e.price = 'Enter a price';
    if (!agreed) e.agreed = 'You must acknowledge the manual OTC notice';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = () => {
    if (!wallet || !validate()) return;
    onSubmit({
      type: assetType,
      contractAddress: assetType === 'OP_20' ? contractAddr.trim() : nftContract.trim(),
      name: assetType === 'OP_20'
        ? (contractInfo?.name || contractInfo?.symbol || contractAddr.slice(0, 12) + '…')
        : (nftInfo?.name ? `${nftInfo.name} #${nftId}` : `NFT #${nftId}`),
      symbol:     assetType === 'OP_20' ? (contractInfo?.symbol || null) : null,
      amount:     assetType === 'OP_20' ? amount.trim() : null,
      collection: assetType === 'OP_721' ? (nftInfo?.name || null) : null,
      nftId:      assetType === 'OP_721' ? nftId.trim() : null,
      image:      customEmoji || contractInfo?.emoji || (assetType === 'OP_721' ? '🎨' : '🔵'),
      priceMode,
      price:      priceMode === 'fixed' ? btcToSats(priceBtc) : null,
      desc:       desc.trim(),
    });
  };

  if (!wallet) return (
    <div className="empty-state">
      <div className="empty-icon">🔐</div>
      <div className="empty-title">Connect OP_WALLET first</div>
    </div>
  );

  const isCreating = actionLoading === 'creating';

  return (
    <div className="form-page fade-in">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button className="back-btn" onClick={onCancel}>← Back</button>
        <h2 style={{ fontSize:22, fontWeight:800 }}>Create OTC Listing</h2>
      </div>

      {/* Manual OTC warning — must agree */}
      <div style={{ display:'flex', gap:14, background:'rgba(239,68,68,0.07)', border:'2px solid var(--red)', borderRadius:14, padding:18, marginBottom:16 }}>
        <span style={{ fontSize:26, flexShrink:0 }}>⚠️</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:14, color:'var(--red)', marginBottom:6 }}>No Escrow — Manual OTC</div>
          <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.7 }}>
            Escrow contract is not yet deployed. Your listing goes live but asset transfer is arranged <strong>manually via private chat</strong> between you and the buyer. XCHANGE does not hold funds.
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:10, marginTop:12, cursor:'pointer', fontSize:13, fontWeight:700 }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ width:15, height:15, accentColor:'var(--orange)' }} />
            I understand — I will transfer the asset manually via private chat
          </label>
          {errors.agreed && <div style={{ color:'var(--red)', fontSize:12, marginTop:6 }}>⚠️ {errors.agreed}</div>}
        </div>
      </div>

      {/* 1. Asset Type */}
      <div className="form-card">
        <div className="form-section-title">1. Asset Type</div>
        <div className="type-toggle">
          <button className={`type-btn${assetType==='OP_20'?' active':''}`} onClick={() => setAssetType('OP_20')}>🔵 OP_20 Token</button>
          <button className={`type-btn${assetType==='OP_721'?' active':''}`} onClick={() => setAssetType('OP_721')}>🎨 OP_721 NFT</button>
        </div>
      </div>

      {/* 2. Contract */}
      <div className="form-card">
        <div className="form-section-title">2. Contract Address</div>
        {assetType === 'OP_20' && (
          <>
            {/* Suggested tokens */}
            <div style={{ marginBottom:14 }}>
              <div className="form-label">Suggested Tokens on OP_NET Testnet</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {KNOWN_TOKENS.map(t => (
                  <button key={t.address} onClick={() => selectKnownToken(t)}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, border: contractInfo?.symbol === t.symbol ? '2px solid var(--orange)' : '1.5px solid var(--border)', background: contractInfo?.symbol === t.symbol ? 'var(--orange-dim)' : 'var(--bg3)', cursor:'pointer', transition:'all 0.14s', fontFamily:'var(--font)' }}>
                    <span style={{ fontSize:20 }}>{t.emoji}</span>
                    <div style={{ textAlign:'left' }}>
                      <div style={{ fontWeight:800, fontSize:13 }}>{t.symbol}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{t.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-label">Or paste any OP_20 contract address</div>
            <div style={{ position:'relative', marginBottom:8 }}>
              <input className={`inp${errors.contract ? ' inp-error' : contractInfo ? ' inp-ok' : ''}`}
                placeholder="opt1… or 0x…"
                value={contractAddr}
                onChange={e => handleContractChange(e.target.value)}
                spellCheck={false} />
              {validating && <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}>⏳</span>}
              {contractInfo && !validating && <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--green)' }}>✅</span>}
            </div>

            {/* Token info display */}
            {contractInfo && (
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:10, border:'1.5px solid var(--green)', background:'var(--green-dim)', marginBottom:8 }}>
                <span style={{ fontSize:28 }}>{contractInfo.emoji || '🔵'}</span>
                <div>
                  {contractInfo.symbol && contractInfo.symbol !== '???' ? (
                    <>
                      <div style={{ fontWeight:800, fontSize:16 }}>{contractInfo.name}</div>
                      <div style={{ fontSize:13, color:'var(--orange)', fontWeight:700 }}>{contractInfo.symbol}</div>
                      {contractInfo.description && <div style={{ fontSize:11, color:'var(--muted)' }}>{contractInfo.description}</div>}
                    </>
                  ) : (
                    <div style={{ fontWeight:700, color:'var(--orange)' }}>Valid address format ✓ — name loads on-chain</div>
                  )}
                </div>
                <a href={`https://opscan.org/address/${contractAddr}?network=op_testnet`} target="_blank" rel="noopener"
                  style={{ marginLeft:'auto', fontSize:11, color:'var(--orange)', textDecoration:'none' }}>opscan ↗</a>
              </div>
            )}
            {errors.contract && <div style={{ color:'var(--red)', fontSize:12, marginBottom:8 }}>⚠️ {errors.contract}</div>}

            <div className="form-label" style={{ marginTop:8 }}>Amount to List {contractInfo?.symbol ? `(${contractInfo.symbol})` : ''}</div>
            <input className={`inp${errors.amount?' inp-error':''}`} type="number" min="0" step="any" placeholder="e.g. 1000" value={amount} onChange={e => setAmount(e.target.value)} />
            {errors.amount && <div style={{ color:'var(--red)', fontSize:12, marginTop:4 }}>⚠️ {errors.amount}</div>}
          </>
        )}

        {assetType === 'OP_721' && (
          <>
            <div style={{ position:'relative', marginBottom:8 }}>
              <input className={`inp${errors.nftContract?' inp-error':nftInfo?' inp-ok':''}`}
                placeholder="opt1… or 0x…" value={nftContract}
                onChange={e => handleNftChange(e.target.value)} spellCheck={false} />
              {nftVal && <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)' }}>⏳</span>}
              {nftInfo && !nftVal && <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--green)' }}>✅</span>}
            </div>
            {nftInfo && (
              <div style={{ padding:'10px 14px', borderRadius:10, border:'1.5px solid var(--green)', background:'var(--green-dim)', marginBottom:8, fontWeight:700 }}>
                {nftInfo.name ? `🎨 ${nftInfo.name}` : '🎨 Valid address format ✓'}
              </div>
            )}
            {errors.nftContract && <div style={{ color:'var(--red)', fontSize:12, marginBottom:8 }}>⚠️ {errors.nftContract}</div>}
            <div className="form-label" style={{ marginTop:8 }}>NFT Token ID</div>
            <input className={`inp${errors.nftId?' inp-error':''}`} placeholder="e.g. 441" value={nftId} onChange={e => setNftId(e.target.value)} />
            {errors.nftId && <div style={{ color:'var(--red)', fontSize:12, marginTop:4 }}>⚠️ {errors.nftId}</div>}
          </>
        )}

        <div className="form-label" style={{ marginTop:12 }}>Custom Emoji (optional)</div>
        <input className="inp" placeholder="🚀" value={customEmoji} onChange={e => setCustomEmoji(e.target.value)} maxLength={2} style={{ width:72 }} />
      </div>

      {/* 3. Pricing */}
      <div className="form-card">
        <div className="form-section-title">3. Pricing</div>
        <div className="type-toggle" style={{ marginBottom:14 }}>
          <button className={`type-btn${priceMode==='fixed'?' active':''}`} onClick={() => setPriceMode('fixed')}>💰 Fixed Price</button>
          <button className={`type-btn${priceMode==='offers'?' active':''}`} onClick={() => setPriceMode('offers')}>🤝 Accept Offers</button>
        </div>
        {priceMode === 'fixed' && (
          <>
            <div className="form-label">Price (BTC)</div>
            <input className={`inp${errors.price?' inp-error':''}`} type="number" step="0.00001" min="0" placeholder="0.00500" value={priceBtc} onChange={e => setPriceBtc(e.target.value)} />
            {priceBtc && !isNaN(parseFloat(priceBtc)) && <div style={{ fontSize:11, color:'var(--muted)', marginTop:4, fontFamily:'var(--mono)' }}>{btcToSats(priceBtc).toLocaleString()} sats</div>}
            {errors.price && <div style={{ color:'var(--red)', fontSize:12, marginTop:4 }}>⚠️ {errors.price}</div>}
          </>
        )}
        <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px', marginTop:12 }}>
          <div style={{ fontWeight:700, fontSize:12, color:'var(--orange)', marginBottom:8 }}>💸 On Submit — OP_WALLET will pop up</div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--muted)', padding:'4px 0', borderBottom:'1px solid var(--border)' }}>
            <span>Flat listing fee (~$3 USD)</span><span style={{ fontFamily:'var(--mono)', color:'var(--text)' }}>{satsToBtc(FLAT_FEE_SATS)}</span>
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', paddingTop:8 }}>Paid directly to treasury. No % cut from your tokens.</div>
        </div>
      </div>

      {/* 4. Description */}
      <div className="form-card">
        <div className="form-section-title">4. Description (Optional)</div>
        <textarea className="inp" rows={3} placeholder="Notes for the buyer…" value={desc} onChange={e => setDesc(e.target.value)} style={{ resize:'vertical' }} maxLength={500} />
        <div style={{ textAlign:'right', fontSize:11, color:'var(--muted)', marginTop:4 }}>{desc.length}/500</div>
      </div>

      <button className="btn btn-orange" style={{ width:'100%', padding:15, fontSize:15, marginTop:4 }} onClick={handleSubmit} disabled={isCreating}>
        {isCreating
          ? <><span className="spinner-sm" /> Waiting for wallet confirmation…</>
          : '💸 Pay $3 Fee & Go Live'}
      </button>

      <style>{`.inp-ok{border-color:var(--green)!important}`}</style>
    </div>
  );
}
