import { useState, useEffect } from 'react';
import { Logo } from './components/Logo.jsx';
import { WalletButton } from './components/WalletButton.jsx';
import { ToastContainer, useToast } from './components/Toast.jsx';
import { MarketPage } from './pages/MarketPage.jsx';
import { ListingDetailPage } from './pages/ListingDetailPage.jsx';
import { CreateListingPage } from './pages/CreateListingPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { LearnPage } from './pages/LearnPage.jsx';
import { AboutPage } from './pages/AboutPage.jsx';
import { SocialOTCPage } from './pages/SocialOTCPage.jsx';
import { useWallet } from './hooks/useWallet.js';
import { useListings } from './hooks/useListings.js';

const NAV = [
  { id:'market',    label:'🏪 Market' },
  { id:'social',    label:'🌐 Social OTC', badge:'SOON' },
  { id:'create',    label:'➕ Create Listing' },
  { id:'dashboard', label:'📊 Dashboard' },
  { id:'history',   label:'📜 History' },
  { id:'learn',     label:'📖 Learn' },
  { id:'about',     label:'ℹ️ About' },
];

export default function App() {
  const [dark, setDark]              = useState(true);
  const [tab,  setTab]               = useState('market');
  const [selected, setSelected]      = useState(null);

  const { wallet, balances, connecting, error, installed, connect, disconnect, refreshBalances } = useWallet();
  const {
    activeListings, myListings, myOffers, receivedOffers, myTxHistory, offers, actionLoading,
    createAndLockListing, cancelListing, buyListing, makeOffer, acceptOffer, rejectOffer, markTransferComplete,
  } = useListings(wallet);

  const { toasts, add: toast } = useToast();

  useEffect(() => {
    const s = localStorage.getItem('xchange_dark');
    if (s !== null) setDark(s === 'true');
  }, []);
  useEffect(() => {
    document.documentElement.className = dark ? '' : 'light';
    localStorage.setItem('xchange_dark', dark);
  }, [dark]);

  const go = (t) => { setTab(t); setSelected(null); };

  const handleCreate = async (data) => {
    try {
      await createAndLockListing(data);
      toast('✅ Listing live! $3 fee sent to treasury.');
      go('market');
    } catch (e) { toast(`❌ ${e.message}`, 'error'); }
  };

  const handleBuy = async (listing) => {
    try {
      const r = await buyListing(listing);
      toast('✅ $3 fee paid. Private chat opened!');
      refreshBalances();
      return r;
    } catch (e) { toast(`❌ ${e.message}`, 'error'); }
  };

  const handleOffer = async (listingId, listingName, sellerAddress, btcAmount) => {
    try {
      const r = await makeOffer(listingId, listingName, sellerAddress, btcAmount);
      toast('✅ $3 fee paid. Offer sent — chat opens when accepted.');
      return r;
    } catch (e) { toast(`❌ ${e.message}`, 'error'); }
  };

  const handleAcceptOffer = async (offerId) => {
    try {
      const r = await acceptOffer(offerId);
      toast('✅ Offer accepted! Private chat opened.');
      return r;
    } catch (e) { toast(`❌ ${e.message}`, 'error'); }
  };

  const handleMarkComplete = (listingId) => {
    markTransferComplete(listingId);
    toast('✅ Marked complete! Listing now shows SOLD.');
    // Keep on same page — listing stays visible as sold
  };

  return (
    <>
      <AppStyles />
      <div className="app">
        <header className="header">
          <div className="header-left" onClick={() => go('market')} style={{ cursor:'pointer' }}>
            <Logo size={36} />
            <div>
              <div className="logo-text">X<span>CHANGE</span></div>
              <div className="logo-sub">OTC P2P · Bitcoin L1 · 🧪 Testnet</div>
            </div>
          </div>
          <div className="header-right">
            <button className="btn btn-ghost btn-sm" onClick={() => setDark(d => !d)} style={{ fontSize:16, padding:'7px 10px' }}>{dark ? '☀️' : '🌙'}</button>
            <WalletButton wallet={wallet} balances={balances} connecting={connecting} error={error} installed={installed} onConnect={connect} onDisconnect={disconnect} />
          </div>
        </header>

        <nav className="nav">
          {NAV.map(n => (
            <button key={n.id} className={`nav-item${tab===n.id&&!selected?' active':''}`} onClick={() => go(n.id)}>
              {n.label}
              {n.badge && <span style={{ marginLeft:6, background:'var(--orange)', color:'#fff', fontSize:9, fontWeight:800, padding:'1px 6px', borderRadius:99, fontFamily:'var(--mono)' }}>{n.badge}</span>}
            </button>
          ))}
        </nav>

        <main className="main">
          {tab==='market' && !selected && <MarketPage listings={activeListings} offers={offers} onSelect={setSelected} onCreateListing={() => go('create')} wallet={wallet} />}
          {tab==='market' && selected && (
            <ListingDetailPage listing={selected} offers={offers} onBack={() => setSelected(null)}
              onBuy={handleBuy} onOffer={handleOffer} onAcceptOffer={handleAcceptOffer}
              onMarkComplete={handleMarkComplete} wallet={wallet} actionLoading={actionLoading} />
          )}
          {tab==='create' && <CreateListingPage wallet={wallet} onSubmit={handleCreate} onCancel={() => go('market')} actionLoading={actionLoading} />}
          {tab==='dashboard' && (
            <DashboardPage wallet={wallet} myListings={myListings} myOffers={myOffers} receivedOffers={receivedOffers}
              onCancel={cancelListing} onAcceptOffer={handleAcceptOffer} onRejectOffer={rejectOffer}
              onMarkComplete={handleMarkComplete} actionLoading={actionLoading} />
          )}
          {tab==='history'   && <HistoryPage wallet={wallet} txHistory={myTxHistory} />}
          {tab==='learn'     && <LearnPage />}
          {tab==='about'     && <AboutPage />}
          {tab==='social'    && <SocialOTCPage />}
        </main>

        <ToastContainer toasts={toasts} />
      </div>
    </>
  );
}

