import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { produitAPI, boutiqueAPI, profilAPI } from '../api';
import { useScanDetection } from '../hooks/useScanDetection';
import {
  Package, Plus, Search, Barcode, Trash2, Edit, // Ajout de Edit
  AlertCircle, CheckCircle, X, LayoutGrid,
  TrendingUp, DollarSign, ArrowLeft
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
    <Link to="/dashboard" className="back-btn-denied">
      <ArrowLeft size={16} /> Retour au tableau de bord
    </Link>
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
      .back-btn-denied {
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
      }
      .back-btn-denied:hover {
        background: #4338ca;
      }
    `}</style>
  </div>
);

// =====================================================
// FIN DU COMPOSANT DE VÉRIFICATION
// =====================================================

export default function Produits({ isOnline }) {
  // --- 1. VÉRIFICATION PERMISSION ---
  const { loading: checkingPermissions, hasPermission, userRole } = usePermissionCheck(['gerant', 'admin']);

  // --- ÉTATS ---
  const [produits, setProduits] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); // Pour savoir si on modifie

  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    prix_achat: '',
    prix: '',
    quantite: '',
    code_barre: '',
    boutique: ''
  });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // --- SON & SCANNER ---
  const playBeep = () => {
    const audio = new Audio('/beep.mp3');
    audio.play().catch(e => console.log("Audio play failed", e));
  };

  useScanDetection({
    onScan: (barcode) => {
      if (showModal) {
        playBeep();
        setFormData(prev => ({ ...prev, code_barre: barcode }));
        showMessage(`✅ Code barre scanné: ${barcode}`, 'success');
      } else {
        playBeep();
        setSearchTerm(barcode);
        showMessage(`🔍 Recherche: ${barcode}`, 'info');
      }
    }
  });

  // --- CHARGEMENT ---
  useEffect(() => {
    if (isOnline && hasPermission) {
      loadData();
    } else if (!isOnline) {
      setLoading(false);
    }
  }, [isOnline, hasPermission]);

  const loadData = async (search = '') => {
    setLoading(true);
    try {
      const params = search ? { search } : {};
      const [produitsRes, boutiquesRes] = await Promise.all([
        produitAPI.list({ params }),
        boutiqueAPI.list()
      ]);

      setProduits(produitsRes.data.results || produitsRes.data || []);
      const boutiquesData = boutiquesRes.data.results || boutiquesRes.data || [];
      setBoutiques(boutiquesData);

      // Initialiser la boutique par défaut
      if (boutiquesData.length > 0 && !formData.boutique) {
        setFormData(prev => ({ ...prev, boutique: boutiquesData[0].id }));
      }
    } catch (error) {
      console.error('Erreur:', error);
      showMessage('Erreur de connexion', 'error');
    }
    setLoading(false);
  };

  // --- ACTIONS ---
  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const resetForm = () => {
    setFormData({ nom: '', description: '', prix_achat: '', prix: '', quantite: '', code_barre: '', boutique: boutiques[0]?.id });
    setEditingId(null);
    setShowModal(false);
  };

  // Préparer la modification
  const handleEdit = (produit) => {
    setEditingId(produit.id);
    setFormData({
      nom: produit.nom,
      description: produit.description || '',
      prix_achat: produit.prix_achat,
      prix: produit.prix,
      quantite: produit.quantite,
      code_barre: produit.code_barre || '',
      boutique: produit.boutique // Assurez-vous que l'API renvoie l'ID ou l'objet boutique
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOnline) return showMessage('❌ Connexion requise', 'error');

    if (!formData.nom || !formData.prix_achat || !formData.prix) {
      return showMessage('❌ Champs obligatoires manquants', 'error');
    }

    const payload = {
      ...formData,
      prix_achat: parseFloat(formData.prix_achat),
      prix: parseFloat(formData.prix),
      quantite: parseInt(formData.quantite) || 0,
      boutique: formData.boutique || boutiques[0]?.id
    };

    try {
      if (editingId) {
        // Mode Modification
        await produitAPI.update(editingId, payload);
        showMessage('✅ Produit modifié avec succès');
      } else {
        // Mode Création
        await produitAPI.create(payload);
        showMessage('✅ Produit ajouté au stock');
      }
      resetForm();
      loadData(searchTerm);
    } catch (error) {
      console.error(error);
      showMessage('❌ Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!isOnline) return showMessage('Connexion requise', 'error');
    if (!window.confirm('Voulez-vous vraiment supprimer ce produit ?')) return;

    try {
      await produitAPI.delete(id);
      showMessage('🗑️ Produit supprimé');
      loadData(searchTerm);
    } catch (error) {
      showMessage('Erreur suppression', 'error');
    }
  };

  // --- CALCULS & FILTRES ---
  const filteredProduits = useMemo(() => {
    let data = produits.map(p => ({
      ...p,
      marge: (p.prix || 0) - (p.prix_achat || 0),
      marge_pct: p.prix_achat > 0 ? (((p.prix - p.prix_achat) / p.prix_achat) * 100) : 0,
      stock_valeur: (p.quantite || 0) * (p.prix_achat || 0)
    }));

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(p =>
        p.nom.toLowerCase().includes(lower) ||
        (p.code_barre && p.code_barre.includes(lower))
      );
    }
    return data;
  }, [produits, searchTerm]);

  // --- RENDER PERMISSION ---
  if (checkingPermissions) return <LoadingScreen />;
  if (!hasPermission) return <AccessDenied userRole={userRole} />;

  // --- RENDER NORMAL ---
  if (loading && !isOnline) return <div className="loading-screen">Connexion requise...</div>;

  return (
    <div className="page-container">
      {/* HEADER FIXE */}
      <header className="header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn"><ArrowLeft size={20}/></Link>
          <div>
            <h1>Catalogue Produits</h1>
            <p className="subtitle">{filteredProduits.length} références</p>
          </div>
        </div>
        <button className="btn-add" onClick={() => { resetForm(); setShowModal(true); }} disabled={!isOnline}>
          <Plus size={20} />
          <span className="btn-text">Nouveau Produit</span>
        </button>
      </header>

      <div className="content-wrapper">
        {/* BARRE DE RECHERCHE */}
        <div className="search-container">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Rechercher par nom ou scanner un code-barre..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* MESSAGES ALERTE */}
        {message && (
          <div className={`toast ${messageType}`}>
            {messageType === 'error' ? <AlertCircle size={18}/> : <CheckCircle size={18}/>}
            <span>{message}</span>
          </div>
        )}

        {/* GRILLE PRODUITS */}
        {loading ? (
          <div className="loader-container"><div className="spinner"></div></div>
        ) : filteredProduits.length === 0 ? (
          <div className="empty-state">
            <Package size={48} />
            <h3>Aucun produit trouvé</h3>
            <p>Ajoutez des produits ou modifiez votre recherche.</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProduits.map((item) => (
              <div key={item.id} className="product-card">
                <div className="card-top">
                  <div className="icon-box">
                    <Package size={24} />
                  </div>
                  {/* Plus de bouton supprimer ici */}
                </div>

                <div className="card-info">
                  <h3>{item.nom}</h3>
                  <div className="badges">
                    <span className={`badge-stock ${item.quantite === 0 ? 'out' : item.quantite < 5 ? 'low' : 'ok'}`}>
                      {item.quantite === 0 ? 'Épuisé' : `${item.quantite} en stock`}
                    </span>
                    {item.code_barre && (
                      <span className="badge-code"><Barcode size={12}/> {item.code_barre}</span>
                    )}
                  </div>
                </div>

                <div className="card-pricing">
                  <div className="price-main">
                    <span className="label">Prix Vente</span>
                    <span className="value">{item.prix.toLocaleString()} FCFA</span>
                  </div>
                  <div className="price-sub">
                    <span>Achat: {item.prix_achat.toLocaleString()}</span>
                    <span className={item.marge >= 0 ? 'profit' : 'loss'}>
                      Marge: {Math.round(item.marge_pct)}%
                    </span>
                  </div>
                </div>

                {/* --- NOUVEAUX BOUTONS D'ACTION EN BAS DE CARTE --- */}
                {isOnline && (
                  <div className="card-actions-footer">
                    <button className="btn-action edit" onClick={() => handleEdit(item)}>
                      <Edit size={16} /> Modifier
                    </button>
                    <button className="btn-action delete" onClick={() => handleDelete(item.id)}>
                      <Trash2 size={16} /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODAL FORMULAIRE --- */}
      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Modifier Produit' : 'Ajouter un Produit'}</h2>
              <button className="close-modal" onClick={resetForm}><X size={24}/></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Nom du produit</label>
                <input
                  type="text" required autoFocus
                  value={formData.nom}
                  onChange={e => setFormData({...formData, nom: e.target.value})}
                  placeholder="Ex: Savon, Eau..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Prix Achat (FCFA)</label>
                  <input
                    type="number" required
                    value={formData.prix_achat}
                    onChange={e => setFormData({...formData, prix_achat: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Prix Vente (FCFA)</label>
                  <input
                    type="number" required
                    value={formData.prix}
                    onChange={e => setFormData({...formData, prix: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantité Initiale</label>
                  <input
                    type="number" required
                    value={formData.quantite}
                    onChange={e => setFormData({...formData, quantite: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Code Barre <small>(Scan auto)</small></label>
                  <div className="input-icon-right">
                    <input
                      type="text"
                      value={formData.code_barre}
                      onChange={e => setFormData({...formData, code_barre: e.target.value})}
                      placeholder="Scanner..."
                    />
                    <Barcode size={18} className="icon"/>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Description (Optionnel)</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={resetForm}>Annuler</button>
                <button type="submit" className="btn-submit">
                  {editingId ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MENU MOBILE BAS */}
      <nav className="mobile-nav">
        <Link to="/dashboard" className="nav-item"><LayoutGrid size={20}/><span>Accueil</span></Link>
        <Link to="/ventes" className="nav-item"><DollarSign size={20}/><span>Vente</span></Link>
        <Link to="/produits" className="nav-item active"><Package size={20}/><span>Stock</span></Link>
        <Link to="/clients" className="nav-item"><TrendingUp size={20}/><span>Clients</span></Link>
      </nav>

      <style jsx>{`
        /* --- GLOBAL --- */
        .page-container {
          min-height: 100vh;
          background-color: #f8fafc;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          padding-bottom: 80px;
        }

        /* --- HEADER --- */
        .header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .back-btn {
          color: #64748b;
          padding: 8px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          transition: 0.2s;
        }
        .back-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .header h1 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
        }
        .subtitle {
          margin: 2px 0 0;
          font-size: 0.8rem;
          color: #64748b;
        }

        .btn-add {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: 0.2s;
          box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
        }
        .btn-add:hover:not(:disabled) {
          background: #4338ca;
          transform: translateY(-1px);
        }
        .btn-add:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* --- CONTENT --- */
        .content-wrapper {
          max-width: 1200px;
          margin: 24px auto;
          padding: 0 20px;
        }

        /* SEARCH */
        .search-container {
          position: relative;
          margin-bottom: 24px;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        .search-container input {
          width: 100%;
          padding: 14px 40px 14px 44px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 1rem;
          background: white;
          transition: 0.2s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .search-container input:focus {
          border-color: #6366f1;
          outline: none;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .clear-search {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
        }

        /* GRID */
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .product-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .product-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
        }

        .card-top {
          padding: 16px 16px 0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .icon-box {
          width: 48px;
          height: 48px;
          background: #f8fafc;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .card-info {
          padding: 16px;
          flex: 1;
        }
        .card-info h3 {
          margin: 0 0 8px;
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          line-height: 1.3;
        }

        .badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .badge-stock {
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 6px;
          font-weight: 600;
        }
        .badge-stock.ok {
          background: #dcfce7;
          color: #166534;
        }
        .badge-stock.low {
          background: #ffedd5;
          color: #9a3412;
        }
        .badge-stock.out {
          background: #fee2e2;
          color: #991b1b;
        }

        .badge-code {
          font-size: 0.7rem;
          background: #f1f5f9;
          color: #64748b;
          padding: 2px 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .card-pricing {
          background: #f8fafc;
          padding: 12px 16px;
          border-top: 1px solid #f1f5f9;
        }
        .price-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .price-main .label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
        }
        .price-main .value {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
        }

        .price-sub {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #94a3b8;
        }
        .profit {
          color: #10b981;
        }
        .loss {
          color: #ef4444;
        }

        /* ACTIONS FOOTER (Nouveau) */
        .card-actions-footer {
          display: flex;
          border-top: 1px solid #e2e8f0;
        }
        .btn-action {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-action.edit {
          background: white;
          color: #475569;
          border-right: 1px solid #e2e8f0;
        }
        .btn-action.edit:hover {
          background: #f8fafc;
          color: #1e293b;
        }
        .btn-action.delete {
          background: #fff5f5;
          color: #e53e3e;
        }
        .btn-action.delete:hover {
          background: #fee2e2;
          color: #c53030;
        }

        /* MODAL */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        .modal-content {
          background: white;
          width: 100%;
          max-width: 500px;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          overflow: hidden;
          animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          } to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }
        .close-modal {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
        }

        .modal-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          color: #334155;
        }
        .form-group input, .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.95rem;
          transition: 0.2s;
        }
        .form-group input:focus, .form-group textarea:focus {
          border-color: #4f46e5;
          outline: none;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .input-icon-right {
          position: relative;
        }
        .input-icon-right .icon {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          pointer-events: none;
        }

        .modal-footer {
          margin-top: 8px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .btn-cancel {
          background: #f1f5f9;
          color: #475569;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-submit {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-submit:hover {
          background: #4338ca;
        }

        /* TOAST */
        .toast {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: white;
          padding: 12px 24px;
          border-radius: 30px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          animation: slideUp 0.3s ease;
          z-index: 50;
        }
        .toast.error {
          background: #ef4444;
        }
        @keyframes slideUp {
          from {
            transform: translate(-50%, 20px);
            opacity: 0;
          } to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }

        /* LOADER & EMPTY */
        .loader-container {
          padding: 40px;
          display: flex;
          justify-content: center;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .empty-state {
          text-align: center;
          color: #94a3b8;
          padding: 60px 20px;
        }
        .empty-state h3 {
          color: #334155;
          margin: 16px 0 8px;
        }

        /* MOBILE NAV */
        .mobile-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-around;
          padding: 12px 0;
          padding-bottom: max(12px, env(safe-area-inset-bottom));
          z-index: 90;
        }
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.7rem;
          gap: 4px;
        }
        .nav-item.active {
          color: #4f46e5;
        }

        /* --- RESPONSIVE DESIGN --- */

        /* Petits écrans (mobiles) */
        @media (max-width: 480px) {
          .header {
            padding: 12px 16px;
          }

          .header h1 {
            font-size: 1.1rem;
          }

          .btn-text {
            display: none;
          }

          .btn-add {
            padding: 10px;
          }

          .content-wrapper {
            padding: 0 16px;
          }

          .products-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .product-card {
            flex-direction: row;
            flex-wrap: wrap; /* Ajout pour que le footer passe en dessous */
            align-items: center;
            padding: 0; /* padding géré par les sous-éléments */
          }

          .card-top {
            padding: 12px;
            margin-right: 0;
            width: auto;
          }

          .icon-box {
            width: 40px;
            height: 40px;
          }

          .card-info {
            padding: 12px 0;
            flex: 1;
          }

          .card-pricing {
            display: none;
          }

          .card-actions-footer {
            width: 100%; /* Prend toute la largeur sur mobile */
          }

          .badges {
            margin-top: 4px;
          }

          .modal-content {
            margin: 0 10px;
          }

          .modal-form {
            padding: 16px;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }

        /* Moyens écrans (tablettes) */
        @media (min-width: 481px) and (max-width: 768px) {
          .products-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .modal-content {
            max-width: 90%;
          }
        }

        /* Grands écrans (desktop) */
        @media (min-width: 769px) {
          .mobile-nav {
            display: none;
          }

          .page-container {
            padding-bottom: 0;
          }

          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          }
        }

        /* Très grands écrans */
        @media (min-width: 1200px) {
          .content-wrapper {
            max-width: 1400px;
          }

          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          }
        }

        /* Orientation paysage sur mobile */
        @media (max-height: 500px) and (orientation: landscape) {
          .modal-content {
            max-height: 90vh;
            overflow-y: auto;
          }

          .modal-form {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}