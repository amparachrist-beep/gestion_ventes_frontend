import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { venteAPI, produitAPI, profilAPI, boutiqueAPI, userAPI, clientAPI } from '../api';
import {
  ArrowLeft, Search, Calendar, User, Package,
  Eye, Printer, TrendingUp, DollarSign, ShoppingBag,
  FilterX, ChevronRight, Store, ChevronLeft, Download, AlertCircle
} from 'lucide-react';

export default function HistoriqueVentes({ isOnline }) {
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasFilters, setHasFilters] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  const [filter, setFilter] = useState({
    date_debut: '',
    date_fin: '',
    client: '',
    produit: '',
    vendeur: ''
  });

  const [selectedVente, setSelectedVente] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadCurrentUserRole();
  }, []);

  useEffect(() => {
    if (currentUserRole !== null) {
      loadData();
    }
  }, [isOnline, page, currentUserRole]);

  const loadCurrentUserRole = async () => {
    try {
      const response = await profilAPI.me();
      setCurrentUserRole(response.data.role);
    } catch (error) {
      console.error('Erreur chargement rôle:', error);
      setCurrentUserRole('gerant'); // Fallback
    }
  };

  const loadData = async (isLoadMore = false) => {
    if (!isOnline) {
      setError('❌ Connexion Internet requise');
      setLoading(false);
      return;
    }

    if (!isLoadMore) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const params = {
        page,
        page_size: pageSize,
        ...filter
      };

      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      console.log('📊 Chargement historiques avec params:', params);

      const [ventesRes] = await Promise.all([
        venteAPI.list({ params })
      ]);

      let rawVentes = [];
      let count = 0;

      if (ventesRes.data) {
        if (Array.isArray(ventesRes.data)) {
          rawVentes = ventesRes.data;
          count = ventesRes.data.length;
        } else if (ventesRes.data.results) {
          rawVentes = ventesRes.data.results;
          count = ventesRes.data.count || ventesRes.data.results.length;
        } else if (ventesRes.data.ventes) {
          rawVentes = ventesRes.data.ventes;
          count = ventesRes.data.count || ventesRes.data.ventes.length;
        }
      }

      console.log(`📈 ${rawVentes.length} ventes chargées`);

      const ventesEnrichies = await enrichirVentes(rawVentes);

      const ventesTriees = ventesEnrichies.sort((a, b) =>
        new Date(b.date_heure) - new Date(a.date_heure)
      );

      if (isLoadMore) {
        setVentes(prev => [...prev, ...ventesTriees]);
      } else {
        setVentes(ventesTriees);
      }

      setTotalCount(count);

    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      setError('Impossible de charger l\'historique des ventes.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const enrichirVentes = async (rawVentes) => {
    if (!rawVentes.length) return [];

    try {
      const produitIds = [...new Set(rawVentes.map(v => v.produit).filter(Boolean))];
      const boutiqueIds = [...new Set(rawVentes.map(v => v.boutique).filter(Boolean))];
      const userIds = [...new Set(rawVentes.map(v => v.utilisateur).filter(Boolean))];
      const clientIds = [...new Set(rawVentes.map(v => v.client).filter(Boolean))];

      const [produitsRes, boutiquesRes, usersRes, clientsRes] = await Promise.all([
        produitIds.length ? produitAPI.list({ params: { ids: produitIds.join(',') } }) : Promise.resolve({ data: [] }),
        boutiqueIds.length ? boutiqueAPI.list({ params: { ids: boutiqueIds.join(',') } }) : Promise.resolve({ data: [] }),
        userIds.length ? userAPI.list({ params: { ids: userIds.join(',') } }) : Promise.resolve({ data: [] }),
        clientIds.length ? clientAPI.list({ params: { ids: clientIds.join(',') } }) : Promise.resolve({ data: [] })
      ]);

      const produitsMap = {};
      (Array.isArray(produitsRes.data) ? produitsRes.data : produitsRes.data?.results || []).forEach(p => {
        produitsMap[p.id] = p;
      });

      const boutiquesMap = {};
      (Array.isArray(boutiquesRes.data) ? boutiquesRes.data : boutiquesRes.data?.results || []).forEach(b => {
        boutiquesMap[b.id] = b;
      });

      const usersMap = {};
      (Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.results || []).forEach(u => {
        usersMap[u.id] = u;
      });

      const clientsMap = {};
      (Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data?.results || []).forEach(c => {
        clientsMap[c.id] = c;
      });

      // ✅ ENRICHIR CHAQUE VENTE
      return rawVentes.map(vente => {
        const produit = produitsMap[vente.produit];
        const boutique = boutiquesMap[vente.boutique];
        const user = usersMap[vente.utilisateur];
        const client = clientsMap[vente.client];

        // ✅ RECUPÉRATION DIRECTE DES CHIFFRES (Plus de calculs hasardeux)
        const montantTotal = parseFloat(vente.montant_total) || 0;
        const quantite = parseInt(vente.quantite) || 1;

        // On utilise la marge envoyée par le backend, sinon fallback sur calcul
        const prixAchatTotal = parseFloat(vente.cout_achat_total) || 0;
        const benefice = parseFloat(vente.marge_brute) || (montantTotal - prixAchatTotal);

        // ✅ NOMS AFFICHÉS
        const produitNom = produit ? produit.nom : (vente.produit_nom || 'Produit supprimé');
        const boutiqueNom = boutique ? boutique.nom : (vente.boutique_nom || 'N/A');
        const utilisateurNom = user ?
          (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username)
          : (vente.vendeur_nom || 'Inconnu');
        const clientNom = client ? client.nom : (vente.client_nom || 'Client Comptoir');

        return {
          ...vente,
          prix_achat_unitaire: prixAchatTotal / quantite, // Juste pour l'affichage détail
          montant_total: montantTotal,
          quantite,
          benefice, // ✅ C'est maintenant la valeur correcte du backend
          produit_nom: produitNom,
          boutique_nom: boutiqueNom,
          utilisateur_nom: utilisateurNom,
          client_nom: clientNom,
          produit_obj: produit,
          boutique_obj: boutique,
          utilisateur_obj: user,
          client_obj: client
        };
      });

    } catch (error) {
      console.error('❌ Erreur enrichissement:', error);
      return rawVentes.map(vente => ({
        ...vente,
        prix_achat_unitaire: 0,
        montant_total: parseFloat(vente.montant_total) || 0,
        quantite: parseInt(vente.quantite) || 1,
        benefice: 0,
        produit_nom: 'Produit',
        boutique_nom: 'Boutique',
        utilisateur_nom: 'Vendeur',
        client_nom: vente.client_nom || 'Client Comptoir'
      }));
    }
  };

  const loadMore = () => setPage(prev => prev + 1);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setHasFilters(Object.values(filter).some(v => v !== ''));
    setPage(1);
    setVentes([]);
    loadData();
  };

  const resetFilters = () => {
    setFilter({ date_debut: '', date_fin: '', client: '', produit: '', vendeur: '' });
    setHasFilters(false);
    setPage(1);
    setVentes([]);
    loadData();
  };

  const formatMontant = (m) => (parseFloat(m) || 0).toLocaleString('fr-FR') + ' FCFA';
  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const totalVentes = ventes.reduce((sum, v) => sum + (v.montant_total || 0), 0);
  const totalBenefice = ventes.reduce((sum, v) => sum + (v.benefice || 0), 0);

  const genererFacture = (vente) => {
    const w = window.open('', '_blank');
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture #${vente.id}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
        <style>
          body { background: #f3f4f6; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; margin: 0; padding: 40px; }
          .invoice-box { max-width: 800px; margin: auto; padding: 50px; border-radius: 16px; background: white; box-shadow: 0 20px 50px rgba(0,0,0,0.1); }
          .header { display: flex; justify-content: space-between; margin-bottom: 50px; }
          .logo { font-size: 28px; font-weight: 800; color: #1e293b; }
          .logo span { color: #4f46e5; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th { background: #f8fafc; padding: 15px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; }
          td { padding: 15px; border-bottom: 1px solid #f1f5f9; }
          .text-right { text-align: right; }
          .totals-box { margin-left: auto; width: 300px; }
          .total-row { display: flex; justify-content: space-between; padding: 10px 0; }
          .total-row.final { font-weight: 800; font-size: 18px; border-top: 2px solid #e2e8f0; margin-top: 10px; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div class="logo">Gestion<span>Stock</span></div>
            <div style="text-align:right;">
              <h1>Facture</h1>
              <p style="color:#64748b;">#${String(vente.id).padStart(6, '0')}</p>
            </div>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:40px; margin-bottom:40px;">
            <div>
              <h3 style="font-size:12px; text-transform:uppercase; color:#94a3b8;">Vendeur</h3>
              <p><strong>${vente.boutique_nom}</strong><br>${vente.utilisateur_nom}</p>
            </div>
            <div style="text-align:right;">
              <h3 style="font-size:12px; text-transform:uppercase; color:#94a3b8;">Client</h3>
              <p><strong>${vente.client_nom}</strong><br>${formatDate(vente.date_heure)}</p>
            </div>
          </div>
          <table>
            <thead><tr><th>Description</th><th class="text-right">Qté</th><th class="text-right">Prix Unit.</th><th class="text-right">Total</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>${vente.produit_nom}</strong></td>
                <td class="text-right">${vente.quantite}</td>
                <td class="text-right">${(vente.montant_total / vente.quantite).toLocaleString()}</td>
                <td class="text-right">${formatMontant(vente.montant_total)}</td>
              </tr>
            </tbody>
          </table>
          <div class="totals-box">
            <div class="total-row final"><span>Total à payer</span><span>${formatMontant(vente.montant_total)}</span></div>
          </div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    w.document.close();
  };

  if (loading && page === 1) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Chargement des archives...</p>
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
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn">
            <ArrowLeft size={20} /><span>Retour</span>
          </Link>
          <div className="title-block">
            <h1>Historique des Ventes</h1>
            <p className="subtitle">
              <span className="total-count">{totalCount}</span> transactions trouvées
              {currentUserRole && (
                <span className="role-badge">{currentUserRole}</span>
              )}
            </p>
          </div>
        </div>
        <div className="header-right">
          <button className="refresh-btn" onClick={() => loadData()}>
            <TrendingUp size={18} /> Actualiser
          </button>
        </div>
      </header>

      <div className="content-wrapper">
        {error && (
          <div className="alert-box danger">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => loadData()} className="retry-btn">
              Réessayer
            </button>
          </div>
        )}

        <section className="kpi-grid">
          <div className="kpi-card purple">
            <div className="kpi-icon-wrapper">
                <div className="kpi-icon"><DollarSign size={24} /></div>
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Chiffre d'Affaires</span>
              <span className="kpi-value">{formatMontant(totalVentes)}</span>
            </div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-icon-wrapper">
                <div className="kpi-icon"><TrendingUp size={24} /></div>
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Bénéfice Net</span>
              <span className="kpi-value">{formatMontant(totalBenefice)}</span>
            </div>
          </div>
          <div className="kpi-card blue">
            <div className="kpi-icon-wrapper">
                <div className="kpi-icon"><ShoppingBag size={24} /></div>
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Volume Ventes</span>
              <span className="kpi-value">{ventes.length}</span>
            </div>
          </div>
        </section>

        <section className="filters-container">
          <div className="search-group">
            <div className="input-wrapper">
              <Search size={18} className="input-icon" />
              <input type="text" name="produit" placeholder="Rechercher produit..."
                value={filter.produit} onChange={handleFilterChange} />
            </div>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input type="text" name="client" placeholder="Client..."
                value={filter.client} onChange={handleFilterChange} />
            </div>
            <div className="input-wrapper">
              <Store size={18} className="input-icon" />
              <input type="text" name="vendeur" placeholder="Vendeur..."
                value={filter.vendeur} onChange={handleFilterChange} />
            </div>
          </div>
          <div className="date-group">
            <div className="input-wrapper date">
              <Calendar size={18} className="input-icon" />
              <input type="date" name="date_debut" value={filter.date_debut} onChange={handleFilterChange} />
            </div>
            <span className="separator">à</span>
            <div className="input-wrapper date">
              <Calendar size={18} className="input-icon" />
              <input type="date" name="date_fin" value={filter.date_fin} onChange={handleFilterChange} />
            </div>
            <div className="filter-actions">
                <button className="apply-btn" onClick={applyFilters}>Filtrer</button>
                <button className="reset-btn" onClick={resetFilters}><FilterX size={18} /></button>
            </div>
          </div>
        </section>

        <section className="table-container">
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Produit</th>
                  <th>Vendeur</th>
                  <th>Client</th>
                  <th className="text-right">Montant</th>
                  <th className="text-right">Bénéfice</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {ventes.map(vente => (
                  <tr key={vente.id} onClick={() => { setSelectedVente(vente); setShowDetails(true); }}>
                    <td className="col-id">#{vente.id}</td>
                    <td className="col-date">
                      <div className="date-block">
                        <span className="date-main">{new Date(vente.date_heure).toLocaleDateString()}</span>
                        <span className="date-sub">{new Date(vente.date_heure).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                    </td>
                    <td className="col-prod">
                      <div className="prod-cell">
                        <div className="prod-icon"><Package size={16} /></div>
                        <div className="prod-info">
                          <span className="prod-name">{vente.produit_nom}</span>
                          <span className="prod-qty">Qté: {vente.quantite}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge-user">{vente.utilisateur_nom}</span></td>
                    <td><span className="text-client">{vente.client_nom}</span></td>
                    <td className="text-right font-bold montant-col">{formatMontant(vente.montant_total)}</td>
                    <td className="text-right">
                      <span className={`badge-profit ${vente.benefice >= 0 ? 'pos' : 'neg'}`}>
                        {formatMontant(vente.benefice)}
                      </span>
                    </td>
                    <td className="text-center action-col" onClick={(e) => e.stopPropagation()}>
                      <div className="action-row">
                        <button className="btn-icon view" title="Voir détails" onClick={() => { setSelectedVente(vente); setShowDetails(true); }}>
                          <Eye size={16} />
                        </button>
                        <button className="btn-icon print" title="Imprimer" onClick={() => genererFacture(vente)}>
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {ventes.length === 0 && !loading && (
                  <tr>
                    <td colSpan="8" className="empty-row">
                      <div className="empty-state">
                        <div className="empty-icon"><Search size={32} /></div>
                        <p>Aucune vente trouvée.</p>
                        {hasFilters && (
                          <button className="clear-filters-btn" onClick={resetFilters}>
                            Effacer les filtres
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {ventes.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                <span>Page {page}</span>
                <span className="divider">/</span>
                <span>{Math.ceil(totalCount / pageSize) || 1}</span>
                <span className="total-label">({totalCount} items)</span>
              </div>
              <div className="pagination-controls">
                <button className="pagination-btn" onClick={() => setPage(1)} disabled={page === 1}>
                  <ChevronLeft size={16} /><ChevronLeft size={16} />
                </button>
                <button className="pagination-btn" onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={page === 1}>
                  <ChevronLeft size={16} />
                </button>

                <button className="pagination-btn" onClick={loadMore} disabled={loadingMore || ventes.length >= totalCount}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {showDetails && selectedVente && (
        <div className="modal-backdrop" onClick={() => setShowDetails(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <h2>Détail Vente</h2>
                <span className="id-badge">#{selectedVente.id}</span>
              </div>
              <button className="close-btn" onClick={() => setShowDetails(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item">
                    <span className="label">Date</span>
                    <span className="value">{formatDate(selectedVente.date_heure)}</span>
                </div>
                <div className="info-item">
                    <span className="label">Vendeur</span>
                    <span className="value">{selectedVente.utilisateur_nom}</span>
                </div>
                <div className="info-item">
                    <span className="label">Client</span>
                    <span className="value">{selectedVente.client_nom}</span>
                </div>
                <div className="info-item">
                    <span className="label">Boutique</span>
                    <span className="value">{selectedVente.boutique_nom}</span>
                </div>
              </div>

              <div className="product-card">
                 <div className="prod-header">
                    <Package size={20} />
                    <span>{selectedVente.produit_nom}</span>
                 </div>
                 <div className="prod-details">
                    <div className="detail-row">
                        <span>Quantité</span>
                        <strong>{selectedVente.quantite}</strong>
                    </div>
                    <div className="detail-row">
                        <span>Prix unitaire</span>
                        <strong>{formatMontant(selectedVente.montant_total / selectedVente.quantite)}</strong>
                    </div>
                 </div>
              </div>

              <div className="financial-summary">
                <div className="summary-row">
                  <span>Total Vente</span>
                  <span className="amount">{formatMontant(selectedVente.montant_total)}</span>
                </div>
                <div className="summary-row sub">
                  <span>Coût d'achat estimé</span>
                  <span>- {formatMontant(selectedVente.prix_achat_unitaire * selectedVente.quantite)}</span>
                </div>
                <div className="summary-row total">
                  <span>Bénéfice Net</span>
                  <span className={`profit-val ${selectedVente.benefice >= 0 ? 'pos' : 'neg'}`}>
                    {formatMontant(selectedVente.benefice)}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-print" onClick={() => genererFacture(selectedVente)}>
                <Printer size={18} /> Imprimer Facture
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* --- VARIABLES & GLOBAL --- */
        :global(body) {
            background-color: #f8fafc;
            color: #1e293b;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            margin: 0;
        }

        .page-container {
          padding: 24px 32px;
          max-width: 1400px;
          margin: 0 auto;
          min-height: 100vh;
        }

        /* --- HEADER --- */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: color 0.2s;
        }

        .back-btn:hover { color: #334155; }

        .title-block h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.025em;
        }

        .subtitle {
          color: #64748b;
          font-size: 0.9rem;
          margin: 4px 0 0 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .total-count {
          color: #0f172a;
          font-weight: 600;
        }

        .role-badge {
          background: #e0e7ff;
          color: #4338ca;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          color: #334155;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .refresh-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        /* --- KPI CARDS --- */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .kpi-card {
          background: white;
          padding: 24px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
          border: 1px solid #f1f5f9;
          transition: transform 0.2s;
        }

        .kpi-card:hover { transform: translateY(-2px); }

        .kpi-icon-wrapper {
            width: 56px;
            height: 56px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .kpi-card.purple .kpi-icon-wrapper { background: #eef2ff; color: #4f46e5; }
        .kpi-card.green .kpi-icon-wrapper { background: #f0fdf4; color: #16a34a; }
        .kpi-card.blue .kpi-icon-wrapper { background: #eff6ff; color: #2563eb; }

        .kpi-info {
          display: flex;
          flex-direction: column;
        }

        .kpi-label {
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .kpi-value {
          color: #0f172a;
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 4px;
        }

        /* --- FILTERS --- */
        .filters-container {
          background: white;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          margin-bottom: 24px;
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          align-items: center;
          border: 1px solid #f1f5f9;
        }

        .search-group, .date-group {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-group { flex: 2; }
        .date-group { flex: 1.5; justify-content: flex-end; }

        .input-wrapper {
          position: relative;
          flex: 1;
          min-width: 180px;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .input-wrapper input {
          width: 100%;
          padding: 10px 12px 10px 40px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.9rem;
          color: #334155;
          background: #f8fafc;
          transition: all 0.2s;
          box-sizing: border-box; /* Fix width issues */
        }

        .input-wrapper input:focus {
          outline: none;
          background: white;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .separator { color: #94a3b8; font-size: 0.9rem; }

        .filter-actions {
            display: flex;
            gap: 8px;
        }

        .apply-btn {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .apply-btn:hover { background: #4338ca; }

        .reset-btn {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
          width: 40px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .reset-btn:hover {
            background: #fee2e2;
            color: #ef4444;
            border-color: #fecaca;
        }

        /* --- TABLE --- */
        .table-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
          border: 1px solid #f1f5f9;
          overflow: hidden;
        }

        .table-responsive {
            overflow-x: auto;
        }

        .modern-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        .modern-table th {
          background: #f8fafc;
          padding: 16px 24px;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
        }

        .modern-table td {
          padding: 16px 24px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.9rem;
          color: #334155;
          vertical-align: middle;
        }

        .modern-table tbody tr {
          cursor: pointer;
          transition: background 0.1s;
        }

        .modern-table tbody tr:hover {
          background: #f8fafc;
        }

        .col-id {
          font-family: 'Monaco', monospace;
          color: #64748b;
          font-size: 0.8rem;
        }

        .date-block {
            display: flex;
            flex-direction: column;
        }

        .date-main { font-weight: 500; color: #1e293b; }
        .date-sub { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }

        .prod-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .prod-icon {
          width: 32px;
          height: 32px;
          background: #eef2ff;
          border-radius: 8px;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .prod-info { display: flex; flex-direction: column; }
        .prod-name { font-weight: 500; color: #0f172a; }
        .prod-qty { font-size: 0.75rem; color: #64748b; }

        .badge-user {
          display: inline-block;
          background: #f1f5f9;
          color: #475569;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .text-client { font-weight: 500; color: #334155; }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 600; }
        .montant-col { color: #0f172a; }

        .badge-profit {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .badge-profit.pos { background: #dcfce7; color: #166534; }
        .badge-profit.neg { background: #fee2e2; color: #991b1b; }

        .action-row {
            display: flex;
            justify-content: center;
            gap: 8px;
        }

        .btn-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-icon.view { background: #eff6ff; color: #2563eb; }
        .btn-icon.view:hover { background: #dbeafe; }

        .btn-icon.print { background: #f1f5f9; color: #475569; }
        .btn-icon.print:hover { background: #e2e8f0; color: #1e293b; }

        /* --- EMPTY STATE --- */
        .empty-row { padding: 40px !important; text-align: center; }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #94a3b8;
        }
        .empty-icon {
            background: #f1f5f9;
            padding: 16px;
            border-radius: 50%;
            margin-bottom: 16px;
        }
        .clear-filters-btn {
          margin-top: 16px;
          background: white;
          border: 1px solid #e2e8f0;
          color: #4f46e5;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        /* --- PAGINATION --- */
        .pagination-container {
          padding: 16px 24px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fafafa;
        }

        .pagination-info {
            font-size: 0.875rem;
            color: #64748b;
        }
        .pagination-info .divider { margin: 0 8px; color: #cbd5e1; }
        .pagination-info .total-label { margin-left: 8px; color: #94a3b8; }

        .pagination-controls {
          display: flex;
          gap: 8px;
        }

        .pagination-btn {
          width: 36px;
          height: 36px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          border-color: #4f46e5;
          color: #4f46e5;
          background: #eef2ff;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f8fafc;
        }

        /* --- MODAL --- */
        .modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        .modal-card {
          background: white;
          width: 100%;
          max-width: 500px;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .modal-header {
          padding: 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: #f8fafc;
        }

        .modal-title h2 { margin: 0; font-size: 1.25rem; color: #0f172a; }
        .id-badge {
            font-size: 0.875rem;
            color: #64748b;
            font-family: monospace;
            background: #e2e8f0;
            padding: 2px 6px;
            border-radius: 4px;
            margin-top: 4px;
            display: inline-block;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          color: #94a3b8;
          cursor: pointer;
          line-height: 1;
        }

        .modal-body { padding: 24px; }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
        }
        .info-item { display: flex; flex-direction: column; }
        .info-item .label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .info-item .value { font-size: 0.95rem; color: #1e293b; font-weight: 500; }

        .product-card {
            background: #f8fafc;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
            border: 1px solid #e2e8f0;
        }

        .prod-header {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #4f46e5;
            font-weight: 600;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
        }

        .prod-details {
            display: flex;
            justify-content: space-between;
        }

        .financial-summary {
            background: #fff;
            border: 1px solid #f1f5f9;
            border-radius: 12px;
            padding: 16px;
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 0.9rem;
            color: #334155;
        }

        .summary-row.sub { color: #94a3b8; font-size: 0.85rem; }

        .summary-row.total {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px dashed #e2e8f0;
            font-weight: 700;
            font-size: 1.1rem;
            color: #0f172a;
            align-items: center;
        }

        .modal-footer {
          padding: 16px 24px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: flex-end;
        }

        .btn-print {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #1e293b;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
        }
        .btn-print:hover { background: #0f172a; }

        /* --- ALERTS --- */
        .alert-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }
        .retry-btn {
          margin-left: auto;
          background: #dc2626;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
            .page-container { padding: 16px; }
            .filters-container { flex-direction: column; align-items: stretch; }
            .search-group, .date-group { flex-direction: column; width: 100%; }
            .kpi-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}