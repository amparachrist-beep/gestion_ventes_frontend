import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../auth';
import { abonnementAPI, venteAPI, profilAPI, dashboardAPI } from '../api';
import { syncFull } from '../offline_sync';
import {
  getDashboardUnifiedStats,
  getDepensesStats,
  saveVentesSynced,
  getDBStats
} from '../db';
import {
  LayoutDashboard, ShoppingCart, Package, Users,
  TrendingUp, Wallet, LogOut, RefreshCw,
  History, Truck, Store, FileText, UserCog,
  Download, CreditCard, AlertCircle, ChevronRight,
  CheckCircle, Wifi, WifiOff, CloudUpload, Database, ArrowLeft
} from 'lucide-react';

// =====================================================
// 🔒 COMPOSANT DE VÉRIFICATION DE PERMISSION
// À utiliser dans toutes vos pages protégées
// =====================================================

/**
 * Hook personnalisé pour vérifier les permissions
 */
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

/**
 * Composant d'écran de chargement
 */
export const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="spinner"></div>
    <p>Vérification des permissions...</p>
    <style jsx>{`
      .loading-screen {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 80vh;
        font-family: system-ui, -apple-system, sans-serif;
        color: #64748b;
      }
      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e2e8f0;
        border-top: 3px solid #4f46e5;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 15px;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

/**
 * Composant d'accès refusé
 */
export const AccessDenied = ({ userRole, requiredRoles = ['gérant', 'admin'] }) => (
  <div className="access-denied">
    <div className="denied-icon">
      <AlertCircle size={48} />
    </div>
    <h2>Accès Refusé</h2>
    <p>
      Cette page nécessite les permissions: <strong>{requiredRoles.join(', ')}</strong>
    </p>
    {userRole && (
      <p className="role-info">Votre rôle actuel: <strong>{userRole}</strong></p>
    )}
    <button onClick={() => window.location.href = '/login'} className="back-btn">
      <ArrowLeft size={16} /> Retour à la connexion
    </button>
    <style jsx>{`
      .access-denied {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 80vh;
        font-family: system-ui, -apple-system, sans-serif;
        color: #64748b;
        text-align: center;
        padding: 20px;
      }
      .denied-icon {
        width: 80px;
        height: 80px;
        background: #fee2e2;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
        color: #ef4444;
      }
      h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 10px 0;
      }
      p {
        margin: 0 0 10px 0;
        max-width: 400px;
      }
      .role-info {
        color: #64748b;
        font-size: 0.875rem;
        margin-bottom: 20px;
      }
      .back-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #4f46e5;
        color: white;
        text-decoration: none;
        padding: 10px 16px;
        border-radius: 8px;
        font-weight: 500;
        transition: background 0.2s;
        border: none;
        cursor: pointer;
      }
      .back-btn:hover {
        background: #4338ca;
      }
    `}</style>
  </div>
);

// =====================================================
// FIN DU COMPOSANT DE VÉRIFICATION
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
  else if (status === 'SYNCING') { containerClass += " syncing"; Icon = RefreshCw; label = "Synchronisation..."; }
  else if (status === 'ERROR') { containerClass += " error"; Icon = AlertCircle; label = "Erreur Sync"; }
  else { containerClass += " success"; }

  return (
    <div className={containerClass}>
      <div className="icon-box"><Icon size={16} className={status === 'SYNCING' ? 'spin' : ''} /></div>
      <div className="info-box"><span className="status-label">{label}</span><span className="last-sync">{formatDate(lastSync)}</span></div>
      {pendingCount > 0 && (<div className="pending-badge" title={`${pendingCount} ventes non envoyées`}><CloudUpload size={12} /><span>{pendingCount}</span></div>)}
      {status === 'ERROR' && isOnline && (<button className="retry-btn" onClick={onRetry} onMouseEnter={() => setShowError(true)} onMouseLeave={() => setShowError(false)}><RefreshCw size={14} /></button>)}
      {showError && error && <div className="error-tooltip">{error}</div>}
      <style jsx>{`
        .sync-widget { display: flex; align-items: center; gap: 10px; padding: 6px 12px; border-radius: 30px; background: white; border: 1px solid #e2e8f0; transition: all 0.3s ease; position: relative; }
        .sync-widget.success { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
        .sync-widget.syncing { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
        .sync-widget.error { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
        .sync-widget.offline { background: #f1f5f9; border-color: #e2e8f0; color: #64748b; }
        .icon-box { display: flex; align-items: center; }
        .info-box { display: flex; flex-direction: column; line-height: 1; }
        .status-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
        .last-sync { font-size: 0.75rem; font-family: 'Monaco', monospace; opacity: 0.8; }
        .pending-badge { background: #f97316; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(249, 115, 22, 0.2); }
        .retry-btn { background: white; border: 1px solid currentColor; color: inherit; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.8; transition: 0.2s; }
        .retry-btn:hover { opacity: 1; transform: scale(1.1); }
        .error-tooltip { position: absolute; top: 110%; right: 0; background: #1e293b; color: white; padding: 6px 10px; border-radius: 6px; font-size: 0.75rem; white-space: nowrap; z-index: 50; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default function Dashboard({ isOnline }) {
  // --- 1. VÉRIFICATION PERMISSION (Accessible à tous les rôles connectés) ---
  const { loading: checkingPermissions, hasPermission, userRole } = usePermissionCheck(['gerant', 'admin', 'vendeur', 'caissier']);

  const [unifiedStats, setUnifiedStats] = useState({
    nombre_ventes: 0,
    total_montant: 0,
    total_depenses: 0,
    benefice: 0,
    ventes_pending_count: 0
  });

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
    // On charge le profil dès qu'on a la permission
    if (hasPermission) {
      const fetchProfil = async () => {
        try {
          const res = await profilAPI.me();
          setProfil(res.data);
        } catch (err) {
          console.error("Erreur profil", err);
          if(err.response?.status === 401) logout();
        }
      };
      fetchProfil();
    }
  }, [hasPermission]);

  useEffect(() => {
    if (profil) {
      loadDashboardData();
    }
  }, [profil, isOnline]);

  // ✅ CORRECTION MAJEURE ICI : Auto-Sync au retour de connexion
  useEffect(() => {
    if (isOnline && profil) {
      console.log("🟢 Connexion détectée - Lancement auto-sync...");
      handleSync();
    }
  }, [isOnline, profil]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      let statsData = {
        nombre_ventes: 0,
        total_montant: 0,
        total_depenses: 0,
        benefice: 0,
        ventes_pending_count: 0
      };

      // Toujours récupérer le compte en attente depuis la DB locale
      if (profil?.id) {
        const localStats = await getDashboardUnifiedStats(profil.id);
        statsData.ventes_pending_count = localStats.ventes_pending_count;
      }

      if (isOnline) {
        try {
          const serverStatsRes = await dashboardAPI.getStats();
          const serverData = serverStatsRes.data;

          statsData = {
            ...statsData, // Garder le pending count local
            nombre_ventes: serverData.ventes.today.count,
            total_montant: serverData.ventes.today.total,
            total_depenses: serverData.depenses.today,
            benefice: serverData.benefices.today,
          };

          if (isGerant || isAdmin) {
            const aboRes = await abonnementAPI.current();
            setAbonnement(aboRes.data);
          }

          // Background Sync pour garder la DB locale à jour
          venteAPI.list().then(res => {
             const ventesList = Array.isArray(res.data) ? res.data : (res.data.results || []);
             saveVentesSynced(ventesList);
          }).catch(err => console.warn("Background sync failed", err));

        } catch (err) {
          console.error("Erreur chargement stats serveur:", err);
        }
      }

      // Si hors ligne ou serveur fail ou montant 0 (possiblement pas à jour)
      if (!isOnline || statsData.total_montant === 0) {
        const localStats = await getDashboardUnifiedStats(profil?.id);

        if (!isOnline) {
            const depenses = await getDepensesStats();
            const totalDepenses = isVendeur ? 0 : (depenses.total || 0);

            statsData.nombre_ventes = localStats.nombre_ventes;
            statsData.total_montant = localStats.total_montant;
            statsData.total_depenses = totalDepenses;
            statsData.benefice = localStats.total_montant - totalDepenses;
        }
      }

      const dbInfo = await getDBStats();
      setUnifiedStats(statsData);
      setDbStats(dbInfo);

    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncStatus('SYNCING');
    setSyncError(null);
    try {
      // ✅ Synchronisation complète (envoie local -> serveur)
      const result = await syncFull((progress) => { console.log("Sync:", progress); });

      if (result.success) {
        setSyncStatus('SUCCESS');
        // ✅ Recharger les données après le succès pour voir les vrais chiffres
        await loadDashboardData();
        setTimeout(() => setSyncStatus('IDLE'), 3000);
      } else {
        setSyncStatus('ERROR');
        setSyncError("Échec sync partielle");
        // Même en cas d'erreur partielle, on recharge pour voir ce qui est passé
        await loadDashboardData();
      }
    } catch (e) {
      setSyncStatus('ERROR');
      setSyncError(e.message || "Erreur inconnue");
    }
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

  // --- 3. RENDER PERMISSION ---
  if (checkingPermissions) return <LoadingScreen />;
  // Note: Ici on vérifie le rôle global, mais comme tous les rôles ont accès au dashboard,
  // on redirige seulement si pas de rôle du tout (non connecté/erreur)
  if (!hasPermission && isOnline) return <AccessDenied userRole={userRole} />;

  return (
    <div className="dashboard-container">
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
        <header className="main-header">
          <div className="header-content">
            <div className="header-left">
              <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
              <h1 className="greeting">Bonjour, <span className="username">{profil?.username || 'Utilisateur'}</span></h1>
              <span className="badge-role">{isGerant ? 'Gérant' : isAdmin ? 'Admin' : 'Vendeur'}</span>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} className="btn-logout">
              <LogOut size={18} /><span className="logout-text">Quitter</span>
            </button>
          </div>
        </header>

        <div className="scroll-content">
          <div className="dashboard-wrapper">

            {/* ✅ BANNIÈRE INTELLIGENTE */}
            {abonnement && (isGerant || isAdmin) && (
              <div className={`alert-banner ${
                isAboExpired(abonnement) ? 'expired'
                : abonnement.type_abonnement === 'GRATUIT' ? 'warning'
                : 'premium'
              }`}>
                {isAboExpired(abonnement) ? <AlertCircle size={20} /> : <CheckCircle size={20} />}

                <div className="alert-text">
                  <strong>
                    {isAboExpired(abonnement)
                      ? `Abonnement ${abonnement.type_abonnement} EXPIRÉ`
                      : `Plan ${abonnement.type_abonnement}`
                    }
                  </strong>
                  {abonnement.date_fin && (
                    <span className="alert-date">
                      • {isAboExpired(abonnement) ? "A expiré le " : "Expire le "}
                      {new Date(abonnement.date_fin).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {isAboExpired(abonnement) && (
                   <Link to="/abonnement" className="btn-renew-banner">
                     Renouveler
                   </Link>
                )}
              </div>
            )}

            <div className="actions-header">
                <h2 className="section-title">Aperçu Aujourd'hui</h2>
                <SyncStatus
                    isOnline={isOnline} lastSync={dbStats?.last_sync} status={syncStatus}
                    error={syncError} onRetry={handleSync} pendingCount={unifiedStats.ventes_pending_count}
                />
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

      <style jsx>{`
        :global(body) { margin: 0; font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #1e293b; }
        .dashboard-container { display: flex; height: 100vh; overflow: hidden; }
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
        .btn-logout-sidebar:hover { background: #fecaca; }
        .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .main-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 16px 0; flex-shrink: 0; z-index: 10; }
        .header-content { max-width: 1200px; margin: 0 auto; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .menu-toggle { display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
        .greeting { margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
        .badge-role { align-self: flex-start; background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
        .btn-logout { display: flex; align-items: center; gap: 8px; background: #fee2e2; color: #ef4444; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
        .btn-logout:hover { background: #fecaca; }
        .scroll-content { flex: 1; overflow-y: auto; padding-bottom: 100px; -webkit-overflow-scrolling: touch; }
        .dashboard-wrapper { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .actions-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .section-title { font-size: 1.1rem; font-weight: 700; color: #334155; margin: 0; }
        .alert-banner { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; border-radius: 12px; margin-bottom: 20px; font-size: 0.9rem; line-height: 1.5; }
        .alert-banner.warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
        .alert-banner.premium { background: #eff6ff; color: #1e40af; border: 1px solid #dbeafe; }
        .alert-banner.expired { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
        .alert-text { flex: 1; }
        .btn-renew-banner { background: #dc2626; color: white; padding: 6px 14px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.8rem; white-space: nowrap; transition: 0.2s; margin-top: 4px; }
        .btn-renew-banner:hover { background: #b91c1c; }
        .stats-section { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
        .stat-card { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); display: flex; align-items: center; gap: 16px; border: 1px solid #f1f5f9; transition: transform 0.2s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
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
        .action-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
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
        .nav-item { display: flex; flex-direction: column; align-items: center; text-decoration: none; color: #94a3b8; font-size: 0.7rem; font-weight: 500; gap: 4px; }
        .nav-item.active { color: #4f46e5; }
        @media (max-width: 1024px) { .stats-section { grid-template-columns: repeat(2, 1fr); } .actions-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px) { .sidebar { position: fixed; left: 0; top: 0; height: 100%; transform: translateX(-100%); box-shadow: 4px 0 10px rgba(0, 0, 0, 0.1); } .sidebar.mobile-open { transform: translateX(0); } .close-sidebar, .menu-toggle { display: block; } .dashboard-wrapper { padding: 16px; } .greeting { font-size: 1.1rem; } .logout-text, .arrow-icon { display: none; } .btn-logout { padding: 8px; border-radius: 50%; aspect-ratio: 1; } .stats-section { grid-template-columns: 1fr; gap: 12px; } .stat-card { padding: 16px; } .actions-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } .action-btn { flex-direction: column; text-align: center; padding: 12px 8px; gap: 8px; } .action-title { font-size: 0.8rem; line-height: 1.2; } .action-icon-box { margin-bottom: 4px; } .glass-nav { width: 100%; bottom: 0; left: 0; transform: none; border-radius: 0; justify-content: space-around; padding: 12px 0; border-top: 1px solid #e2e8f0; gap: 0; background: white; } .scroll-content { padding-bottom: 80px; } .alert-banner { align-items: flex-start; } .btn-renew-banner { margin-top: 4px; } }
      `}</style>
    </div>
  );
}