function AppStyles() {
  return (
    <style>{`
      .app{min-height:100vh;display:flex;flex-direction:column}
      .header{display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:64px;background:var(--bg2);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100}
      .header-left{display:flex;align-items:center;gap:12px}
      .logo-text{font-size:20px;font-weight:800;letter-spacing:-0.5px;line-height:1}
      .logo-text span{color:var(--orange)}
      .logo-sub{font-size:10px;color:var(--muted);font-family:var(--mono)}
      .header-right{display:flex;align-items:center;gap:8px}
      .nav{display:flex;gap:2px;padding:0 16px;background:var(--bg2);border-bottom:1px solid var(--border);overflow-x:auto;scrollbar-width:none}
      .nav::-webkit-scrollbar{display:none}
      .nav-item{padding:12px 14px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:none;border-bottom:2.5px solid transparent;color:var(--muted);transition:all 0.15s;white-space:nowrap;font-family:var(--font)}
      .nav-item:hover{color:var(--text)}
      .nav-item.active{color:var(--orange);border-bottom-color:var(--orange)}
      .main{flex:1;padding:24px;max-width:1280px;margin:0 auto;width:100%;box-sizing:border-box}
      .btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:10px;border:none;cursor:pointer;font-family:var(--font);font-weight:700;font-size:13px;transition:all 0.16s;box-sizing:border-box}
      .btn:disabled{opacity:.45;cursor:not-allowed}
      .btn-orange{background:var(--orange);color:#fff}
      .btn-orange:not(:disabled):hover{background:#ff7820;transform:translateY(-1px);box-shadow:0 4px 16px rgba(255,98,0,.35)}
      .btn-ghost{background:transparent;color:var(--text);border:1.5px solid var(--border)}
      .btn-ghost:hover{border-color:var(--orange);color:var(--orange)}
      .btn-green{background:var(--green);color:#fff}
      .btn-green:not(:disabled):hover{background:#16a34a;transform:translateY(-1px)}
      .btn-red{background:var(--red);color:#fff}
      .btn-red:hover{background:#dc2626}
      .btn-sm{padding:6px 12px;font-size:12px;border-radius:8px}
      .inp{width:100%;padding:10px 14px;border-radius:10px;background:var(--bg3);border:1.5px solid var(--border);color:var(--text);font-family:var(--font);font-size:13px;outline:none;transition:border-color 0.15s;box-sizing:border-box}
      .inp:focus{border-color:var(--orange)}
      .inp::placeholder{color:var(--muted)}
      .inp.inp-error{border-color:var(--red)}
      .inp.inp-ok{border-color:var(--green)}
      .sel{width:auto;cursor:pointer}
      .hero{background:linear-gradient(135deg,var(--bg2),var(--bg3));border:1px solid var(--border);border-radius:var(--radius);padding:48px 32px;margin-bottom:28px;position:relative;overflow:hidden}
      .hero::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 120%,rgba(255,98,0,.1),transparent 65%);pointer-events:none}
      .hero-inner{position:relative;z-index:1;max-width:680px;margin:0 auto;text-align:center}
      .hero-logo{display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:16px}
      .hero-title{font-size:clamp(28px,5vw,48px);font-weight:800;line-height:1}
      .hero-sub{font-size:13px;color:var(--muted);font-family:var(--mono);margin-top:4px}
      .hero-desc{color:var(--muted);font-size:15px;line-height:1.7;margin:0 auto;max-width:520px}
      .hero-pills{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:20px}
      .pill{background:var(--bg);border:1px solid var(--border);padding:5px 14px;border-radius:99px;font-size:12px;font-family:var(--mono);color:var(--muted)}
      .pill.green{border-color:var(--green);color:var(--green);background:var(--green-dim)}
      .pill.orange{border-color:var(--orange);color:var(--orange);background:var(--orange-dim)}
      .pill.red{border-color:var(--red);color:var(--red);background:var(--red-dim)}
      .filters-bar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;align-items:center}
      .search-wrap{flex:1;min-width:200px}
      .listings-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
      .listings-header h2{font-size:18px;font-weight:700}
      .count-badge{background:var(--orange-dim);color:var(--orange);padding:3px 12px;border-radius:99px;font-size:12px;font-family:var(--mono)}
      .listings-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px}
      .listing-card{background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--radius);padding:20px;cursor:pointer;transition:all 0.18s;box-shadow:var(--card-shadow)}
      .listing-card:hover{border-color:var(--orange);transform:translateY(-2px);box-shadow:0 8px 32px rgba(255,98,0,.15)}
      .lc-emoji{font-size:48px;text-align:center;margin-bottom:14px;line-height:1}
      .lc-name{font-size:17px;font-weight:700;margin-bottom:3px}
      .lc-sub{font-size:12px;color:var(--muted);margin-bottom:10px}
      .lc-price{font-size:16px;font-weight:700;font-family:var(--mono);margin-bottom:6px}
      .lc-desc{font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:10px}
      .lc-footer{display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid var(--border)}
      .lc-seller{font-size:11px;color:var(--muted);font-family:var(--mono)}
      .lc-time{font-size:11px;color:var(--muted)}
      .type-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:800;font-family:var(--mono)}
      .type-badge.token{background:var(--orange-dim);color:var(--orange)}
      .type-badge.nft{background:var(--purple-dim);color:#a78bfa}
      .type-badge.offers{background:var(--orange-dim);color:var(--orange)}
      .back-btn{background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;font-family:var(--font);padding:0;margin-bottom:20px;display:block}
      .back-btn:hover{color:var(--orange)}
      .detail-layout{display:grid;grid-template-columns:1fr;gap:20px}
      @media(min-width:768px){.detail-layout{grid-template-columns:1fr 1.4fr}}
      .detail-asset-panel{background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--radius);padding:32px;text-align:center}
      .detail-emoji{font-size:96px;line-height:1;margin-bottom:14px}
      .detail-name{font-size:22px;font-weight:800;margin-bottom:4px}
      .detail-coll{font-size:13px;color:var(--muted);margin-bottom:10px}
      .detail-desc{font-size:13px;color:var(--muted);line-height:1.7;margin-top:14px;text-align:left}
      .detail-right{display:flex;flex-direction:column;gap:16px}
      .info-panel{background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--radius);padding:20px}
      .info-title{font-size:14px;font-weight:700;margin-bottom:12px}
      .info-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px}
      .info-row:last-child{border-bottom:none}
      .info-label{color:var(--muted)}
      .info-val{font-weight:600}
      .action-panel{background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--radius);padding:20px}
      .action-price-label{font-size:12px;color:var(--muted);margin-bottom:4px}
      .action-price{font-size:28px;font-weight:800;color:var(--green);font-family:var(--mono)}
      .action-no-wallet{background:var(--bg3);border:1.5px dashed var(--border);border-radius:10px;padding:14px;text-align:center;color:var(--muted);font-size:13px;margin-top:12px}
      .escrow-panel{background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--radius);padding:20px}
      .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px}
      .modal{background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--radius);padding:28px;max-width:460px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.5);max-height:90vh;overflow-y:auto}
      .modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
      .modal-header h3{font-size:18px;font-weight:800}
      .modal-close{background:none;border:none;cursor:pointer;color:var(--muted);font-size:18px;padding:4px}
      .modal-close:hover{color:var(--text)}
      .form-page{max-width:600px;margin:0 auto}
      .form-card{background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:16px}
      .form-section-title{font-size:15px;font-weight:700;margin-bottom:16px}
      .form-label{display:block;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
      .type-toggle{display:flex;gap:8px}
      .type-btn{flex:1;padding:12px;border-radius:10px;border:1.5px solid var(--border);background:transparent;cursor:pointer;font-family:var(--font);font-size:14px;font-weight:600;color:var(--muted);transition:all 0.14s}
      .type-btn.active{border-color:var(--orange);color:var(--orange);background:var(--orange-dim)}
      .section-title{font-size:22px;font-weight:800;margin-bottom:6px}
      .dash-addr{font-family:var(--mono);font-size:11px;color:var(--muted);margin-bottom:20px;word-break:break-all}
      .dash-tabs{display:flex;gap:4px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:4px;width:fit-content;margin-bottom:20px;flex-wrap:wrap}
      .dash-tab{padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;color:var(--muted);border:none;background:none;font-family:var(--font);transition:all 0.14s;white-space:nowrap}
      .dash-tab.active{background:var(--orange);color:#fff}
      .table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius)}
      .table{width:100%;border-collapse:collapse}
      .table th{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);padding:11px 16px;text-align:left;border-bottom:1px solid var(--border);background:var(--bg3);white-space:nowrap}
      .table td{padding:12px 16px;font-size:13px;border-bottom:1px solid var(--border);vertical-align:middle}
      .table tr:last-child td{border-bottom:none}
      .table tr:hover td{background:var(--bg3)}
      .status-badge{padding:3px 10px;border-radius:99px;font-size:11px;font-weight:800;font-family:var(--mono);white-space:nowrap}
      .status-active{background:var(--green-dim);color:var(--green)}
      .status-sold,.status-completed{background:var(--orange-dim);color:var(--orange)}
      .status-pending{background:var(--purple-dim);color:#a78bfa}
      .status-pending-transfer,.status-pending_transfer{background:var(--orange-dim);color:var(--orange)}
      .status-rejected,.status-cancelled{background:var(--red-dim);color:var(--red)}
      .status-accepted{background:var(--green-dim);color:var(--green)}
      .status-manual{background:var(--bg3);color:var(--muted)}
      .empty-state{text-align:center;padding:64px 20px}
      .empty-icon{font-size:52px;margin-bottom:14px}
      .empty-title{font-size:18px;font-weight:700;margin-bottom:8px}
      .empty-sub{font-size:14px;color:var(--muted);max-width:380px;margin:0 auto;line-height:1.6}
      .toast{background:var(--bg2);border:1.5px solid var(--border);padding:12px 16px;border-radius:10px;font-size:13px;box-shadow:var(--card-shadow);min-width:220px;max-width:360px}
      .toast-success{border-color:var(--green)}
      .toast-error{border-color:var(--red)}
      .spinner-sm{width:12px;height:12px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
      .wallet-dropdown{position:absolute;top:calc(100% + 8px);right:0;background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--radius);padding:16px;width:268px;box-shadow:var(--card-shadow);z-index:200}
      .wd-addr{font-family:var(--mono);font-size:11px;color:var(--muted);word-break:break-all;margin-bottom:6px}
      .wd-network{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);margin-bottom:12px}
      .wd-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
      .wd-divider{height:1px;background:var(--border);margin:10px 0}
      .wd-bal-row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0}
      .learn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:16px}
      .learn-card{background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--radius);padding:24px}
      .learn-icon{font-size:32px;margin-bottom:12px}
      .learn-card h3{font-size:16px;font-weight:700;margin-bottom:8px}
      .learn-card p{font-size:13px;color:var(--muted);line-height:1.75}
      @media(max-width:600px){.main{padding:16px}.hero{padding:28px 16px}.listings-grid{grid-template-columns:1fr}.detail-layout{grid-template-columns:1fr}.filters-bar{gap:8px}}
    `}</style>
  );
}
