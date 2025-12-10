import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { venteAPI, produitAPI, profilAPI, boutiqueAPI } from '../api';
import {
  ArrowLeft, Search, Calendar, User, Package,
  Eye, Printer, TrendingUp, DollarSign, ShoppingBag,
  FilterX, AlertCircle, RefreshCw
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
      // ✅ 1. RÉCUPÉRER L'UTILISATEUR CONNECTÉ
      const profilRes = await profilAPI.me();
      const profilData = profilRes.data;

      // ✅ IMPORTANT: Récupérer l'ID de l'User, pas du Profil
      const userId = profilData.user?.id || profilData.user_id;

      if (!userId) {
        throw new Error('Impossible de récupérer votre identifiant');
      }

      setCurrentUserId(userId);

      // ✅ 2. CHARGER LES VENTES AVEC FILTRE POUR CET UTILISATEUR
      const params = {
        utilisateur: userId, // ✅ Filtrer par utilisateur
        page_size: 100 // Limiter pour les performances
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

      console.log(`📊 ${rawVentes.length} ventes chargées pour l'utilisateur ${userId}`);

      // ✅ 3. ENRICHIR LES VENTES
      const ventesEnrichies = await enrichirMesVentes(rawVentes, profilData);

      setVentes(ventesEnrichies);

    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      setError('Impossible de charger vos ventes.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FONCTION D'ENRICHISSEMENT POUR LE VENDEUR
  const enrichirMesVentes = async (rawVentes, profilData) => {
    if (!rawVentes.length) return [];

    try {
      // ✅ RÉCUPÉRER LES IDS UNIQUES
      const produitIds = [...new Set(rawVentes.map(v => v.produit).filter(Boolean))];
      const boutiqueIds = [...new Set(rawVentes.map(v => v.boutique).filter(Boolean))];
      const clientIds = [...new Set(rawVentes.map(v => v.client).filter(Boolean))];

      // ✅ CHARGER LES DONNÉES
      const [produitsRes, boutiquesRes, clientsRes] = await Promise.all([
        produitIds.length ? produitAPI.list({ params: { ids: produitIds.join(',') } }) : Promise.resolve({ data: [] }),
        boutiqueIds.length ? boutiqueAPI.list({ params: { ids: boutiqueIds.join(',') } }) : Promise.resolve({ data: [] }),
        clientIds.length ? clientAPI.list({ params: { ids: clientIds.join(',') } }) : Promise.resolve({ data: [] })
      ]);

      // ✅ CRÉER LES MAPS
      const produitsMap = {};
      (Array.isArray(produitsRes.data) ? produitsRes.data : produitsRes.data?.results || []).forEach(p => {
        produitsMap[p.id] = p;
      });

      const boutiquesMap = {};
      (Array.isArray(boutiquesRes.data) ? boutiquesRes.data : boutiquesRes.data?.results || []).forEach(b => {
        boutiquesMap[b.id] = b;
      });

      const clientsMap = {};
      (Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data?.results || []).forEach(c => {
        clientsMap[c.id] = c;
      });

      // ✅ NOM DU VENDEUR
      const user = profilData.user || profilData;
      const vendeurNom = (user.first_name && user.last_name)
        ? `${user.first_name} ${user.last_name}`
        : user.username || 'Moi';

      // ✅ ENRICHIR LES VENTES
      return rawVentes.map(vente => {
        const produit = produitsMap[vente.produit];
        const boutique = boutiquesMap[vente.boutique];
        const client = clientsMap[vente.client];

        // ✅ CALCULS
        const prixAchat = produit ? parseFloat(produit.prix_achat) || 0 : 0;
        const montantTotal = parseFloat(vente.montant_total) || 0;
        const quantite = parseInt(vente.quantite) || 1;
        const benefice = montantTotal - (prixAchat * quantite);

        return {
          ...vente,
          prix_achat: prixAchat,
          montant_total: montantTotal,
          quantite,
          benefice,
          produit_nom: produit ? produit.nom : 'Produit',
          boutique_nom: boutique ? boutique.nom : 'N/A',
          client_nom: client ? client.nom : (vente.client_nom || 'Client Comptoir'),
          utilisateur_nom: vendeurNom
        };
      });

    } catch (error) {
      console.error('❌ Erreur enrichissement:', error);
      // Fallback
      return rawVentes.map(vente => ({
        ...vente,
        prix_achat: 0,
        montant_total: parseFloat(vente.montant_total) || 0,
        quantite: parseInt(vente.quantite) || 1,
        benefice: 0,
        produit_nom: 'Produit',
        boutique_nom: 'Boutique',
        client_nom: 'Client',
        utilisateur_nom: 'Moi'
      }));
    }
  };

  // ✅ FILTRAGE LOCAL
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

  // ✅ UTILITAIRES
  const formatMontant = (montant) => (parseFloat(montant) || 0).toLocaleString() + ' FCFA';
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR') + ' ' +
           new Date(dateString).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
  };

  const handleVenteClick = (vente) => { setSelectedVente(vente); setShowDetails(true); };
  const closeDetails = () => { setShowDetails(false); setSelectedVente(null); };

  // ✅ FACTURE
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

  const totalVentes = filteredVentes.reduce((sum, v) => sum + (v.montant_total || 0), 0);
  const totalBenefice = filteredVentes.reduce((sum, v) => sum + (v.benefice || 0), 0);

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Chargement de vos ventes...</p>
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
            <h1>📋 Mes Ventes</h1>
            <p className="subtitle">
              <span className="total-count">{ventes.length}</span> transactions personnelles
            </p>
          </div>
        </div>
        <div className="header-right">
          <button onClick={loadData} className="refresh-btn" disabled={!isOnline}>
            <RefreshCw size={18} /> Actualiser
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
              <span className="kpi-label">Total Mes Ventes</span>
              <span className="kpi-value">{formatMontant(totalVentes)}</span>
            </div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-icon"><TrendingUp size={24} /></div>
            <div className="kpi-info">
              <span className="kpi-label">Mon Bénéfice</span>
              <span className={`kpi-value ${totalBenefice >= 0 ? '' : 'negative'}`}>
                {formatMontant(totalBenefice)}
              </span>
            </div>
          </div>
          <div className="kpi-card blue">
            <div className="kpi-icon"><ShoppingBag size={24} /></div>
            <div className="kpi-info">
              <span className="kpi-label">Nombre Ventes</span>
              <span className="kpi-value">{filteredVentes.length}</span>
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
            <button className="apply-btn" onClick={() => setVentes([])}>Filtrer</button>
          </div>
        </section>

        <section className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Client</th>
                <th>Produit</th>
                <th>Qté</th>
                <th className="text-right">Montant</th>
                <th className="text-right">Bénéfice</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVentes.map(vente => (
                <tr key={vente.id} className="vente-row" onClick={() => handleVenteClick(vente)}>
                  <td className="col-id">#{vente.id}</td>
                  <td className="col-date">
                    <span className="date-main">{new Date(vente.date_heure).toLocaleDateString()}</span>
                    <span className="date-sub">{new Date(vente.date_heure).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </td>
                  <td>{vente.client_nom}</td>
                  <td className="col-prod">
                    <div className="prod-cell">
                      <div className="prod-icon"><Package size={16} /></div>
                      <div className="prod-info">
                        <span className="prod-name">{vente.produit_nom}</span>
                        <span className="prod-qty">x{vente.quantite}</span>
                      </div>
                    </div>
                  </td>
                  <td>{vente.quantite}</td>
                  <td className="text-right font-bold">{formatMontant(vente.montant_total)}</td>
                  <td className="text-right">
                    <span className={`badge-profit ${vente.benefice >= 0 ? 'pos' : 'neg'}`}>
                      {formatMontant(vente.benefice)}
                    </span>
                  </td>
                  <td className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="action-row">
                      <button className="btn-action view" onClick={() => handleVenteClick(vente)}>
                        <Eye size={14} style={{marginRight: 4}} /> Voir
                      </button>
                      <button className="btn-action print" onClick={() => genererFacture(vente)}>
                        <Printer size={14} style={{marginRight: 4}} /> Facture
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredVentes.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="empty-row">
                    <div className="empty-state">
                      <Search size={40} />
                      <p>Aucune vente trouvée.</p>
                      <button className="clear-filters-btn" onClick={resetFilters}>
                        Effacer les filtres
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      {showDetails && selectedVente && (
        <div className="modal-backdrop" onClick={closeDetails}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Vente #{selectedVente.id}</h2>
              <button className="close-btn" onClick={closeDetails}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-item">
                <label>Date:</label>
                <span>{formatDate(selectedVente.date_heure)}</span>
              </div>
              <div className="detail-item">
                <label>Vendeur:</label>
                <span>{selectedVente.utilisateur_nom}</span>
              </div>
              <div className="detail-item">
                <label>Client:</label>
                <span>{selectedVente.client_nom}</span>
              </div>
              <div className="detail-item">
                <label>Boutique:</label>
                <span>{selectedVente.boutique_nom}</span>
              </div>
              <hr />
              <div className="detail-item highlight">
                <label>Produit:</label>
                <span>{selectedVente.produit_nom}</span>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <label>Quantité:</label>
                  <span>{selectedVente.quantite}</span>
                </div>
                <div className="detail-item">
                  <label>Total Vente:</label>
                  <span>{formatMontant(selectedVente.montant_total)}</span>
                </div>

                <div className="detail-item">
                  <label>Coût Achat:</label>
                  <span style={{color: '#64748b'}}>
                    - {formatMontant(selectedVente.prix_achat * selectedVente.quantite)}
                  </span>
                </div>

                <div className="detail-item">
                  <label>Bénéfice:</label>
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

      {/* ✅ UTILISER LES MÊMES STYLES QUE L'HISTORIQUE VENTES */}
      <style jsx>{`
        .page-container { min-height: 100vh; background-color: #f8fafc; color: #1e293b; font-family: 'Inter', sans-serif; padding-bottom: 40px; }
        .loading-screen { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #64748b; }
        .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #4f46e5; border-radius: 50%; margin-bottom: 16px; animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .page-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 20; }
        .header-left { display: flex; align-items: center; gap: 24px; }
        .back-btn { display: flex; align-items: center; gap: 8px; color: #64748b; text-decoration: none; font-weight: 500; padding: 8px 12px; border-radius: 8px; }
        .back-btn:hover { background: #f1f5f9; color: #1e293b; }
        .title-block h1 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #0f172a; }
        .subtitle { margin: 4px 0 0; font-size: 0.85rem; color: #64748b; }
        .total-count { color: #0f172a; font-weight: 600; }
        .refresh-btn { background: #eff6ff; color: #4f46e5; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .refresh-btn:disabled { background: #9ca3af; cursor: not-allowed; }
        .content-wrapper { max-width: 1200px; margin: 30px auto; padding: 0 20px; }

        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .kpi-card { background: white; padding: 24px; border-radius: 16px; border: 1px solid #f1f5f9; display: flex; align-items: center; gap: 20px; box-shadow: 0 4px 6px -2px rgba(0,0,0,0.03); position: relative; overflow: hidden; }
        .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; width: 6px; height: 100%; }
        .kpi-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; position: relative; z-index: 1; }
        .kpi-info { display: flex; flex-direction: column; position: relative; z-index: 1; }
        .kpi-label { font-size: 0.85rem; color: #64748b; font-weight: 600; margin-bottom: 4px; }
        .kpi-value { font-size: 1.5rem; font-weight: 800; color: #1e293b; }
        .kpi-value.negative { color: #dc2626; }
        .kpi-card.purple .kpi-icon { background: linear-gradient(135deg, #8b5cf6, #6d28d9); } .kpi-card.purple::before { background: linear-gradient(to bottom, #8b5cf6, #6d28d9); }
        .kpi-card.green .kpi-icon { background: linear-gradient(135deg, #10b981, #059669); } .kpi-card.green::before { background: linear-gradient(to bottom, #10b981, #059669); }
        .kpi-card.blue .kpi-icon { background: linear-gradient(135deg, #3b82f6, #2563eb); } .kpi-card.blue::before { background: linear-gradient(to bottom, #3b82f6, #2563eb); }

        .filters-container { background: white; padding: 16px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); flex-wrap: wrap; }
        .search-group, .date-group { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .input-wrapper { position: relative; display: flex; align-items: center; }
        .input-icon { position: absolute; left: 12px; color: #94a3b8; pointer-events: none; }
        .input-wrapper input { padding: 10px 12px 10px 40px; border: 1px solid #e2e8f0; border-radius: 10px; outline: none; font-size: 0.9rem; color: #334155; width: 180px; }
        .input-wrapper input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .input-wrapper.date input { width: 140px; padding-right: 10px; }
        .separator { color: #cbd5e1; font-weight: 600; }
        .reset-btn, .apply-btn { height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 10px; cursor: pointer; transition: 0.2s; }
        .reset-btn { width: 38px; border: 1px solid #e2e8f0; background: white; color: #64748b; }
        .reset-btn:hover { background: #fef2f2; color: #ef4444; border-color: #fee2e2; }
        .apply-btn { background: #4f46e5; color: white; border: 1px solid #4f46e5; padding: 0 12px; }
        .apply-btn:hover { background: #4338ca; }

        .table-container { background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); overflow: hidden; border: 1px solid #f1f5f9; }
        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th { background: #f8fafc; padding: 16px 20px; text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
        .modern-table td { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; vertical-align: middle; }
        .modern-table tbody tr { cursor: pointer; transition: background 0.1s; }
        .modern-table tbody tr:hover { background: #f8fafc; }
        .col-id { font-family: 'Monaco', monospace; color: #64748b; font-size: 0.8rem; }
        .col-date { display: flex; flex-direction: column; }
        .date-main { font-weight: 500; color: #334155; }
        .date-sub { font-size: 0.75rem; color: #94a3b8; }
        .col-prod { display: flex; align-items: center; }
        .prod-cell { display: flex; align-items: center; gap: 12px; }
        .prod-icon { width: 36px; height: 36px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #64748b; }
        .prod-info { display: flex; flex-direction: column; }
        .prod-name { font-weight: 600; color: #1e293b; }
        .prod-qty { font-size: 0.75rem; color: #64748b; }
        .badge-profit { padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; }
        .badge-profit.pos { background: #dcfce7; color: #166534; }
        .badge-profit.neg { background: #fee2e2; color: #991b1b; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; color: #0f172a; }

        .vente-row { cursor: pointer; }
        .action-row { display: flex; justify-content: center; gap: 8px; }
        .btn-action { display: flex; align-items: center; justify-content: center; padding: 6px 12px; border-radius: 6px; border: none; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-action.view { background-color: #e0e7ff; color: #4338ca; }
        .btn-action.view:hover { background-color: #4338ca; color: white; }
        .btn-action.print { background-color: #f1f5f9; color: #334155; }
        .btn-action.print:hover { background-color: #cbd5e1; color: #0f172a; }

        .empty-state { text-align: center; padding: 40px 20px; }
        .clear-filters-btn { margin-top: 12px; background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
        .clear-filters-btn:hover { background: #4338ca; }

        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .modal-card { background: white; width: 100%; max-width: 450px; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-header { padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(to right, #f8fafc, #f1f5f9); }
        .modal-header h2 { margin: 0; font-size: 1.1rem; color: #334155; font-weight: 700; }
        .close-btn { background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; }
        .close-btn:hover { background: #f1f5f9; color: #64748b; }
        .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .detail-item { display: flex; justify-content: space-between; align-items: center; }
        .detail-item label { color: #64748b; font-size: 0.9rem; font-weight: 500; }
        .detail-item span { font-weight: 600; color: #1e293b; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .highlight span { color: #4f46e5; font-size: 1.1rem; font-weight: 700; }
        hr { border: 0; border-top: 1px solid #f1f5f9; margin: 4px 0; }
        .modal-footer { padding: 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
        .btn-print { width: 100%; background: linear-gradient(to right, #4f46e5, #6366f1); color: white; border: none; padding: 14px; border-radius: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3); }
        .btn-print:hover { background: linear-gradient(to right, #4338ca, #4f46e5); transform: translateY(-1px); box-shadow: 0 6px 8px -1px rgba(79, 70, 229, 0.4); }

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

        @media (max-width: 768px) {
          .page-header { padding: 16px; flex-direction: column; align-items: flex-start; gap: 16px; }
          .header-right, .refresh-btn { width: 100%; justify-content: center; }
          .filters-container { flex-direction: column; align-items: stretch; gap: 12px; }
          .input-wrapper input { width: 100%; }
          .modern-table thead { display: none; }
          .modern-table, .modern-table tbody, .modern-table tr, .modern-table td { display: block; width: 100%; }
          .modern-table tr { margin-bottom: 16px; border-radius: 12px; border: 1px solid #e2e8f0; padding: 0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .modern-table td { padding: 12px 16px; border: none; text-align: left; display: flex; flex-direction: column; }
          .col-id { background: linear-gradient(to right, #f8fafc, #f1f5f9); padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #4f46e5; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center; }
          .col-prod { background: #f8fafc; margin: 0; padding: 16px; border-bottom: 1px solid #e2e8f0; }
          .col-date { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; flex-direction: row; justify-content: space-between; }
          .modern-table td:not(.col-id):not(.col-prod):not(.col-date) { position: relative; padding-left: 120px; }
          .modern-table td:not(.col-id):not(.col-prod):not(.col-date)::before { content: attr(data-label); position: absolute; left: 16px; color: #64748b; font-weight: 500; font-size: 0.85rem; }
          .action-row { justify-content: flex-end; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9; }
          .btn-action { padding: 8px 16px; }
        }
      `}</style>
    </div>
  );
}