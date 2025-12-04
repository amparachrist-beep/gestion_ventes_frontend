// src/components/HistoriqueMesVentes.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { venteAPI, produitAPI, profilAPI, boutiqueAPI } from '../api'; // ✅ Ajout boutiqueAPI

export default function HistoriqueMesVentes({ isOnline }) {
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profil, setProfil] = useState(null);

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
      // 1. Récupérer toutes les données nécessaires
      const [profilRes, ventesRes, produitsRes, boutiquesRes] = await Promise.all([
        profilAPI.me(),
        venteAPI.list(),
        produitAPI.list(),
        boutiqueAPI.list() // ✅ On charge les boutiques pour avoir les noms
      ]);

      setProfil(profilRes.data);

      const rawVentes = Array.isArray(ventesRes.data) ? ventesRes.data : ventesRes.data?.results || [];
      const rawProduits = Array.isArray(produitsRes.data) ? produitsRes.data : produitsRes.data?.results || [];
      const rawBoutiques = Array.isArray(boutiquesRes.data) ? boutiquesRes.data : boutiquesRes.data?.results || [];

      // 2. Maps pour accès rapide
      const produitsMap = {};
      rawProduits.forEach(p => produitsMap[p.id] = p);

      const boutiquesMap = {};
      rawBoutiques.forEach(b => boutiquesMap[b.id] = b);

      // 3. Nom du vendeur (l'utilisateur connecté)
      // On gère le cas où first_name/last_name ne sont pas définis
      const user = profilRes.data.user || profilRes.data; // Dépend de la structure de votre API profil
      const vendeurNomComplet = (user.first_name && user.last_name)
        ? `${user.first_name} ${user.last_name}`
        : (user.username || 'Moi');

      // 4. Filtrer et Enrichir les ventes
      const ventesEnrichies = rawVentes
        .filter(vente => String(vente.utilisateur) === String(profilRes.data.id)) // ✅ Uniquement MES ventes
        .map(vente => {
          const produit = produitsMap[vente.produit];

          // ✅ Récupération du nom de la boutique (Priorité ID vente > ID produit)
          const boutiqueId = vente.boutique || (produit ? produit.boutique : null);
          const boutiqueObj = boutiquesMap[boutiqueId];
          const boutique_nom = boutiqueObj ? boutiqueObj.nom : 'N/A';

          // Calculs
          const prix_achat = produit ? parseFloat(produit.prix_achat) || 0 : 0;
          const montant_total = parseFloat(vente.montant_total) || 0;
          const quantite = parseInt(vente.quantite) || 1;
          const benefice = montant_total - (prix_achat * quantite);
          const benefice_pourcentage = prix_achat > 0 ? (benefice / (prix_achat * quantite)) * 100 : 0;

          return {
            ...vente,
            prix_achat,
            montant_total,
            quantite,
            benefice,
            benefice_pourcentage,
            produit_nom: produit ? produit.nom : 'Produit supprimé',
            boutique_nom: boutique_nom, // ✅ Corrigé
            utilisateur_nom: vendeurNomComplet // ✅ Ajouté
          };
        });

      setVentes(ventesEnrichies);

    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      setError('❌ Impossible de charger vos ventes.');
    } finally {
      setLoading(false);
    }
  };

  // --- FILTRAGE LOCAL ---
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

  // --- UTILITAIRES ---
  const formatMontant = (montant) => (parseFloat(montant) || 0).toLocaleString() + ' FCFA';

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR') + ' ' + new Date(dateString).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
  };

  const handleVenteClick = (vente) => { setSelectedVente(vente); setShowDetails(true); };
  const closeDetails = () => { setShowDetails(false); setSelectedVente(null); };

  // --- FACTURE ---
  const genererFacture = (vente) => {
    const factureWindow = window.open('', '_blank');
    const dateFacture = new Date().toLocaleDateString('fr-FR');

    // ✅ Utilisation du nom du vendeur récupéré
    const vendeurNom = vente.utilisateur_nom || 'Vendeur';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture #${vente.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .boutique { font-size: 24px; font-weight: bold; color: #2c5530; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f4f4f4; }
          .total { text-align: right; font-size: 18px; font-weight: bold; }
          .footer { text-align: center; font-size: 12px; margin-top: 30px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="boutique">${vente.boutique_nom}</div>
          <div>Facture de Vente</div>
        </div>
        <div class="info">
          <div>
            <strong>Date:</strong> ${formatDate(vente.date_heure)}<br>
            <strong>Vendeur:</strong> ${vendeurNom}<br>
            <strong>Client:</strong> ${vente.client_nom || 'Comptoir'}
          </div>
          <div>
            <strong>N° Facture:</strong> #${vente.id}
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Produit</th><th>Qté</th><th>Prix Unit.</th><th>Total</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>${vente.produit_nom}</td>
              <td>${vente.quantite}</td>
              <td>${formatMontant(vente.montant_total / vente.quantite)}</td>
              <td>${formatMontant(vente.montant_total)}</td>
            </tr>
          </tbody>
        </table>
        <div class="total">Total à payer: ${formatMontant(vente.montant_total)}</div>
        <div class="footer">Merci de votre visite !</div>
        <script>window.print();</script>
      </body>
      </html>
    `;
    factureWindow.document.write(htmlContent);
    factureWindow.document.close();
  };

  const totalVentes = filteredVentes.reduce((sum, v) => sum + v.montant_total, 0);
  const totalBenefice = filteredVentes.reduce((sum, v) => sum + v.benefice, 0);

  if (loading) return <div className="page"><div className="loading-container"><div className="spinner"></div><p>Chargement...</p></div></div>;

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/dashboard" className="btn-back">← Retour</Link>
        <h1>📋 Mes Ventes</h1>
        <button onClick={loadData} className="btn-refresh" disabled={!isOnline}>🔄 Actualiser</button>
      </header>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button className="retry-btn" onClick={loadData}>Réessayer</button>
        </div>
      )}

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h3>Total Mes Ventes</h3>
            <p className="summary-value">{formatMontant(totalVentes)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">📈</div>
          <div className="summary-content">
            <h3>Mon Bénéfice</h3>
            <p className={`summary-value ${totalBenefice >= 0 ? 'positive' : 'negative'}`}>
              {formatMontant(totalBenefice)}
            </p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <h3>Nombre Ventes</h3>
            <p className="summary-value">{filteredVentes.length}</p>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <h2>Filtres</h2>
        <div className="filters-grid">
          <div className="form-group">
            <label>Date début</label>
            <input type="date" name="date_debut" value={filter.date_debut} onChange={handleFilterChange} className="form-input" />
          </div>
          <div className="form-group">
            <label>Date fin</label>
            <input type="date" name="date_fin" value={filter.date_fin} onChange={handleFilterChange} className="form-input" />
          </div>
          <div className="form-group">
            <label>Client</label>
            <input type="text" name="client" value={filter.client} onChange={handleFilterChange} placeholder="Client..." className="form-input" />
          </div>
          <div className="form-group">
            <label>Produit</label>
            <input type="text" name="produit" value={filter.produit} onChange={handleFilterChange} placeholder="Produit..." className="form-input" />
          </div>
        </div>
        <div className="filters-actions">
          <button onClick={resetFilters} className="btn-secondary">Réinitialiser</button>
        </div>
      </div>

      <div className="ventes-section">
        <div className="ventes-table-container">
          <table className="ventes-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Vendeur</th> {/* ✅ Nouvelle colonne */}
                <th>Client</th>
                <th>Produit</th>
                <th>Qté</th>
                <th>Montant</th>
                <th>Bénéfice</th>
                <th>Boutique</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVentes.map(vente => (
                <tr key={vente.id} className="vente-row">
                  <td>#{vente.id}</td>
                  <td>{formatDate(vente.date_heure)}</td>
                  <td style={{fontWeight:'bold', color:'#4f46e5'}}>{vente.utilisateur_nom}</td> {/* ✅ Donnée ajoutée */}
                  <td>{vente.client_nom || 'Comptoir'}</td>
                  <td>{vente.produit_nom}</td>
                  <td>{vente.quantite}</td>
                  <td className="montant">{formatMontant(vente.montant_total)}</td>
                  <td className={`benefice ${vente.benefice >= 0 ? 'positive' : 'negative'}`}>
                    {formatMontant(vente.benefice)}
                  </td>
                  <td>{vente.boutique_nom}</td> {/* ✅ Donnée corrigée */}
                  <td>
                    <div className="actions-buttons">
                      <button className="btn-details" onClick={() => handleVenteClick(vente)}>👁️</button>
                      <button className="btn-facture" onClick={() => genererFacture(vente)}>🧾</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredVentes.length === 0 && (
                <tr><td colSpan="10" style={{textAlign:'center', padding:'20px'}}>Aucune vente trouvée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetails && selectedVente && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Vente #{selectedVente.id}</h2>
              <button className="modal-close" onClick={closeDetails}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-row"><span className="detail-label">Date:</span><span>{formatDate(selectedVente.date_heure)}</span></div>
              <div className="detail-row"><span className="detail-label">Vendeur:</span><span>{selectedVente.utilisateur_nom}</span></div>
              <div className="detail-row"><span className="detail-label">Client:</span><span>{selectedVente.client_nom || 'Comptoir'}</span></div>
              <div className="detail-row"><span className="detail-label">Produit:</span><span>{selectedVente.produit_nom}</span></div>
              <div className="detail-row"><span className="detail-label">Qté:</span><span>{selectedVente.quantite}</span></div>
              <div className="detail-row"><span className="detail-label">Total:</span><span className="montant">{formatMontant(selectedVente.montant_total)}</span></div>
              <div className="detail-row"><span className="detail-label">Boutique:</span><span>{selectedVente.boutique_nom}</span></div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={closeDetails}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 16px;
          min-height: 100vh;
          background: #f8fafc;
          padding-bottom: 80px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 0;
          margin-bottom: 24px;
        }

        .btn-back {
          background: #6b7280;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 14px;
          transition: background 0.2s;
        }

        .btn-back:hover {
          background: #4b5563;
        }

        .btn-refresh {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-refresh:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .btn-refresh:hover:not(:disabled) {
          background: #4338ca;
        }

        .error-message {
          background: #fee2e2;
          color: #dc2626;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid #fecaca;
        }

        .retry-btn {
          background: #dc2626;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          margin-left: 16px;
        }

        .retry-btn:hover {
          background: #b91c1c;
        }

        /* Cartes de résumé */
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .summary-icon {
          font-size: 32px;
        }

        .summary-content h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          color: #6b7280;
        }

        .summary-value {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
        }

        .summary-value.positive {
          color: #059669;
        }

        .summary-value.negative {
          color: #dc2626;
        }

        .filters-section {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          margin-bottom: 24px;
        }

        .filters-section h2 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 18px;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .form-input {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .filters-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background: #4338ca;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .ventes-section {
          margin-bottom: 32px;
        }

        .ventes-section h2 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 18px;
        }

        .ventes-table-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          overflow: hidden;
        }

        .ventes-table {
          width: 100%;
          border-collapse: collapse;
        }

        .ventes-table th {
          background: #f9fafb;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }

        .ventes-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .vente-row {
          cursor: pointer;
        }

        .vente-row:hover {
          background: #f9fafb;
        }

        .total-row {
          background: #f9fafb;
          font-weight: 600;
        }

        .montant {
          font-weight: 600;
          color: #059669;
        }

        .benefice {
          font-weight: 600;
        }

        .benefice.positive {
          color: #059669;
        }

        .benefice.negative {
          color: #dc2626;
        }

        .actions-buttons {
          display: flex;
          gap: 8px;
          justify-content: center;
        }

        .btn-details {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 6px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.2s;
        }

        .btn-details:hover {
          background: #2563eb;
        }

        .btn-facture {
          background: #10b981;
          color: white;
          border: none;
          padding: 6px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.2s;
        }

        .btn-facture:hover {
          background: #059669;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          margin: 40px 0;
        }

        .empty-state p {
          margin: 8px 0;
          color: #6b7280;
        }

        .empty-state p:first-child {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          color: #6b7280;
        }

        .spinner {
          border: 3px solid #f3f4f6;
          border-top: 3px solid #4f46e5;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Modal de détails */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 18px;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #6b7280;
        }

        .modal-body {
          padding: 20px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .detail-label {
          font-weight: 600;
          color: #6b7280;
        }

        .detail-value {
          color: #1f2937;
        }

        .detail-value.positive {
          color: #059669;
        }

        .detail-value.negative {
          color: #dc2626;
        }

        .modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-around;
          padding: 12px 0;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          color: #6b7280;
          font-size: 12px;
          gap: 4px;
        }

        .nav-item.active {
          color: #4f46e5;
        }

        .nav-item span:first-child {
          font-size: 20px;
        }

        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }

          .ventes-table-container {
            overflow-x: auto;
          }

          .ventes-table {
            min-width: 800px;
          }

          .summary-cards {
            grid-template-columns: 1fr;
          }

          .actions-buttons {
            flex-direction: column;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
}