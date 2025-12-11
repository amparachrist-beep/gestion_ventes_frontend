import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { venteAPI, profilAPI } from '../api';
import {
  ArrowLeft, Search, Calendar, User, Package,
  Eye, Printer, TrendingUp, DollarSign, ShoppingBag,
  FilterX, ChevronRight, Store, ChevronLeft,
  Download, AlertCircle, BarChart3, FileText,
  ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  const [statsGlobales, setStatsGlobales] = useState({
    totalVentes: 0,
    totalBenefice: 0,
    nombreVentes: 0,
    margeMoyenne: 0
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filtres de base
  const [filter, setFilter] = useState({
    date_debut: '',
    date_fin: '',
    client: '',
    produit: '',
    vendeur: '',
    boutique: ''
  });

  // Filtres avancés
  const [advancedFilter, setAdvancedFilter] = useState({
    min_montant: '',
    max_montant: '',
    min_benefice: '',
    max_benefice: '',
    statut: '',
    mode_paiement: ''
  });

  const [selectedVente, setSelectedVente] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // 'today', 'week', 'month', 'year', 'all'

  // Charger le rôle de l'utilisateur
  useEffect(() => {
    loadCurrentUserRole();
  }, []);

  // Charger les données quand les filtres changent
  useEffect(() => {
    if (currentUserRole !== null) {
      loadData();
      loadStatsGlobales();
    }
  }, [isOnline, page, currentUserRole, selectedPeriod]);

  // Définir la période automatiquement
  useEffect(() => {
    applyPeriodFilter(selectedPeriod);
  }, [selectedPeriod]);

  const loadCurrentUserRole = async () => {
    try {
      const response = await profilAPI.me();
      setCurrentUserRole(response.data.role);
    } catch (error) {
      console.error('Erreur chargement rôle:', error);
      setCurrentUserRole('gerant');
    }
  };

  const applyPeriodFilter = (period) => {
    const now = new Date();
    let dateDebut = '';
    let dateFin = format(new Date(), 'yyyy-MM-dd');

    switch (period) {
      case 'today':
        dateDebut = format(now, 'yyyy-MM-dd');
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        dateDebut = format(yesterday, 'yyyy-MM-dd');
        dateFin = format(yesterday, 'yyyy-MM-dd');
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateDebut = format(weekAgo, 'yyyy-MM-dd');
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setDate(1);
        dateDebut = format(monthAgo, 'yyyy-MM-dd');
        break;
      case 'year':
        dateDebut = `${now.getFullYear()}-01-01`;
        break;
      case 'all':
      default:
        dateDebut = '';
        dateFin = '';
    }

    setFilter(prev => ({
      ...prev,
      date_debut: dateDebut,
      date_fin: dateFin
    }));
  };

  const loadData = useCallback(async (isLoadMore = false) => {
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
      // Préparer les paramètres
      const params = {
        page,
        page_size: pageSize,
        ...filter
      };

      // Nettoyer les paramètres vides
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      console.log('📊 Chargement historiques avec params:', params);

      // Appeler l'API avec les paramètres optimisés
      const response = await venteAPI.historique({ params });

      let rawVentes = [];
      let count = 0;
      let stats = {};

      // Traiter la réponse selon le format
      if (response.data) {
        if (Array.isArray(response.data)) {
          rawVentes = response.data;
          count = response.data.length;
        } else if (response.data.results) {
          rawVentes = response.data.results;
          count = response.data.count || 0;
          stats = response.data.stats || {};
        } else if (response.data.ventes) {
          rawVentes = response.data.ventes;
          count = response.data.count || 0;
          stats = response.data.stats || {};
        } else {
          rawVentes = response.data;
          count = response.data.length || 0;
        }
      }

      console.log(`📈 ${rawVentes.length} ventes chargées`);

      // Enrichir les données
      const ventesEnrichies = enrichirVentes(rawVentes);

      // Trier par date
      const ventesTriees = ventesEnrichies.sort((a, b) =>
        new Date(b.date_heure) - new Date(a.date_heure)
      );

      if (isLoadMore) {
        setVentes(prev => [...prev, ...ventesTriees]);
      } else {
        setVentes(ventesTriees);
      }

      setTotalCount(count);

      // Mettre à jour les stats si disponibles
      if (stats && Object.keys(stats).length > 0) {
        setStatsGlobales({
          totalVentes: stats.total_ventes || 0,
          totalBenefice: stats.total_benefice || 0,
          nombreVentes: stats.count || ventesTriees.length,
          margeMoyenne: stats.marge_moyenne || 0
        });
      }

    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      setError(err.response?.data?.detail || 'Impossible de charger l\'historique des ventes.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [isOnline, page, pageSize, filter]);

  const loadStatsGlobales = async () => {
    try {
      const params = {
        ...filter,
        include_stats: true
      };

      const response = await venteAPI.list({ params });

      if (response.data && response.data.stats) {
        const stats = response.data.stats;
        setStatsGlobales({
          totalVentes: stats.total_ventes || 0,
          totalBenefice: stats.total_benefice || 0,
          nombreVentes: stats.count || 0,
          margeMoyenne: stats.marge_moyenne || 0
        });
      }
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  };

  const enrichirVentes = (rawVentes) => {
    return rawVentes.map(vente => {
      // Récupérer les données du backend
      const montantTotal = parseFloat(vente.montant_total) || 0;
      const quantite = parseInt(vente.quantite) || 1;
      const coutAchatTotal = parseFloat(vente.cout_achat_total) || 0;

      // Calculer le bénéfice (priorité: backend > calcul)
      let benefice = 0;
      if (vente.benefice !== undefined) {
        benefice = parseFloat(vente.benefice);
      } else if (vente.marge_brute !== undefined) {
        benefice = parseFloat(vente.marge_brute);
      } else {
        benefice = montantTotal - coutAchatTotal;
      }

      // Calculer les prix unitaires
      const prixUnitaire = quantite > 0 ? montantTotal / quantite : 0;
      const prixAchatUnitaire = quantite > 0 ? coutAchatTotal / quantite : 0;

      // Récupérer les noms
      const produitNom = vente.produit_nom ||
                       (vente.produit_details?.nom) ||
                       (vente.produit?.nom) ||
                       'Produit supprimé';

      const boutiqueNom = vente.boutique_nom ||
                         (vente.boutique?.nom) ||
                         'Boutique inconnue';

      const utilisateurNom = vente.vendeur_nom ||
                           (vente.utilisateur_nom) ||
                           (vente.utilisateur?.username) ||
                           'Inconnu';

      const clientNom = vente.client_nom ||
                       (vente.client?.nom) ||
                       'Client Comptoir';

      return {
        ...vente,
        // Données financières
        montant_total: montantTotal,
        cout_achat_total: coutAchatTotal,
        quantite,
        benefice,
        prix_unitaire: prixUnitaire,
        prix_achat_unitaire: prixAchatUnitaire,
        marge_pourcentage: vente.marge_pourcentage ||
                          (coutAchatTotal > 0 ? (benefice / coutAchatTotal) * 100 : 0),

        // Noms pour affichage
        produit_nom: produitNom,
        boutique_nom: boutiqueNom,
        utilisateur_nom: utilisateurNom,
        client_nom: clientNom,

        // Détails
        produit_details: vente.produit_details || vente.produit,
        boutique_details: vente.boutique,
        utilisateur_details: vente.utilisateur,
        client_details: vente.client
      };
    });
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  const handleAdvancedFilterChange = (e) => {
    const { name, value } = e.target;
    setAdvancedFilter(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setHasFilters(true);
    setPage(1);
    setVentes([]);
    loadData();
    loadStatsGlobales();
  };

  const applyAllFilters = () => {
    // Fusionner les filtres de base et avancés
    const allFilters = { ...filter, ...advancedFilter };
    setFilter(allFilters);
    applyFilters();
  };

  const resetFilters = () => {
    setFilter({
      date_debut: '',
      date_fin: '',
      client: '',
      produit: '',
      vendeur: '',
      boutique: ''
    });
    setAdvancedFilter({
      min_montant: '',
      max_montant: '',
      min_benefice: '',
      max_benefice: '',
      statut: '',
      mode_paiement: ''
    });
    setSelectedPeriod('all');
    setHasFilters(false);
    setPage(1);
    setVentes([]);
    loadData();
  };

  const handleExport = async (format = 'excel') => {
    setExporting(true);
    try {
      const params = { ...filter, format };
      const response = await venteAPI.export({ params });

      if (format === 'excel') {
        // Télécharger le fichier Excel
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ventes_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else if (format === 'pdf') {
        // Pour PDF, le backend doit retourner un blob
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ventes_export_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error('Erreur export:', error);
      setError('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  // Formateurs
  const formatMontant = (m) => {
    const amount = parseFloat(m) || 0;
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' FCFA';
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const formatShortDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'HH:mm', { locale: fr });
    } catch {
      return '';
    }
  };

  // Calculer les totaux locaux (fallback)
  const totalVentes = ventes.reduce((sum, v) => sum + (v.montant_total || 0), 0);
  const totalBenefice = ventes.reduce((sum, v) => sum + (v.benefice || 0), 0);

  const genererFacture = (vente) => {
    const windowFeatures = 'width=800,height=600,scrollbars=yes';
    const factureWindow = window.open('', '_blank', windowFeatures);

    const factureHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture #${vente.id}</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; color: #333; }
          .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; }
          .company-info h1 { color: #4f46e5; margin: 0; }
          .invoice-info { text-align: right; }
          .invoice-info h2 { margin: 0; color: #333; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .detail-box { background: #f8fafc; padding: 15px; border-radius: 8px; }
          .detail-box h3 { margin-top: 0; color: #64748b; font-size: 14px; }
          .products-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          .products-table th { background: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; color: #475569; }
          .products-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
          .total-row { font-weight: bold; }
          .footer { text-align: center; margin-top: 50px; color: #94a3b8; font-size: 12px; }
          .print-btn { display: none; }
          @media print {
            .print-btn { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              <h1>GestionStock</h1>
              <p>Système de Gestion Commerciale</p>
            </div>
            <div class="invoice-info">
              <h2>FACTURE</h2>
              <p><strong>N°:</strong> ${String(vente.id).padStart(6, '0')}</p>
              <p><strong>Date:</strong> ${formatDate(vente.date_heure)}</p>
            </div>
          </div>

          <div class="details-grid">
            <div class="detail-box">
              <h3>INFORMATIONS BOUTIQUE</h3>
              <p><strong>${vente.boutique_nom}</strong></p>
              <p>Vendeur: ${vente.utilisateur_nom}</p>
            </div>
            <div class="detail-box">
              <h3>INFORMATIONS CLIENT</h3>
              <p><strong>${vente.client_nom}</strong></p>
              ${vente.client_details?.telephone ? `<p>Tél: ${vente.client_details.telephone}</p>` : ''}
            </div>
          </div>

          <table class="products-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantité</th>
                <th>Prix Unit.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${vente.produit_nom}</strong></td>
                <td>${vente.quantite}</td>
                <td>${formatMontant(vente.prix_unitaire)}</td>
                <td>${formatMontant(vente.montant_total)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align: right;"><strong>TOTAL À PAYER:</strong></td>
                <td><strong>${formatMontant(vente.montant_total)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Merci pour votre confiance !</p>
            <p>Facture générée le ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => { window.close(); }, 1000);
          };
        </script>
      </body>
      </html>
    `;

    factureWindow.document.write(factureHTML);
    factureWindow.document.close();
  };

  if (loading && page === 1) {
    return (
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
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

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
          <div className="header-actions">
            <button
              className="export-btn"
              onClick={() => handleExport('excel')}
              disabled={exporting}
            >
              {exporting ? (
                <RefreshCw size={18} className="spin" />
              ) : (
                <Download size={18} />
              )}
              <span>Excel</span>
            </button>
            <button
              className="export-btn pdf"
              onClick={() => handleExport('pdf')}
              disabled={exporting}
            >
              <FileText size={18} />
              <span>PDF</span>
            </button>
            <button className="refresh-btn" onClick={() => loadData()}>
              <RefreshCw size={18} /> Actualiser
            </button>
          </div>
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

        {/* Statistiques */}
        <section className="kpi-grid">
          <div className="kpi-card purple">
            <div className="kpi-icon-wrapper">
              <div className="kpi-icon"><DollarSign size={24} /></div>
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Chiffre d'Affaires</span>
              <span className="kpi-value">
                {formatMontant(statsGlobales.totalVentes || totalVentes)}
              </span>
            </div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-icon-wrapper">
              <div className="kpi-icon"><TrendingUp size={24} /></div>
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Bénéfice Net</span>
              <span className="kpi-value">
                {formatMontant(statsGlobales.totalBenefice || totalBenefice)}
              </span>
              {statsGlobales.margeMoyenne > 0 && (
                <span className="kpi-subtext">
                  Marge: {statsGlobales.margeMoyenne.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="kpi-card blue">
            <div className="kpi-icon-wrapper">
              <div className="kpi-icon"><ShoppingBag size={24} /></div>
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Volume Ventes</span>
              <span className="kpi-value">{statsGlobales.nombreVentes || ventes.length}</span>
            </div>
          </div>
          <div className="kpi-card orange">
            <div className="kpi-icon-wrapper">
              <div className="kpi-icon"><BarChart3 size={24} /></div>
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Valeur Moyenne</span>
              <span className="kpi-value">
                {ventes.length > 0 ? formatMontant(totalVentes / ventes.length) : '0 FCFA'}
              </span>
            </div>
          </div>
        </section>

        {/* Filtres Rapides */}
        <section className="quick-filters">
          <div className="period-buttons">
            {['today', 'yesterday', 'week', 'month', 'year', 'all'].map((period) => (
              <button
                key={period}
                className={`period-btn ${selectedPeriod === period ? 'active' : ''}`}
                onClick={() => setSelectedPeriod(period)}
              >
                {{
                  today: 'Aujourd\'hui',
                  yesterday: 'Hier',
                  week: '7 jours',
                  month: 'Ce mois',
                  year: 'Cette année',
                  all: 'Tout'
                }[period]}
              </button>
            ))}
          </div>
          <button
            className="advanced-toggle"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Filtres avancés
          </button>
        </section>

        {/* Filtres de base */}
        <section className="filters-container">
          <div className="search-group">
            <div className="input-wrapper">
              <Search size={18} className="input-icon" />
              <input
                type="text"
                name="produit"
                placeholder="Rechercher produit..."
                value={filter.produit}
                onChange={handleFilterChange}
              />
            </div>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                type="text"
                name="client"
                placeholder="Client..."
                value={filter.client}
                onChange={handleFilterChange}
              />
            </div>
            <div className="input-wrapper">
              <Store size={18} className="input-icon" />
              <input
                type="text"
                name="vendeur"
                placeholder="Vendeur..."
                value={filter.vendeur}
                onChange={handleFilterChange}
              />
            </div>
          </div>
          <div className="date-group">
            <div className="input-wrapper date">
              <Calendar size={18} className="input-icon" />
              <input
                type="date"
                name="date_debut"
                value={filter.date_debut}
                onChange={handleFilterChange}
              />
            </div>
            <span className="separator">à</span>
            <div className="input-wrapper date">
              <Calendar size={18} className="input-icon" />
              <input
                type="date"
                name="date_fin"
                value={filter.date_fin}
                onChange={handleFilterChange}
              />
            </div>
            <div className="filter-actions">
              <button className="apply-btn" onClick={applyFilters}>
                <Search size={16} /> Filtrer
              </button>
              <button className="reset-btn" onClick={resetFilters}>
                <FilterX size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* Filtres avancés */}
        {showAdvancedFilters && (
          <section className="advanced-filters">
            <h3>Filtres avancés</h3>
            <div className="advanced-grid">
              <div className="input-wrapper">
                <label>Montant min</label>
                <input
                  type="number"
                  name="min_montant"
                  placeholder="0"
                  value={advancedFilter.min_montant}
                  onChange={handleAdvancedFilterChange}
                />
              </div>
              <div className="input-wrapper">
                <label>Montant max</label>
                <input
                  type="number"
                  name="max_montant"
                  placeholder="1000000"
                  value={advancedFilter.max_montant}
                  onChange={handleAdvancedFilterChange}
                />
              </div>
              <div className="input-wrapper">
                <label>Bénéfice min</label>
                <input
                  type="number"
                  name="min_benefice"
                  placeholder="0"
                  value={advancedFilter.min_benefice}
                  onChange={handleAdvancedFilterChange}
                />
              </div>
              <div className="input-wrapper">
                <label>Bénéfice max</label>
                <input
                  type="number"
                  name="max_benefice"
                  placeholder="500000"
                  value={advancedFilter.max_benefice}
                  onChange={handleAdvancedFilterChange}
                />
              </div>
            </div>
            <div className="advanced-actions">
              <button className="apply-advanced-btn" onClick={applyAllFilters}>
                Appliquer tous les filtres
              </button>
            </div>
          </section>
        )}

        {/* Tableau des ventes */}
        <section className="table-container">
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Produit</th>
                  <th>Qté</th>
                  <th>Vendeur</th>
                  <th>Client</th>
                  <th className="text-right">Montant</th>
                  <th className="text-right">Coût</th>
                  <th className="text-right">Bénéfice</th>
                  <th className="text-right">Marge</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ventes.map(vente => (
                  <tr
                    key={vente.id}
                    className="vente-row"
                    onClick={() => { setSelectedVente(vente); setShowDetails(true); }}
                  >
                    <td className="col-id">
                      <span className="id-badge">#{vente.id}</span>
                    </td>
                    <td className="col-date">
                      <div className="date-block">
                        <span className="date-main">{formatShortDate(vente.date_heure)}</span>
                        <span className="date-sub">{formatTime(vente.date_heure)}</span>
                      </div>
                    </td>
                    <td className="col-prod">
                      <div className="prod-cell">
                        <div className="prod-icon"><Package size={16} /></div>
                        <div className="prod-info">
                          <span className="prod-name">{vente.produit_nom}</span>
                          <span className="prod-price">
                            {formatMontant(vente.prix_unitaire)}/u
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="col-qty">
                      <span className="qty-badge">{vente.quantite}</span>
                    </td>
                    <td className="col-vendeur">
                      <span className="badge-user">{vente.utilisateur_nom}</span>
                    </td>
                    <td className="col-client">
                      <span className="text-client">{vente.client_nom}</span>
                    </td>
                    <td className="text-right montant-col">
                      <div className="montant-display">
                        <span className="montant-value">{formatMontant(vente.montant_total)}</span>
                      </div>
                    </td>
                    <td className="text-right cout-col">
                      <div className="cout-display">
                        <span className="cout-value">{formatMontant(vente.cout_achat_total)}</span>
                      </div>
                    </td>
                    <td className="text-right benefice-col">
                      <div className={`benefice-display ${vente.benefice >= 0 ? 'positive' : 'negative'}`}>
                        <span className="benefice-value">{formatMontant(vente.benefice)}</span>
                      </div>
                    </td>
                    <td className="text-right marge-col">
                      <div className="marge-display">
                        <span className={`marge-value ${vente.marge_pourcentage >= 0 ? 'positive' : 'negative'}`}>
                          {vente.marge_pourcentage?.toFixed(1) || '0.0'}%
                        </span>
                      </div>
                    </td>
                    <td className="text-center action-col" onClick={(e) => e.stopPropagation()}>
                      <div className="action-row">
                        <button
                          className="btn-icon view"
                          title="Voir détails"
                          onClick={() => { setSelectedVente(vente); setShowDetails(true); }}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="btn-icon print"
                          title="Imprimer facture"
                          onClick={() => genererFacture(vente)}
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {ventes.length === 0 && !loading && (
                  <tr>
                    <td colSpan="11" className="empty-row">
                      <div className="empty-state">
                        <div className="empty-icon"><Search size={32} /></div>
                        <p>Aucune vente trouvée pour les critères sélectionnés.</p>
                        {hasFilters && (
                          <button className="clear-filters-btn" onClick={resetFilters}>
                            Effacer tous les filtres
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
                <span className="total-label">({totalCount} éléments)</span>
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  <ChevronLeft size={16} /><ChevronLeft size={16} />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="pagination-btn"
                  onClick={loadMore}
                  disabled={loadingMore || ventes.length >= totalCount}
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setPage(Math.ceil(totalCount / pageSize) || 1)}
                  disabled={ventes.length >= totalCount}
                >
                  <ChevronRight size={16} /><ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modal de détails */}
      {showDetails && selectedVente && (
        <div className="modal-backdrop" onClick={() => setShowDetails(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <h2>Détails de la Vente</h2>
                <span className="id-badge">#{selectedVente.id}</span>
              </div>
              <button className="close-btn" onClick={() => setShowDetails(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Date et Heure</span>
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
                  <span className="prod-title">{selectedVente.produit_nom}</span>
                </div>
                <div className="prod-details">
                  <div className="detail-row">
                    <span>Quantité</span>
                    <strong>{selectedVente.quantite}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Prix de vente unitaire</span>
                    <strong>{formatMontant(selectedVente.prix_unitaire)}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Prix d'achat unitaire</span>
                    <strong>{formatMontant(selectedVente.prix_achat_unitaire)}</strong>
                  </div>
                </div>
              </div>

              <div className="financial-summary">
                <div className="summary-row">
                  <span>Total Vente</span>
                  <span className="amount total-vente">
                    {formatMontant(selectedVente.montant_total)}
                  </span>
                </div>
                <div className="summary-row sub">
                  <span>Coût d'achat total</span>
                  <span className="amount cout-achat">
                    - {formatMontant(selectedVente.cout_achat_total)}
                  </span>
                </div>
                <div className="summary-row total">
                  <span>Bénéfice Net</span>
                  <span className={`amount benefice ${selectedVente.benefice >= 0 ? 'positive' : 'negative'}`}>
                    {formatMontant(selectedVente.benefice)}
                  </span>
                </div>
                <div className="summary-row marge">
                  <span>Marge bénéficiaire</span>
                  <span className={`marge-value ${selectedVente.marge_pourcentage >= 0 ? 'positive' : 'negative'}`}>
                    {selectedVente.marge_pourcentage?.toFixed(2) || '0.00'}%
                  </span>
                </div>
              </div>

              {selectedVente.notes && (
                <div className="notes-section">
                  <h4>Notes</h4>
                  <p>{selectedVente.notes}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-print"
                onClick={() => genererFacture(selectedVente)}
              >
                <Printer size={18} /> Imprimer Facture
              </button>
              <button
                className="btn-close"
                onClick={() => setShowDetails(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* --- STYLES GÉNÉRAUX --- */
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

        .back-btn:hover {
          color: #334155;
        }

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

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #10b981;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .export-btn.pdf {
          background: #ef4444;
        }

        .export-btn:hover {
          background: #059669;
        }

        .export-btn.pdf:hover {
          background: #dc2626;
        }

        .export-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          color: #334155;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* --- STATISTIQUES --- */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .kpi-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .kpi-card.purple { border-left: 4px solid #8b5cf6; }
        .kpi-card.green { border-left: 4px solid #10b981; }
        .kpi-card.blue { border-left: 4px solid #3b82f6; }
        .kpi-card.orange { border-left: 4px solid #f59e0b; }

        .kpi-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kpi-card.purple .kpi-icon-wrapper { background: #f3f0ff; color: #8b5cf6; }
        .kpi-card.green .kpi-icon-wrapper { background: #d1fae5; color: #10b981; }
        .kpi-card.blue .kpi-icon-wrapper { background: #dbeafe; color: #3b82f6; }
        .kpi-card.orange .kpi-icon-wrapper { background: #fef3c7; color: #f59e0b; }

        .kpi-info {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .kpi-label {
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .kpi-value {
          color: #111827;
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .kpi-subtext {
          color: #6b7280;
          font-size: 0.75rem;
          margin-top: 2px;
        }

        /* --- FILTRES RAPIDES --- */
        .quick-filters {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .period-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .period-btn {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          font-size: 0.875rem;
          color: #4b5563;
          cursor: pointer;
          transition: all 0.2s;
        }

        .period-btn:hover {
          border-color: #9ca3af;
          background: #f9fafb;
        }

        .period-btn.active {
          background: #4f46e5;
          color: white;
          border-color: #4f46e5;
        }

        .advanced-toggle {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: #6b7280;
          font-size: 0.875rem;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .advanced-toggle:hover {
          background: #f3f4f6;
        }

        /* --- FILTRES --- */
        .filters-container {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .search-group, .date-group {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
        }

        .input-wrapper {
          position: relative;
          flex: 1;
          min-width: 180px;
        }

        .input-wrapper label {
          display: block;
          margin-bottom: 4px;
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
        }

        .input-wrapper input {
          width: 100%;
          padding: 10px 12px 10px 40px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #374151;
          background: white;
          transition: all 0.2s;
        }

        .input-wrapper input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .separator {
          color: #9ca3af;
          font-size: 0.875rem;
          padding: 0 4px;
        }

        .filter-actions {
          display: flex;
          gap: 8px;
        }

        .apply-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #4f46e5;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .apply-btn:hover {
          background: #4338ca;
        }

        .reset-btn {
          background: #f3f4f6;
          color: #6b7280;
          border: 1px solid #d1d5db;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .reset-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        /* --- FILTRES AVANCÉS --- */
        .advanced-filters {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .advanced-filters h3 {
          margin: 0 0 16px 0;
          color: #374151;
          font-size: 1rem;
          font-weight: 600;
        }

        .advanced-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .advanced-actions {
          display: flex;
          justify-content: flex-end;
        }

        .apply-advanced-btn {
          background: #8b5cf6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .apply-advanced-btn:hover {
          background: #7c3aed;
        }

        /* --- TABLEAU --- */
        .table-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .modern-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1200px;
        }

        .modern-table th {
          background: #f9fafb;
          padding: 16px 20px;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }

        .modern-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.875rem;
          color: #374151;
          vertical-align: middle;
        }

        .modern-table tbody tr {
          cursor: pointer;
          transition: background 0.1s;
        }

        .modern-table tbody tr:hover {
          background: #f9fafb;
        }

        .vente-row {
          border-left: 3px solid transparent;
        }

        .vente-row:hover {
          border-left-color: #4f46e5;
        }

        /* Colonnes spécifiques */
        .col-id .id-badge {
          display: inline-block;
          background: #f3f4f6;
          color: #6b7280;
          padding: 4px 8px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .date-block {
          display: flex;
          flex-direction: column;
        }

        .date-main {
          font-weight: 500;
          color: #111827;
        }

        .date-sub {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 2px;
        }

        .prod-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .prod-icon {
          width: 36px;
          height: 36px;
          background: #f3f0ff;
          border-radius: 8px;
          color: #8b5cf6;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .prod-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .prod-name {
          font-weight: 500;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .prod-price {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 2px;
        }

        .col-qty .qty-badge {
          display: inline-block;
          background: #dbeafe;
          color: #1e40af;
          padding: 4px 10px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .badge-user {
          display: inline-block;
          background: #f3f4f6;
          color: #4b5563;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .text-client {
          font-weight: 500;
          color: #374151;
          white-space: nowrap;
        }

        .text-right {
          text-align: right;
        }

        .text-center {
          text-align: center;
        }

        .montant-display, .cout-display, .benefice-display, .marge-display {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .montant-value, .cout-value, .benefice-value, .marge-value {
          font-weight: 600;
          white-space: nowrap;
        }

        .montant-col .montant-value {
          color: #111827;
        }

        .cout-col .cout-value {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .benefice-display.positive .benefice-value {
          color: #059669;
        }

        .benefice-display.negative .benefice-value {
          color: #dc2626;
        }

        .marge-value.positive {
          color: #059669;
        }

        .marge-value.negative {
          color: #dc2626;
        }

        .action-row {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .btn-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-icon.view {
          background: #dbeafe;
          color: #1e40af;
        }

        .btn-icon.view:hover {
          background: #bfdbfe;
        }

        .btn-icon.print {
          background: #f3f4f6;
          color: #4b5563;
        }

        .btn-icon.print:hover {
          background: #e5e7eb;
        }

        /* --- ÉTAT VIDE --- */
        .empty-row {
          padding: 60px 20px !important;
          text-align: center;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #9ca3af;
          max-width: 400px;
          margin: 0 auto;
        }

        .empty-icon {
          background: #f3f4f6;
          padding: 20px;
          border-radius: 50%;
          margin-bottom: 16px;
          color: #9ca3af;
        }

        .empty-state p {
          margin: 8px 0 16px;
          color: #6b7280;
        }

        .clear-filters-btn {
          background: white;
          border: 1px solid #d1d5db;
          color: #4f46e5;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .clear-filters-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        /* --- PAGINATION --- */
        .pagination-container {
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f9fafb;
        }

        .pagination-info {
          font-size: 0.875rem;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pagination-info .divider {
          margin: 0 4px;
          color: #d1d5db;
        }

        .pagination-info .total-label {
          margin-left: 8px;
          color: #9ca3af;
        }

        .pagination-controls {
          display: flex;
          gap: 8px;
        }

        .pagination-btn {
          width: 36px;
          height: 36px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          border-color: #9ca3af;
          background: #f3f4f6;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f9fafb;
        }

        /* --- MODAL --- */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-card {
          background: white;
          width: 100%;
          max-width: 600px;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          animation: slideUp 0.3s ease-out;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: #f9fafb;
        }

        .modal-title {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .modal-title h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #111827;
          font-weight: 600;
        }

        .modal-header .id-badge {
          font-size: 0.75rem;
          color: #6b7280;
          background: #e5e7eb;
          padding: 2px 8px;
          border-radius: 4px;
          font-family: monospace;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          color: #9ca3af;
          cursor: pointer;
          line-height: 1;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .close-btn:hover {
          background: #e5e7eb;
        }

        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
        }

        .info-item .label {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
          font-weight: 600;
        }

        .info-item .value {
          font-size: 0.95rem;
          color: #111827;
          font-weight: 500;
        }

        .product-card {
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          border: 1px solid #e5e7eb;
        }

        .prod-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .prod-header svg {
          color: #8b5cf6;
        }

        .prod-title {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
        }

        .prod-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail-row span {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .detail-row strong {
          color: #111827;
          font-size: 0.95rem;
          font-weight: 600;
        }

        .financial-summary {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-size: 0.95rem;
        }

        .summary-row.sub {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .summary-row.total {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 2px solid #e5e7eb;
          font-weight: 700;
          font-size: 1.1rem;
          color: #111827;
        }

        .summary-row.marge {
          margin-top: 8px;
          font-size: 0.875rem;
        }

        .summary-row .amount {
          font-weight: 600;
        }

        .summary-row.total .benefice.positive {
          color: #059669;
        }

        .summary-row.total .benefice.negative {
          color: #dc2626;
        }

        .marge-value.positive {
          color: #059669;
          font-weight: 600;
        }

        .marge-value.negative {
          color: #dc2626;
          font-weight: 600;
        }

        .notes-section {
          background: #f9fafb;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid #e5e7eb;
        }

        .notes-section h4 {
          margin: 0 0 8px 0;
          color: #111827;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .notes-section p {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .modal-footer {
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: #f9fafb;
        }

        .btn-print, .btn-close {
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .btn-print {
          background: #4f46e5;
          color: white;
          border: none;
        }

        .btn-print:hover {
          background: #4338ca;
        }

        .btn-close {
          background: white;
          border: 1px solid #d1d5db;
          color: #374151;
        }

        .btn-close:hover {
          background: #f3f4f6;
        }

        /* --- ALERTES --- */
        .alert-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .alert-box.danger svg {
          color: #dc2626;
        }

        .retry-btn {
          margin-left: auto;
          background: #dc2626;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: background 0.2s;
        }

        .retry-btn:hover {
          background: #b91c1c;
        }

        /* --- RESPONSIVE --- */
        @media (max-width: 768px) {
          .page-container {
            padding: 16px;
          }

          .page-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .header-right {
            justify-content: flex-start;
          }

          .kpi-grid {
            grid-template-columns: 1fr;
          }

          .quick-filters {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .period-buttons {
            justify-content: center;
          }

          .search-group, .date-group {
            flex-direction: column;
            width: 100%;
          }

          .input-wrapper {
            width: 100%;
          }

          .filter-actions {
            width: 100%;
          }

          .apply-btn, .reset-btn {
            flex: 1;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .modal-card {
            max-height: 95vh;
          }
        }

        @media (max-width: 640px) {
          .header-actions {
            flex-wrap: wrap;
          }

          .export-btn, .refresh-btn {
            flex: 1;
            justify-content: center;
          }

          .advanced-grid {
            grid-template-columns: 1fr;
          }

          .pagination-container {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .pagination-controls {
            justify-content: center;
          }

          .modal-footer {
            flex-direction: column;
          }

          .btn-print, .btn-close {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}