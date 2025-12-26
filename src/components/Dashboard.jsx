import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../auth';
import { abonnementAPI, venteAPI, profilAPI, dashboardAPI } from '../api';
import { syncFull } from '../offline_sync';
import {
  getDashboardUnifiedStats,
  saveVentesSynced,
  getDBStats,
  saveDashboardCache,
  getDashboardCache
} from '../db';
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  TrendingUp, Wallet, LogOut, RefreshCw,
  History, Truck, Store, FileText, UserCog,
  Download, CreditCard, AlertCircle, ChevronRight,
  CheckCircle, WifiOff, CloudUpload, Database, ArrowLeft
} from 'lucide-react';

// =====================================================
// 🔒 COMPOSANT DE VÉRIFICATION DE PERMISSION
// =====================================================

export const usePermissionCheck = (requiredRoles = ['gerant', 'admin']) => {
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      const response = await profilAPI.me();
      const role = response.data.role;
      setUserRole(role);
      setHasPermission(requiredRoles.includes(role));
    } catch (error) {
      console.error('Erreur vérification permission:', error);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  return { loading, hasPermission, userRole };
};

export const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="spinner"></div>
    <p>Chargement...</p>
    <style jsx>{`
      .loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; color: #64748b; }
      .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top: 3px solid #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `}</style>
  </div>
);

export const AccessDenied = ({ userRole }) => (
  <div className="access-denied">
    <h2>Accès Refusé</h2>
    <button onClick={() => window.location.href = '/login'}>Retour à la connexion</button>
    <style jsx>{`
      .access-denied { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; text-align: center; }
      button { margin-top: 20px; padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; }
    `}</style>
  </div>
);

