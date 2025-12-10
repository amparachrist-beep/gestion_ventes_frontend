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
      // ✅ CONSTRUIRE LES PARAMÈTRES
      const params = {
        page,
        page_size: pageSize,
        ...filter
      };

      // ✅ NETTOYER LES VALEURS VIDES
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      console.log('📊 Chargement historiques avec params:', params);

      // ✅ OPTIMISATION : Charger uniquement ce qui est nécessaire
      const [ventesRes] = await Promise.all([
        venteAPI.list({ params })
      ]);

      let rawVentes = [];
      let count = 0;

      // ✅ TRAITEMENT DE LA RÉPONSE
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

      // ✅ ENRICHISSEMENT DES DONNÉES
      const ventesEnrichies = await enrichirVentes(rawVentes);

      // ✅ TRI CHRONOLOGIQUE
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

  // ✅ FONCTION D'ENRICHISSEMENT
  const enrichirVentes = async (rawVentes) => {
    if (!rawVentes.length) return [];

    try {
      // ✅ RÉCUPÉRER LES IDS UNIQUES POUR LES JOINTURES
      const produitIds = [...new Set(rawVentes.map(v => v.produit).filter(Boolean))];
      const boutiqueIds = [...new Set(rawVentes.map(v => v.boutique).filter(Boolean))];
      const userIds = [...new Set(rawVentes.map(v => v.utilisateur).filter(Boolean))];
      const clientIds = [...new Set(rawVentes.map(v => v.client).filter(Boolean))];

      // ✅ CHARGER LES DONNÉES EN PARALLÈLE
      const [produitsRes, boutiquesRes, usersRes, clientsRes] = await Promise.all([
        produitIds.length ? produitAPI.list({ params: { ids: produitIds.join(',') } }) : Promise.resolve({ data: [] }),
        boutiqueIds.length ? boutiqueAPI.list({ params: { ids: boutiqueIds.join(',') } }) : Promise.resolve({ data: [] }),
        userIds.length ? userAPI.list({ params: { ids: userIds.join(',') } }) : Promise.resolve({ data: [] }),
        clientIds.length ? clientAPI.list({ params: { ids: clientIds.join(',') } }) : Promise.resolve({ data: [] })
      ]);

      // ✅ CRÉER LES MAPS POUR ACCÈS RAPIDE
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

        // ✅ CALCULS FINANCIERS
        const prixAchat = produit ? parseFloat(produit.prix_achat) || 0 : 0;
        const montantTotal = parseFloat(vente.montant_total) || 0;
        const quantite = parseInt(vente.quantite) || 1;
        const benefice = montantTotal - (prixAchat * quantite);

        // ✅ NOMS AFFICHÉS
        const produitNom = produit ? produit.nom : 'Produit supprimé';
        const boutiqueNom = boutique ? boutique.nom : 'N/A';
        const utilisateurNom = user ?
          (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username)
          : 'Inconnu';
        const clientNom = client ? client.nom : (vente.client_nom || 'Client Comptoir');

        return {
          ...vente,
          prix_achat_unitaire: prixAchat,
          montant_total: montantTotal,
          quantite,
          benefice,
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
      // ✅ FALLBACK : Retourner les données de base si l'enrichissement échoue
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

  // ✅ STATISTIQUES
  const totalVentes = ventes.reduce((sum, v) => sum + (v.montant_total || 0), 0);
  const totalBenefice = ventes.reduce((sum, v) => sum + (v.benefice || 0), 0);

  // ✅ GÉNÉRATION DE FACTURE
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
    </div>
  );

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn">
            <ArrowLeft size={20} /><span>Dashboard</span>
          </Link>
          <div className="title-block">
            <h1>Historique des Ventes</h1>
            <p className="subtitle">
              <span className="total-count">{totalCount}</span> transactions au total
              {currentUserRole && (
                <span className="role-badge">{currentUserRole.toUpperCase()}</span>
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
        {/* ✅ MESSAGE D'ERREUR */}
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
            <div className="kpi-icon"><DollarSign size={24} /></div>
            <div className="kpi-info">
              <span className="kpi-label">Chiffre d'Affaires</span>
              <span className="kpi-value">{formatMontant(totalVentes)}</span>
            </div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-icon"><TrendingUp size={24} /></div>
            <div className="kpi-info">
              <span className="kpi-label">Bénéfice Net</span>
              <span className="kpi-value">{formatMontant(totalBenefice)}</span>
            </div>
          </div>
          <div className="kpi-card blue">
            <div className="kpi-icon"><ShoppingBag size={24} /></div>
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
            <button className="reset-btn" onClick={resetFilters}><FilterX size={18} /></button>
            <button className="apply-btn" onClick={applyFilters}>Appliquer</button>
          </div>
        </section>

        <section className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date & Heure</th>
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
                    <span className="date-main">{new Date(vente.date_heure).toLocaleDateString()}</span>
                    <span className="date-sub">{new Date(vente.date_heure).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </td>
                  <td className="col-prod">
                    <div className="prod-cell">
                      <div className="prod-icon"><Package size={16} /></div>
                      <div className="prod-info">
                        <span className="prod-name">{vente.produit_nom}</span>
                        <span className="prod-qty">x{vente.quantite}</span>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge-user">{vente.utilisateur_nom}</span></td>
                  <td>{vente.client_nom}</td>
                  <td className="text-right font-bold">{formatMontant(vente.montant_total)}</td>
                  <td className="text-right">
                    <span className={`badge-profit ${vente.benefice >= 0 ? 'pos' : 'neg'}`}>
                      {formatMontant(vente.benefice)}
                    </span>
                  </td>
                  <td className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="action-row">
                      <button className="btn-action view" onClick={() => { setSelectedVente(vente); setShowDetails(true); }}>
                        <Eye size={14} style={{marginRight: 4}} /> Voir
                      </button>
                      <button className="btn-action print" onClick={() => genererFacture(vente)}>
                        <Printer size={14} style={{marginRight: 4}} /> Imprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {ventes.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="empty-row">
                    <div className="empty-state">
                      <Search size={40} />
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

          {ventes.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Affichage de <span className="highlight">{ventes.length}</span> sur <span className="highlight">{totalCount}</span>
              </div>
              <div className="pagination-controls">
                <button className="pagination-btn" onClick={() => setPage(1)} disabled={page === 1}>
                  <ChevronLeft size={16} /><ChevronLeft size={16} />
                </button>
                <button className="pagination-btn" onClick={() => setPage(prev => Math.max(1, prev - 1))} disabled={page === 1}>
                  <ChevronLeft size={16} />
                </button>
                <span className="pagination-current">Page {page}</span>
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
              <h2>Détail Vente #{selectedVente.id}</h2>
              <button className="close-btn" onClick={() => setShowDetails(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-item">
                <label>Date</label>
                <span>{formatDate(selectedVente.date_heure)}</span>
              </div>
              <div className="detail-item">
                <label>Vendeur</label>
                <span>{selectedVente.utilisateur_nom}</span>
              </div>
              <div className="detail-item">
                <label>Client</label>
                <span>{selectedVente.client_nom}</span>
              </div>
              <hr />
              <div className="detail-item highlight">
                <label>Produit</label>
                <span>{selectedVente.produit_nom}</span>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <label>Quantité</label>
                  <span>{selectedVente.quantite}</span>
                </div>
                <div className="detail-item">
                  <label>Total Vente</label>
                  <span>{formatMontant(selectedVente.montant_total)}</span>
                </div>

                <div className="detail-item">
                  <label>Coût Achat</label>
                  <span style={{color: '#64748b'}}>
                    - {formatMontant(selectedVente.prix_achat_unitaire * selectedVente.quantite)}
                  </span>
                </div>

                <div className="detail-item">
                  <label>Bénéfice</label>
                  <span className={`badge-profit ${selectedVente.benefice >= 0 ? 'pos' : 'neg'}`}>
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
        .alert-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .alert-box.danger {
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

        .retry-btn:hover {
          background: #b91c1c;
        }

        .role-badge {
          background: #e0e7ff;
          color: #4338ca;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          margin-left: 8px;
          text-transform: uppercase;
        }

        .clear-filters-btn {
          margin-top: 12px;
          background: #4f46e5;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
        }

        .clear-filters-btn:hover {
          background: #4338ca;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
        }
      `}</style>
    </div>
  );
}