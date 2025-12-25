import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { venteAPI, produitAPI, profilAPI, boutiqueAPI, clientAPI } from '../api';
import {
  ArrowLeft, Search, Calendar, User, Package,
  Eye, Printer, TrendingUp, DollarSign, ShoppingBag,
  FilterX, AlertCircle, RefreshCw, ChevronRight, X
} from 'lucide-react';

export default function HistoriqueMesVentes({ isOnline }) {
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [filter, setFilter] = useState({
    date_debut: '',
    date_fin: '',
    client: '',
    produit: ''
  });

  const [selectedVente, setSelectedVente] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadData();
  }, [isOnline]);

  const loadData = async () => {
    if (!isOnline) {
      setError('❌ Connexion Internet requise');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. RÉCUPÉRER L'UTILISATEUR CONNECTÉ
      const profilRes = await profilAPI.me();
      const profilData = profilRes.data;
      const userId = profilData.user?.id || profilData.user_id;

      if (!userId) {
        throw new Error('Impossible de récupérer votre identifiant');
      }

      setCurrentUserId(userId);

      // 2. CHARGER LES VENTES AVEC FILTRE POUR CET UTILISATEUR
      const params = {
        utilisateur: userId,
        page_size: 100
      };

      const ventesRes = await venteAPI.list({ params });

      let rawVentes = [];
      if (ventesRes.data) {
        if (Array.isArray(ventesRes.data)) {
          rawVentes = ventesRes.data;
        } else if (ventesRes.data.results) {
          rawVentes = ventesRes.data.results;
        } else if (ventesRes.data.ventes) {
          rawVentes = ventesRes.data.ventes;
        }
      }

      // 3. ENRICHIR LES VENTES
      const ventesEnrichies = await enrichirMesVentes(rawVentes, profilData);
      setVentes(ventesEnrichies);

    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      setError('Impossible de charger vos ventes.');
    } finally {
      setLoading(false);
    }
  };

  const enrichirMesVentes = async (rawVentes, profilData) => {
    if (!rawVentes.length) return [];

    try {
      const produitIds = [...new Set(rawVentes.map(v => v.produit).filter(Boolean))];
      const boutiqueIds = [...new Set(rawVentes.map(v => v.boutique).filter(Boolean))];
      const clientIds = [...new Set(rawVentes.map(v => v.client).filter(Boolean))];

      const [produitsRes, boutiquesRes, clientsRes] = await Promise.all([
        produitIds.length ? produitAPI.list({ params: { ids: produitIds.join(',') } }) : Promise.resolve({ data: [] }),
        boutiqueIds.length ? boutiqueAPI.list({ params: { ids: boutiqueIds.join(',') } }) : Promise.resolve({ data: [] }),
        clientIds.length ? clientAPI.list({ params: { ids: clientIds.join(',') } }) : Promise.resolve({ data: [] })
      ]);

      const produitsMap = {};
      (Array.isArray(produitsRes.data) ? produitsRes.data : produitsRes.data?.results || []).forEach(p => { produitsMap[p.id] = p; });

      const boutiquesMap = {};
      (Array.isArray(boutiquesRes.data) ? boutiquesRes.data : boutiquesRes.data?.results || []).forEach(b => { boutiquesMap[b.id] = b; });

      const clientsMap = {};
      (Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data?.results || []).forEach(c => { clientsMap[c.id] = c; });

      const user = profilData.user || profilData;
      const vendeurNom = (user.first_name && user.last_name) ? `${user.first_name} ${user.last_name}` : user.username || 'Moi';

      return rawVentes.map(vente => {
        const produit = produitsMap[vente.produit];
        const boutique = boutiquesMap[vente.boutique];
        const client = clientsMap[vente.client];

        const montantTotal = parseFloat(vente.montant_total) || 0;
        const quantite = parseInt(vente.quantite) || 1;
        const prixAchatTotal = parseFloat(vente.cout_achat_total) || 0;
        const benefice = parseFloat(vente.marge_brute) || (montantTotal - prixAchatTotal);

        return {
          ...vente,
          prix_achat_unitaire: prixAchatTotal / quantite,
          montant_total: montantTotal,
          quantite,
          benefice,
          produit_nom: produit ? produit.nom : (vente.produit_nom || 'Produit supprimé'),
          boutique_nom: boutique ? boutique.nom : (vente.boutique_nom || 'N/A'),
          client_nom: client ? client.nom : (vente.client_nom || 'Client Comptoir'),
          utilisateur_nom: vendeurNom,
          produit_obj: produit,
          boutique_obj: boutique,
          client_obj: client
        };
      });

    } catch (error) {
      console.error('❌ Erreur enrichissement:', error);
      return rawVentes;
    }
  };

  const getFilteredVentes = () => {
    return ventes.filter(v => {
      const matchDateDebut = filter.date_debut ? new Date(v.date_heure) >= new Date(filter.date_debut) : true;
      const matchDateFin = filter.date_fin ? new Date(v.date_heure) <= new Date(filter.date_fin + 'T23:59:59') : true;
      const matchClient = filter.client ? (v.client_nom || '').toLowerCase().includes(filter.client.toLowerCase()) : true;
      const matchProduit = filter.produit ? (v.produit_nom || '').toLowerCase().includes(filter.produit.toLowerCase()) : true;
      return matchDateDebut && matchDateFin && matchClient && matchProduit;
    });
  };

  const filteredVentes = getFilteredVentes();

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilter({ date_debut: '', date_fin: '', client: '', produit: '' });
  };

  const formatMontant = (montant) => (parseFloat(montant) || 0).toLocaleString('fr-FR') + ' FCFA';

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
  };

  const handleVenteClick = (vente) => { setSelectedVente(vente); setShowDetails(true); };
  const closeDetails = () => { setShowDetails(false); setSelectedVente(null); };

  const genererFacture = (vente) => {
    const w = window.open('', '_blank');
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture #${vente.id}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; }
          h1 { text-align: center; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <h1>Facture #${vente.id}</h1>
          <p><strong>Produit:</strong> ${vente.produit_nom}</p>
          <p><strong>Montant:</strong> ${formatMontant(vente.montant_total)}</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    w.document.close();
  };

  const totalVentes = filteredVentes.reduce((sum, v) => sum + (v.montant_total || 0), 0);
  const totalBenefice = filteredVentes.reduce((sum, v) => sum + (v.benefice || 0), 0);

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Chargement...</p>
      <style jsx>{`
        .loading-screen { height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #64748b; }
        .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn"><ArrowLeft size={20} /><span>Retour</span></Link>
          <div className="title-block">
            <h1>Mes Ventes</h1>
            <p className="subtitle">{filteredVentes.length} transactions</p>
          </div>
        </div>
        <div className="header-right">
          <button onClick={loadData} className="refresh-btn" disabled={!isOnline}>
            <RefreshCw size={18} /> <span className="btn-text">Actualiser</span>
          </button>
        </div>
      </header>

      <div className="content-wrapper">
        {error && (
          <div className="alert-box danger">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={loadData} className="retry-btn">Réessayer</button>
          </div>
        )}

        {/* KPI CARDS */}
        <section className="kpi-grid">
          <div className="kpi-card purple">
            <div className="kpi-icon-wrapper"><DollarSign size={24} /></div>
            <div className="kpi-info">
              <span className="kpi-label">Mon C.A.</span>
              <span className="kpi-value">{formatMontant(totalVentes)}</span>
            </div>
          </div>
          <div className="kpi-card green">
             <div className="kpi-icon-wrapper"><TrendingUp size={24} /></div>
            <div className="kpi-info">
              <span className="kpi-label">Bénéfice</span>
              <span className="kpi-value">{formatMontant(totalBenefice)}</span>
            </div>
          </div>
          <div className="kpi-card blue">
             <div className="kpi-icon-wrapper"><ShoppingBag size={24} /></div>
            <div className="kpi-info">
              <span className="kpi-label">Ventes</span>
              <span className="kpi-value">{filteredVentes.length}</span>
            </div>
          </div>
        </section>

        {/* FILTERS */}
        <section className="filters-container">
          <div className="search-group">
            <div className="input-wrapper">
              <Search size={18} className="input-icon" />
              <input type="text" name="produit" placeholder="Produit..." value={filter.produit} onChange={handleFilterChange} />
            </div>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input type="text" name="client" placeholder="Client..." value={filter.client} onChange={handleFilterChange} />
            </div>
          </div>
          <div className="date-group">
            <div className="input-wrapper date">
              <input type="date" name="date_debut" value={filter.date_debut} onChange={handleFilterChange} />
            </div>
            <span className="separator">à</span>
            <div className="input-wrapper date">
              <input type="date" name="date_fin" value={filter.date_fin} onChange={handleFilterChange} />
            </div>
            <button className="reset-btn" onClick={resetFilters} title="Réinitialiser"><FilterX size={18} /></button>
          </div>
        </section>

        {/* TABLE */}
        <section className="table-container">
          <div className="table-responsive">
            <table className="modern-table">
                <thead>
                <tr>
                    <th>Date</th>
                    <th>Produit</th>
                    <th className="hide-mobile">Client</th>
                    <th className="text-right">Montant</th>
                    <th className="text-right hide-mobile">Bénéfice</th>
                    <th className="text-center">Action</th>
                </tr>
                </thead>
                <tbody>
                {filteredVentes.map(vente => (
                    <tr key={vente.id} onClick={() => handleVenteClick(vente)}>
                    <td className="col-date">
                        <div className="date-block">
                            <span className="date-main">{new Date(vente.date_heure).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                            <span className="date-sub">{new Date(vente.date_heure).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                    </td>
                    <td className="col-prod">
                        <div className="prod-info">
                            <span className="prod-name">{vente.produit_nom}</span>
                            <span className="prod-qty">x{vente.quantite}</span>
                        </div>
                    </td>
                    <td className="hide-mobile"><span className="text-client">{vente.client_nom}</span></td>
                    <td className="text-right font-bold montant-col">{formatMontant(vente.montant_total)}</td>
                    <td className="text-right hide-mobile">
                        <span className={`badge-profit ${vente.benefice >= 0 ? 'pos' : 'neg'}`}>
                        {formatMontant(vente.benefice)}
                        </span>
                    </td>
                    <td className="text-center action-col">
                        <button className="btn-icon view" onClick={(e) => { e.stopPropagation(); handleVenteClick(vente); }}>
                            <Eye size={18} />
                        </button>
                    </td>
                    </tr>
                ))}
                {filteredVentes.length === 0 && (
                    <tr>
                    <td colSpan="6" className="empty-row">
                        <p>Aucune vente trouvée.</p>
                    </td>
                    </tr>
                )}
                </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* MODAL */}
      {showDetails && selectedVente && (
        <div className="modal-backdrop" onClick={closeDetails}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Détail Vente #{selectedVente.id}</h3>
              <button className="close-btn" onClick={closeDetails}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item"><span className="label">Date</span><span className="value">{formatDate(selectedVente.date_heure)}</span></div>
                <div className="info-item"><span className="label">Client</span><span className="value">{selectedVente.client_nom}</span></div>
              </div>

              <div className="product-card">
                 <div className="prod-header"><Package size={18} /><span>{selectedVente.produit_nom}</span></div>
                 <div className="prod-details">
                    <div className="detail-row"><span>Quantité</span><strong>{selectedVente.quantite}</strong></div>
                    <div className="detail-row"><span>Prix unit.</span><strong>{formatMontant(selectedVente.montant_total / selectedVente.quantite)}</strong></div>
                 </div>
              </div>

              <div className="financial-summary">
                <div className="summary-row"><span>Total</span><span className="amount">{formatMontant(selectedVente.montant_total)}</span></div>
                <div className="summary-row total"><span>Bénéfice</span><span className={`profit-val ${selectedVente.benefice >= 0 ? 'pos' : 'neg'}`}>{formatMontant(selectedVente.benefice)}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-print" onClick={() => genererFacture(selectedVente)}>
                <Printer size={18} /> Imprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* GLOBAL */
        .page-container { min-height: 100vh; background-color: #f8fafc; color: #1e293b; font-family: 'Inter', sans-serif; padding-bottom: 80px; }
        .content-wrapper { max-width: 1000px; margin: 0 auto; padding: 20px; }

        /* HEADER */
        .page-header { background: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 20; }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .back-btn { display: flex; align-items: center; gap: 6px; color: #64748b; text-decoration: none; font-weight: 500; font-size: 0.9rem; }
        .title-block h1 { margin: 0; font-size: 1.2rem; font-weight: 700; color: #0f172a; }
        .subtitle { margin: 0; font-size: 0.8rem; color: #64748b; }
        .refresh-btn { display: flex; align-items: center; gap: 6px; background: white; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px; cursor: pointer; color: #334155; }

        /* KPI */
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
        .kpi-card { background: white; padding: 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; border: 1px solid #e2e8f0; }
        .kpi-icon-wrapper { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .kpi-card.purple .kpi-icon-wrapper { background: #eef2ff; color: #4f46e5; }
        .kpi-card.green .kpi-icon-wrapper { background: #f0fdf4; color: #16a34a; }
        .kpi-card.blue .kpi-icon-wrapper { background: #eff6ff; color: #2563eb; }
        .kpi-label { font-size: 0.75rem; color: #64748b; display: block; }
        .kpi-value { font-size: 1.1rem; font-weight: 700; color: #0f172a; }

        /* FILTERS */
        .filters-container { background: white; padding: 16px; border-radius: 12px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; border: 1px solid #e2e8f0; }
        .search-group, .date-group { display: flex; gap: 10px; width: 100%; }
        .input-wrapper { position: relative; flex: 1; }
        .input-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .input-wrapper input { width: 100%; padding: 10px 10px 10px 36px; border: 1px solid #e2e8f0; border-radius: 8px; box-sizing: border-box; font-size: 0.9rem; }
        .input-wrapper.date input { padding-left: 10px; }
        .reset-btn { background: #f1f5f9; border: none; width: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #64748b; }

        /* TABLE */
        .table-container { background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
        .table-responsive { overflow-x: auto; }
        .modern-table { width: 100%; border-collapse: collapse; min-width: 100%; }
        .modern-table th { background: #f8fafc; padding: 12px; text-align: left; font-size: 0.75rem; color: #64748b; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .modern-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; color: #334155; }

        .date-block { display: flex; flex-direction: column; }
        .date-main { font-weight: 500; font-size: 0.85rem; }
        .date-sub { font-size: 0.7rem; color: #94a3b8; }

        .prod-info { display: flex; flex-direction: column; }
        .prod-name { font-weight: 500; font-size: 0.9rem; }
        .prod-qty { font-size: 0.75rem; color: #64748b; }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 600; }
        .montant-col { white-space: nowrap; }

        .badge-profit { padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
        .badge-profit.pos { background: #dcfce7; color: #166534; }
        .badge-profit.neg { background: #fee2e2; color: #991b1b; }

        .btn-icon { background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #475569; cursor: pointer; }

        .empty-row { text-align: center; padding: 30px; color: #94a3b8; }

        /* MODAL */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(2px); }
        .modal-card { background: white; width: 100%; max-width: 400px; border-radius: 16px; overflow: hidden; animation: slideUp 0.2s ease-out; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .modal-header { padding: 16px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .modal-header h3 { margin: 0; font-size: 1.1rem; }
        .close-btn { background: none; border: none; font-size: 24px; color: #94a3b8; cursor: pointer; }

        .modal-body { padding: 20px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .info-item { display: flex; flex-direction: column; }
        .info-item .label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; }
        .info-item .value { font-size: 0.9rem; font-weight: 500; }

        .product-card { background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
        .prod-header { display: flex; align-items: center; gap: 8px; font-weight: 600; margin-bottom: 8px; color: #4f46e5; }
        .prod-details { display: flex; justify-content: space-between; font-size: 0.85rem; }

        .financial-summary { border-top: 1px dashed #e2e8f0; padding-top: 12px; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.9rem; }
        .summary-row.sub { color: #94a3b8; font-size: 0.8rem; }
        .summary-row.total { font-weight: 700; color: #0f172a; margin-top: 8px; font-size: 1.1rem; }
        .profit-val.pos { color: #16a34a; }
        .profit-val.neg { color: #dc2626; }

        .modal-footer { padding: 16px; background: #f8fafc; display: flex; justify-content: flex-end; }
        .btn-print { background: #1e293b; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 500; display: flex; align-items: center; gap: 8px; }

        /* RESPONSIVE MEDIA QUERIES */
        @media (max-width: 640px) {
            .page-container { padding: 0 0 80px 0; }
            .header-left .back-btn span { display: none; }
            .btn-text { display: none; }
            .hide-mobile { display: none; }
            .filters-container { flex-direction: column; }
            .search-group, .date-group { flex-direction: column; }
            .input-wrapper { width: 100%; }
            .kpi-grid { grid-template-columns: 1fr; gap: 10px; }
        }
      `}</style>
    </div>
  );
}