// =====================================================
// WIDGET SYNC
// =====================================================
const SyncStatus = ({ isOnline, lastSync, status, error, onRetry, pendingCount }) => {
  const [showError, setShowError] = useState(false);
  const formatDate = (dateString) => {
    if (!dateString) return '--:--';
    return new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };
  let containerClass = "sync-widget";
  let Icon = CheckCircle;
  let label = "Synchronisé";
  if (!isOnline) { containerClass += " offline"; Icon = WifiOff; label = "Hors Ligne"; }
  else if (status === 'SYNCING') { containerClass += " syncing"; Icon = RefreshCw; label = "Sync..."; }
  else if (status === 'ERROR') { containerClass += " error"; Icon = AlertCircle; label = "Erreur"; }
  else { containerClass += " success"; }

  return (
    <div className={containerClass}>
      <div className="icon-box"><Icon size={16} className={status === 'SYNCING' ? 'spin' : ''} /></div>
      <div className="info-box"><span className="status-label">{label}</span><span className="last-sync">{formatDate(lastSync)}</span></div>
      {pendingCount > 0 && (<div className="pending-badge" title={`${pendingCount} ventes non envoyées`}><CloudUpload size={12} /><span>{pendingCount}</span></div>)}
      {status === 'ERROR' && isOnline && (<button className="retry-btn" onClick={onRetry} onMouseEnter={() => setShowError(true)} onMouseLeave={() => setShowError(false)}><RefreshCw size={14} /></button>)}
      {showError && error && <div className="error-tooltip">{error}</div>}
      <style jsx>{`
        .sync-widget { display: flex; align-items: center; gap: 10px; padding: 6px 12px; border-radius: 30px; background: white; border: 1px solid #e2e8f0; transition: all 0.3s ease; position: relative; white-space: nowrap; }
        .sync-widget.success { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
        .sync-widget.syncing { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
        .sync-widget.error { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
        .sync-widget.offline { background: #f1f5f9; border-color: #e2e8f0; color: #64748b; }
        .icon-box { display: flex; align-items: center; }
        .info-box { display: flex; flex-direction: column; line-height: 1; }
        .status-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
        .last-sync { font-size: 0.75rem; font-family: 'Monaco', monospace; opacity: 0.8; }
        .pending-badge { background: #f97316; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 4px; }
        .retry-btn { background: white; border: 1px solid currentColor; color: inherit; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .error-tooltip { position: absolute; top: 110%; right: 0; background: #1e293b; color: white; padding: 6px 10px; border-radius: 6px; font-size: 0.75rem; z-index: 50; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default function Dashboard({ isOnline }) {
  // --- LOGIQUE & ETATS ---
  const { loading: checkingPermissions, hasPermission, userRole } = usePermissionCheck(['gerant', 'admin', 'vendeur', 'caissier']);
  const [unifiedStats, setUnifiedStats] = useState({ nombre_ventes: 0, total_montant: 0, total_depenses: 0, benefice: 0, ventes_pending_count: 0 });
  const [abonnement, setAbonnement] = useState(null);
  const [dbStats, setDbStats] = useState(null);
  const [syncStatus, setSyncStatus] = useState('IDLE');
  const [syncError, setSyncError] = useState(null);
  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const isGerant = userRole === 'gerant';
  const isAdmin = userRole === 'admin';
  const isVendeur = ['vendeur', 'caissier'].includes(userRole);

  useEffect(() => {
    if (hasPermission) {
      const fetchProfil = async () => {
        try { const res = await profilAPI.me(); setProfil(res.data); }
        catch (err) { if(err.response?.status === 401) logout(); }
      };
      fetchProfil();
    }
  }, [hasPermission]);

  useEffect(() => { if (profil) loadDashboardData(); }, [profil, isOnline]);
  useEffect(() => { if (isOnline && profil) handleSync(); }, [isOnline, profil]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const localStats = await getDashboardUnifiedStats(profil?.id);
      let displayStats = { nombre_ventes: 0, total_montant: 0, total_depenses: 0, benefice: 0, ventes_pending_count: localStats.ventes_pending_count || 0 };
      let serverData = null;

      if (isOnline) {
        try {
          const serverStatsRes = await dashboardAPI.getStats();
          serverData = serverStatsRes.data;
          saveDashboardCache(serverData);
          if (isGerant || isAdmin) { const aboRes = await abonnementAPI.current(); setAbonnement(aboRes.data); }
          venteAPI.list().then(res => { saveVentesSynced(Array.isArray(res.data) ? res.data : (res.data.results || [])); }).catch(console.warn);
        } catch (err) { console.error("Erreur serveur", err); }
      }
      if (!serverData) serverData = getDashboardCache();

      if (serverData) {
        displayStats.nombre_ventes = serverData.ventes.today.count;
        displayStats.total_montant = serverData.ventes.today.total;
        displayStats.total_depenses = serverData.depenses.today;
        displayStats.benefice = serverData.benefices.today;
        if (!isOnline && localStats.ventes_pending_count > 0 && localStats.pending_amount_today) {
              displayStats.total_montant += localStats.pending_amount_today;
              displayStats.nombre_ventes += localStats.ventes_pending_count;
              displayStats.benefice += localStats.pending_amount_today;
        }
      } else {
        displayStats.nombre_ventes = localStats.nombre_ventes;
        displayStats.total_montant = localStats.total_montant;
      }
      const dbInfo = await getDBStats();
      setUnifiedStats(displayStats);
      setDbStats(dbInfo);
    } catch (error) { console.error('Erreur chargement dashboard:', error); } finally { setLoading(false); }
  };

  const handleSync = async () => {
    setSyncStatus('SYNCING'); setSyncError(null);
    try {
      const result = await syncFull((progress) => { console.log("Sync:", progress); });
      if (result.success) { setSyncStatus('SUCCESS'); await loadDashboardData(); setTimeout(() => setSyncStatus('IDLE'), 3000); }
      else { setSyncStatus('ERROR'); setSyncError("Échec sync partielle"); await loadDashboardData(); }
    } catch (e) { setSyncStatus('ERROR'); setSyncError(e.message || "Erreur inconnue"); }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass, subtext }) => (
    <div className="stat-card">
      <div className={`icon-wrapper ${colorClass}`}><Icon size={24} /></div>
      <div className="stat-content">
        <h3>{title}</h3>
        <p className="stat-value">{loading ? <span className="loading-pulse"></span> : value}</p>
        {subtext && <span className="stat-subtext">{subtext}</span>}
      </div>
    </div>
  );

  const ActionButton = ({ to, icon: Icon, title, color = "blue" }) => (
    <Link to={to} className={`action-btn hover-${color}`}>
      <div className="action-icon-box"><Icon size={22} /></div>
      <span className="action-title">{title}</span>
      <ChevronRight size={16} className="arrow-icon" />
    </Link>
  );

  const NavItem = ({ to, icon: Icon, title, active = false }) => (
    <Link to={to} className={`nav-item ${active ? 'active' : ''}`}>
      <Icon size={20} /><span>{title}</span>
    </Link>
  );

  const isAboExpired = (abo) => {
    if (!abo) return false;
    if (abo.is_expired) return true;
    if (abo.date_fin) return new Date(abo.date_fin) < new Date();
    return false;
  };

  if (checkingPermissions) return <LoadingScreen />;
  if (!hasPermission && isOnline) return <AccessDenied userRole={userRole} />;

  return (
    <div className="dashboard-container">
      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="app-title">Gestion Stock</h2>
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)}>×</button>
        </div>
        <nav className="sidebar-nav">
          <NavItem to="/dashboard" icon={LayoutDashboard} title="Tableau de bord" active={true} />
          <NavItem to="/ventes" icon={ShoppingCart} title="Ventes" />
          <NavItem to="/produits" icon={Package} title="Produits" />
          <NavItem to="/clients" icon={Users} title="Clients" />
          {isVendeur ? (
            <NavItem to="/historique-mes-ventes" icon={History} title="Mon Historique" />
          ) : (
            <>
              <NavItem to="/boutiques" icon={Store} title="Boutiques" />
              <NavItem to="/historique-ventes" icon={FileText} title="Historique" />
              <NavItem to="/depenses" icon={CreditCard} title="Dépenses" />
              <NavItem to="/entrees-marchandise" icon={Download} title="Entrées Stock" />
              <NavItem to="/fournisseurs" icon={Truck} title="Fournisseurs" />
              <NavItem to="/export" icon={Database} title="Exports" />
              <NavItem to="/rapports" icon={TrendingUp} title="Rapports" />
              <NavItem to="/utilisateurs" icon={UserCog} title="Équipe" />
            </>
          )}
          {isGerant && <NavItem to="/abonnement" icon={Store} title="Abonnement" />}
        </nav>
        <div className="sidebar-footer">
          <button onClick={() => { logout(); navigate('/login'); }} className="btn-logout-sidebar">
            <LogOut size={18} /><span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <div className="main-content">
        {/* === HEADER === */}
        <header className="main-header">
          <div className="header-content">
            <div className="header-left">
              <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
              <div className="user-info-group">
                <h1 className="greeting">
                    Bonjour, <span className="username">{profil?.username || 'Utilisateur'}</span>
                </h1>
                <span className="badge-role">{isGerant ? 'Gérant' : isAdmin ? 'Admin' : 'Vendeur'}</span>
              </div>
            </div>

            <button onClick={() => { logout(); navigate('/login'); }} className="btn-logout">
              <LogOut size={18} /><span className="logout-text">Quitter</span>
            </button>
          </div>
        </header>

        <div className="scroll-content">
          <div className="dashboard-wrapper">

            {/* BANNIÈRE ABONNEMENT */}
            {abonnement && (isGerant || isAdmin) && (
              <div className={`alert-banner ${isAboExpired(abonnement) ? 'expired' : abonnement.type_abonnement === 'GRATUIT' ? 'warning' : 'premium'}`}>
                {isAboExpired(abonnement) ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                <div className="alert-text">
                  <strong>{isAboExpired(abonnement) ? `Abonnement ${abonnement.type_abonnement} EXPIRÉ` : `Plan ${abonnement.type_abonnement}`}</strong>
                  {abonnement.date_fin && <span className="alert-date">• {isAboExpired(abonnement) ? "A expiré le " : "Expire le "}{new Date(abonnement.date_fin).toLocaleDateString()}</span>}
                </div>
                {isAboExpired(abonnement) && <Link to="/abonnement" className="btn-renew-banner">Renouveler</Link>}
              </div>
            )}

            {/* HEADER ACTIONS (SYNC) */}
            <div className="actions-header">
                <h2 className="section-title">Aperçu Aujourd'hui</h2>
                <div className="sync-wrapper">
                    <SyncStatus
                        isOnline={isOnline} lastSync={dbStats?.last_sync} status={syncStatus}
                        error={syncError} onRetry={handleSync} pendingCount={unifiedStats.ventes_pending_count}
                    />
                </div>
            </div>

            <section className="stats-section">
              <StatCard title={isVendeur ? "C.A. (7j)" : "Chiffre d'Affaires"} value={`${unifiedStats.total_montant.toLocaleString()} FCFA`} icon={Wallet} colorClass="bg-indigo" />
              <StatCard title="Ventes" value={unifiedStats.nombre_ventes} icon={ShoppingCart} colorClass="bg-emerald" subtext={unifiedStats.ventes_pending_count > 0 ? `${unifiedStats.ventes_pending_count} en attente` : null} />
              {!isVendeur && (
                <StatCard title="Bénéfice Net" value={`${unifiedStats.benefice.toLocaleString()} FCFA`} icon={TrendingUp} colorClass={unifiedStats.benefice >= 0 ? "bg-green" : "bg-red"} />
              )}
              <StatCard title="Stock Total" value={dbStats?.produits || 0} icon={Package} colorClass="bg-orange" />
            </section>

            <section className="actions-section">
              <h2 className="section-title">Actions Rapides</h2>
              <div className="actions-grid">
                <ActionButton to="/ventes" icon={ShoppingCart} title="Nouvelle Vente" color="primary" />
                <ActionButton to="/produits" icon={Package} title="Produits" color="purple" />
                <ActionButton to="/clients" icon={Users} title="Clients" color="blue" />
                {isVendeur && <ActionButton to="/historique-mes-ventes" icon={History} title="Mon Historique" color="orange" />}
                {!isVendeur && (
                  <>
                    <ActionButton to="/historique-ventes" icon={FileText} title="Historique" color="indigo" />
                    <ActionButton to="/boutiques" icon={Store} title="Boutiques" color="pink" />
                    <ActionButton to="/depenses" icon={CreditCard} title="Dépenses" color="red" />
                    <ActionButton to="/entrees-marchandise" icon={Download} title="Entrées Stock" color="cyan" />
                    <ActionButton to="/fournisseurs" icon={Truck} title="Fournisseurs" color="teal" />
                    <ActionButton to="/export" icon={Database} title="Exports & Données" color="dark" />
                    <ActionButton to="/rapports" icon={TrendingUp} title="Rapports" color="green" />
                    <ActionButton to="/utilisateurs" icon={UserCog} title="Équipe" color="gray" />
                  </>
                )}
                {isGerant && <ActionButton to="/abonnement" icon={Store} title="Abonnement" color="gold" />}
              </div>
            </section>
          </div>
        </div>
      </div>

      <nav className="glass-nav">
        <Link to="/dashboard" className="nav-item active"><LayoutDashboard size={22} /><span>Accueil</span></Link>
        <Link to="/ventes" className="nav-item"><ShoppingCart size={22} /><span>Vente</span></Link>
        <Link to="/produits" className="nav-item"><Package size={22} /><span>Stock</span></Link>
        {isVendeur ? (
          <Link to="/historique-mes-ventes" className="nav-item"><History size={22} /><span>Histo</span></Link>
        ) : (
          <Link to="/rapports" className="nav-item"><TrendingUp size={22} /><span>Stats</span></Link>
        )}
      </nav>

      {/* === CSS === */}
      <style jsx>{`
        :global(body) {
          margin: 0;
          font-family: 'Inter', sans-serif;
          background-color: #f8fafc;
          color: #1e293b;
          overflow-x: hidden; /* Empêche le scroll horizontal */
        }
        .dashboard-container {
          display: flex;
          height: 100vh;
          overflow: hidden;
          width: 100vw; /* Largeur fixe pour éviter l'espace à droite */
        }

        /* SIDEBAR */
        .sidebar { width: 260px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; flex-shrink: 0; transition: transform 0.3s ease; z-index: 100; }
        .sidebar-header { padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .app-title { margin: 0; font-size: 1.2rem; font-weight: 700; color: #4f46e5; }
        .close-sidebar { display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
        .sidebar-nav { flex: 1; padding: 20px 0; overflow-y: auto; }
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 20px; text-decoration: none; color: #64748b; font-weight: 500; transition: all 0.2s; }
        .nav-item:hover { background: #f8fafc; color: #4f46e5; }
        .nav-item.active { background: #eef2ff; color: #4f46e5; border-left: 3px solid #4f46e5; }
        .sidebar-footer { padding: 20px; border-top: 1px solid #e2e8f0; }
        .btn-logout-sidebar { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px; background: #fee2e2; color: #ef4444; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; }

        /* MAIN CONTENT */
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          width: 100%; /* Largeur complète */
          max-width: 100%; /* Largeur maximale */
        }
        .main-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 12px 0; flex-shrink: 0; z-index: 10; }
        .header-content { max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; }

        /* HEADER GAUCHE DESKTOP */
        .header-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .user-info-group { display: flex; align-items: center; gap: 10px; overflow: hidden; white-space: nowrap; }
        .menu-toggle { display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; padding: 0; }
        .greeting { margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; overflow: hidden; text-overflow: ellipsis; }
        .username { color: #4f46e5; }
        .badge-role { background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; flex-shrink: 0; }

        /* BOUTON LOGOUT DESKTOP */
        .btn-logout { display: flex; align-items: center; gap: 8px; background: #fee2e2; color: #ef4444; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: background 0.2s; flex-shrink: 0; margin-left: 10px; }
        .btn-logout:hover { background: #fecaca; }

        .scroll-content {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 100px;
          -webkit-overflow-scrolling: touch;
          overflow-x: hidden; /* Empêche le scroll horizontal */
        }
        .dashboard-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          width: 100%; /* Largeur complète */
          box-sizing: border-box; /* Inclut le padding dans la largeur */
        }

        /* HEADER ACTIONS DESKTOP */
        .actions-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        .section-title { font-size: 1.1rem; font-weight: 700; color: #334155; margin: 0; }

        /* ALERTS */
        .alert-banner { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border-radius: 12px; margin-bottom: 20px; font-size: 0.9rem; line-height: 1.5; }
        .alert-banner.warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
        .alert-banner.premium { background: #eff6ff; color: #1e40af; border: 1px solid #dbeafe; }
        .alert-banner.expired { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
        .alert-text { flex: 1; }
        .btn-renew-banner { background: #dc2626; color: white; padding: 6px 14px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.8rem; white-space: nowrap; transition: 0.2s; margin-top: 4px; }

        /* GRILLES DESKTOP */
        .stats-section { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
        .stat-card { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); display: flex; align-items: center; gap: 16px; border: 1px solid #f1f5f9; transition: transform 0.2s; }
        .icon-wrapper { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .bg-indigo { background: linear-gradient(135deg, #6366f1, #4f46e5); }
        .bg-emerald { background: linear-gradient(135deg, #34d399, #10b981); }
        .bg-green { background: linear-gradient(135deg, #22c55e, #16a34a); }
        .bg-red { background: linear-gradient(135deg, #f87171, #ef4444); }
        .bg-orange { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
        .stat-content h3 { margin: 0; font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
        .stat-value { margin: 4px 0 0 0; font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .stat-subtext { font-size: 0.7rem; color: #d97706; background: #fffbeb; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; }
        .loading-pulse { display: block; width: 50px; height: 20px; background: #e2e8f0; border-radius: 4px; }

        .actions-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .action-btn { background: white; padding: 20px; border-radius: 14px; display: flex; align-items: center; gap: 12px; text-decoration: none; border: 1px solid #e2e8f0; transition: transform 0.2s; color: inherit; }
        .action-icon-box { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .hover-primary .action-icon-box { background: #eff6ff; color: #3b82f6; }
        .hover-purple .action-icon-box { background: #f3e8ff; color: #a855f7; }
        .hover-blue .action-icon-box { background: #e0f2fe; color: #0ea5e9; }
        .hover-orange .action-icon-box { background: #ffedd5; color: #f97316; }
        .hover-indigo .action-icon-box { background: #e0e7ff; color: #6366f1; }
        .hover-red .action-icon-box { background: #fee2e2; color: #ef4444; }
        .hover-cyan .action-icon-box { background: #cffafe; color: #06b6d4; }
        .hover-teal .action-icon-box { background: #ccfbf1; color: #14b8a6; }
        .hover-green .action-icon-box { background: #dcfce7; color: #22c55e; }
        .hover-gray .action-icon-box { background: #f1f5f9; color: #64748b; }
        .hover-gold .action-icon-box { background: #fef9c3; color: #ca8a04; }
        .hover-pink .action-icon-box { background: #fce7f3; color: #db2777; }
        .hover-dark .action-icon-box { background: #334155; color: #f8fafc; }
        .action-title { font-size: 0.9rem; font-weight: 500; color: #475569; flex: 1; }
        .arrow-icon { color: #cbd5e1; }
        .glass-nav { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 8px 30px; border-radius: 30px; display: flex; gap: 30px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.05); z-index: 100; }

        @media (max-width: 1024px) {
            .stats-section { grid-template-columns: repeat(2, 1fr); }
            .actions-grid { grid-template-columns: repeat(3, 1fr); }
        }

        /* === MOBILE RESPONSIVE FIXES === */
        @media (max-width: 768px) {
            .sidebar { position: fixed; left: 0; top: 0; height: 100%; width: 260px; transform: translateX(-100%); box-shadow: 4px 0 10px rgba(0, 0, 0, 0.1); z-index: 200; }
            .sidebar.mobile-open { transform: translateX(0); }
            .close-sidebar, .menu-toggle { display: block; }

            /* Centrage du contenu principal */
            .main-content {
              width: 100%;
              max-width: 100vw;
              overflow-x: hidden;
            }
            .main-header {
              width: 100%;
              max-width: 100%;
            }
            .scroll-content {
              width: 100%;
              padding-left: 0;
              padding-right: 0;
              overflow-x: hidden;
            }
            .dashboard-wrapper {
                padding: 16px 8px;
                max-width: 100%;
                width: 100%;
                margin: 0;
                box-sizing: border-box;
            }

            /* Fix Header Mobile - Disposition optimale */
            .header-content {
                padding: 0 12px;
                gap: 8px;
                max-width: 100%;
                width: 100%;
                box-sizing: border-box;
            }

            .header-left {
                gap: 8px;
                flex: 1;
                min-width: 0;
                overflow: hidden;
                order: 2;
            }

            .user-info-group {
                gap: 6px;
                flex: 1;
                min-width: 0;
                display: flex;
                align-items: center;
            }

            .greeting {
                font-size: 0.9rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex: 1;
                min-width: 0;
            }

            .username {
                display: inline;
            }

            .badge-role {
                font-size: 0.65rem;
                padding: 2px 6px;
                flex-shrink: 0;
            }

            .logout-text { display: none; }

            /* Bouton déconnexion à gauche */
            .btn-logout {
                padding: 8px;
                border-radius: 8px;
                width: 36px;
                height: 36px;
                flex-shrink: 0;
                justify-content: center;
                margin: 0;
                order: 1;
            }

            /* Fix Centrage Sync Widget & Title */
            .actions-header {
                flex-direction: column;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
                width: 100%;
            }

            .section-title {
                width: 100%;
                text-align: center;
                font-size: 1rem;
            }

            .sync-wrapper {
                width: 100%;
                display: flex;
                justify-content: center;
            }

            .sync-widget {
                font-size: 0.85rem;
                padding: 6px 10px;
                max-width: 90%;
            }

            /* Fix Grilles - Centrage parfait */
            .stats-section {
                grid-template-columns: 1fr;
                gap: 12px;
                width: 100%;
                max-width: 100%;
                padding: 0;
            }

            .stat-card {
                padding: 16px;
                margin: 0;
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
            }

            .actions-section {
                width: 100%;
                max-width: 100%;
                padding: 0;
            }

            .actions-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
                width: 100%;
                max-width: 100%;
                padding: 0;
            }

            .action-btn {
                flex-direction: column;
                text-align: center;
                padding: 16px 8px;
                gap: 8px;
                align-items: center;
                width: 100%;
                box-sizing: border-box;
            }

            .action-title {
                font-size: 0.8rem;
                line-height: 1.2;
                text-align: center;
            }

            .action-icon-box {
                width: 40px;
                height: 40px;
            }

            .arrow-icon { display: none; }

            /* Nav Mobile */
            .glass-nav {
                width: 100%;
                bottom: 0;
                left: 0;
                transform: none;
                border-radius: 0;
                justify-content: space-around;
                padding: 12px 0;
                border-top: 1px solid #e2e8f0;
                gap: 0;
                background: white;
                max-width: 100vw;
                box-sizing: border-box;
            }

            .glass-nav .nav-item {
                flex-direction: column;
                gap: 4px;
                font-size: 0.7rem;
                padding: 0;
                min-width: 60px;
                align-items: center;
            }

            .scroll-content { padding-bottom: 80px; }

            .alert-banner {
                flex-direction: column;
                align-items: flex-start;
                padding: 12px;
                gap: 8px;
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
            }

            .alert-text {
                font-size: 0.85rem;
            }

            .btn-renew-banner {
                margin-top: 0;
                align-self: flex-start;
            }
        }

        /* Extra small screens */
        @media (max-width: 360px) {
            .greeting { font-size: 0.85rem; }
            .badge-role { font-size: 0.6rem; padding: 2px 5px; }
            .btn-logout { width: 32px; height: 32px; padding: 6px; }
            .header-content { padding: 0 8px; }
            .dashboard-wrapper { padding: 12px 8px; }
            .actions-grid { gap: 8px; }
            .action-btn { padding: 10px 8px; }
        }
      `}</style>
    </div>
  );
}