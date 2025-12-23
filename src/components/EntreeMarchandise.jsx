import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { produitAPI, fournisseurAPI, boutiqueAPI, profilAPI } from '../api'; // Ajout de profilAPI
import {
  ArrowLeft, Download, Plus, ShoppingCart, Package, Users,
  Home, Truck, Store, Calendar, FileText, DollarSign,
  AlertCircle, CheckCircle, Info, Loader, X, Archive
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

/**
 * HOC (Higher Order Component) pour protéger les pages
 */
export const withPermission = (Component, requiredRoles = ['gerant', 'admin']) => {
  return (props) => {
    const { loading, hasPermission, userRole } = usePermissionCheck(requiredRoles);

    if (loading) {
      return <LoadingScreen />;
    }

    if (!hasPermission) {
      return <AccessDenied userRole={userRole} requiredRoles={requiredRoles} />;
    }

    return <Component {...props} userRole={userRole} />;
  };
};

// =====================================================
// FIN DU COMPOSANT DE VÉRIFICATION
// =====================================================

export default function EntreeMarchandise({ isOnline }) {
  // --- 1. VÉRIFICATION PERMISSION ---
  const { loading: checkingPermissions, hasPermission, userRole } = usePermissionCheck(['gerant', 'admin']);

  const [produits, setProduits] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [entrees, setEntrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    produit: '',
    fournisseur: '',
    quantite: '',
    prix_achat: '',
    boutique: '',
    notes: ''
  });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // --- 2. CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    // On charge les données uniquement si on a la permission
    if (!checkingPermissions && hasPermission) {
      loadData();
    } else if (!isOnline && !checkingPermissions) {
      // Fallback si hors ligne
      loadData();
    }
  }, [isOnline, checkingPermissions, hasPermission]);

  const loadData = async () => {
    if (!isOnline) {
      showMessage('Mode hors ligne - Fonctionnalité limitée', 'warning');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [produitsRes, fournisseursRes, boutiquesRes, entreesRes] = await Promise.all([
        produitAPI.list(),
        fournisseurAPI.list(),
        boutiqueAPI.list(),
        api.get('/entrees-marchandise/')
      ]);

      const produitsData = produitsRes.data.results || produitsRes.data;
      const fournisseursData = fournisseursRes.data.results || fournisseursRes.data;
      const boutiquesData = boutiquesRes.data.results || boutiquesRes.data;
      const entreesData = entreesRes.data.results || entreesRes.data;

      setProduits(produitsData);
      setFournisseurs(fournisseursData);
      setBoutiques(boutiquesData);
      setEntrees(entreesData);

      if (boutiquesData.length > 0 && !formData.boutique) {
        setFormData(prev => ({ ...prev, boutique: boutiquesData[0].id }));
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      showMessage('Erreur lors du chargement', 'error');
    }
    setLoading(false);
  };

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const calculateMontantTotal = () => {
    const quantite = parseFloat(formData.quantite) || 0;
    const prixAchat = parseFloat(formData.prix_achat) || 0;
    return quantite * prixAchat;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isOnline) {
      showMessage('Connexion Internet requise', 'error');
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        quantite: parseInt(formData.quantite),
        prix_achat: parseFloat(formData.prix_achat),
        montant_total: calculateMontantTotal()
      };

      await api.post('/entrees-marchandise/', dataToSend);
      showMessage('✅ Entrée de marchandise enregistrée avec succès');

      handleCancelForm();
      await loadData();
    } catch (error) {
      console.error('Erreur sauvegarde entrée:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.detail || error.message;
      showMessage('❌ Erreur: ' + errorMsg, 'error');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setFormData({
      produit: '',
      fournisseur: '',
      quantite: '',
      prix_achat: '',
      boutique: boutiques.length > 0 ? boutiques[0].id : '',
      notes: ''
    });
  };

  // --- 3. RENDER PERMISSION ---
  if (checkingPermissions) return <LoadingScreen />;
  if (!hasPermission && isOnline) return <AccessDenied userRole={userRole} />;

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn"><ArrowLeft size={20} /><span>Retour</span></Link>
          <div className="title-block">
            <h1>Entrées Marchandise</h1>
            <p className="subtitle">{entrees.length} réapprovisionnements</p>
          </div>
        </div>
        <div className="header-right">
          {isOnline && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={18} /> Nouvelle Entrée
            </button>
          )}
        </div>
      </header>

      <div className="content-wrapper">

        {message && (
          <div className={`alert-box ${messageType}`}>
             {messageType === 'error' ? <AlertCircle size={20}/> : messageType === 'info' ? <Info size={20}/> : <CheckCircle size={20}/>}
             <span>{message}</span>
          </div>
        )}

        {loading ? (
           <div className="loading-state"><Loader className="spin" size={32} /><p>Chargement...</p></div>
        ) : entrees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Download size={40} /></div>
            <h3>Aucune entrée de marchandise</h3>
            <p>Enregistrez vos approvisionnements pour suivre le stock</p>
          </div>
        ) : (
          <div className="grid-container">
            {entrees.map(entree => (
              <div key={entree.id} className="card">
                <div className="card-header">
                  <div className="avatar-placeholder light-blue">
                     <Package size={20} />
                  </div>
                  <div className="card-title-block">
                    <h3>{entree.produit_nom || `Produit #${entree.produit}`}</h3>
                    <span className="stock-badge">+{entree.quantite} en stock</span>
                  </div>
                </div>

                <div className="card-body">
                  {entree.fournisseur_nom && (
                    <div className="info-row">
                      <Truck size={14} />
                      <span>{entree.fournisseur_nom}</span>
                    </div>
                  )}

                  <div className="info-row">
                    <DollarSign size={14} />
                    <span>{Number(entree.prix_achat).toLocaleString()} FCFA / unité</span>
                  </div>

                  <div className="total-box-small">
                    <span className="label">TOTAL</span>
                    <span className="value">{Number(entree.montant_total).toLocaleString()} FCFA</span>
                  </div>

                  {entree.notes && (
                    <div className="notes-box">
                      <FileText size={12} />
                      <p>{entree.notes}</p>
                    </div>
                  )}
                </div>

                <div className="card-footer">
                   <Calendar size={12} />
                   <span>{new Date(entree.date_entree).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                   </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL FORMULAIRE */}
      {showForm && (
        <div className="modal-backdrop" onClick={handleCancelForm}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvelle Entrée</h2>
              <button className="close-btn" onClick={handleCancelForm}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Produit *</label>
                <div className="input-wrapper">
                  <Package size={18} className="input-icon" />
                  <select
                    value={formData.produit}
                    onChange={(e) => setFormData({ ...formData, produit: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner un produit</option>
                    {produits.map(produit => (
                      <option key={produit.id} value={produit.id}>
                        {produit.nom} (Stock: {produit.quantite})
                      </option>
                    ))}
                  </select>
                </div>
                {produits.length === 0 && <small className="help-text">⚠️ Aucun produit. <Link to="/produits">Créer un produit</Link></small>}
              </div>

              <div className="form-group">
                <label>Fournisseur</label>
                <div className="input-wrapper">
                  <Truck size={18} className="input-icon" />
                  <select
                    value={formData.fournisseur}
                    onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                  >
                    <option value="">Optionnel</option>
                    {fournisseurs.map(fournisseur => (
                      <option key={fournisseur.id} value={fournisseur.id}>{fournisseur.nom}</option>
                    ))}
                  </select>
                </div>
                {fournisseurs.length === 0 && <small className="help-text"><Link to="/fournisseurs">Ajouter un fournisseur</Link></small>}
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Quantité *</label>
                  <div className="input-wrapper">
                    <Archive size={18} className="input-icon" />
                    <input
                      type="number"
                      min="1"
                      value={formData.quantite}
                      onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                      required
                      placeholder="Ex: 50"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Prix Achat Unitaire *</label>
                  <div className="input-wrapper">
                    <DollarSign size={18} className="input-icon" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.prix_achat}
                      onChange={(e) => setFormData({ ...formData, prix_achat: e.target.value })}
                      required
                      placeholder="Ex: 500"
                    />
                  </div>
                </div>
              </div>

              {formData.quantite && formData.prix_achat && (
                <div className="total-preview">
                  <span>Montant Total</span>
                  <strong>{calculateMontantTotal().toLocaleString()} FCFA</strong>
                </div>
              )}

              <div className="form-group">
                <label>Boutique *</label>
                <div className="input-wrapper">
                  <Store size={18} className="input-icon" />
                  <select
                    value={formData.boutique}
                    onChange={(e) => setFormData({ ...formData, boutique: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner une boutique</option>
                    {boutiques.map(boutique => (
                      <option key={boutique.id} value={boutique.id}>{boutique.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <div className="input-wrapper">
                   <FileText size={18} className="input-icon" />
                   <textarea
                     value={formData.notes}
                     onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                     placeholder="Informations complémentaires..."
                     rows="2"
                     style={{paddingLeft: '40px', paddingTop: '10px'}}
                   />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={handleCancelForm} className="btn-cancel">Annuler</button>
                <button type="submit" className="btn-submit" disabled={produits.length === 0}>Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <Link to="/dashboard" className="nav-item"><Home size={20} /><span>Accueil</span></Link>
        <Link to="/ventes" className="nav-item"><ShoppingCart size={20} /><span>Ventes</span></Link>
        <Link to="/produits" className="nav-item active"><Package size={20} /><span>Stock</span></Link>
        <Link to="/clients" className="nav-item"><Users size={20} /><span>Clients</span></Link>
      </nav>

      <style jsx>{`
        .page-container { min-height: 100vh; background-color: #f8fafc; color: #1e293b; font-family: 'Inter', sans-serif; padding-bottom: 90px; }

        /* HEADER */
        .page-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 20; }
        .header-left { display: flex; align-items: center; gap: 24px; }
        .back-btn { display: flex; align-items: center; gap: 8px; color: #64748b; text-decoration: none; font-weight: 500; padding: 8px 12px; border-radius: 8px; transition: 0.2s; }
        .back-btn:hover { background: #f1f5f9; color: #1e293b; }
        .title-block h1 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #0f172a; }
        .subtitle { margin: 4px 0 0; font-size: 0.85rem; color: #64748b; }
        .btn-primary { background: #4f46e5; color: white; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; }
        .btn-primary:hover { background: #4338ca; }

        .content-wrapper { max-width: 1200px; margin: 30px auto; padding: 0 20px; }

        /* GRID CARDS */
        .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .card { background: white; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -2px rgba(0,0,0,0.03); overflow: hidden; transition: transform 0.2s; }
        .card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }

        .card-header { padding: 20px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #f1f5f9; background: linear-gradient(to right, #ffffff, #f8fafc); }
        .avatar-placeholder { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; flex-shrink: 0; }
        .avatar-placeholder.light-blue { background: #e0f2fe; color: #0ea5e9; }

        .card-title-block { flex: 1; min-width: 0; }
        .card-title-block h3 { margin: 0 0 4px 0; font-size: 1.1rem; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .stock-badge { font-size: 0.75rem; color: #166534; background: #dcfce7; padding: 4px 8px; border-radius: 6px; font-weight: 600; width: fit-content; }

        .card-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
        .info-row { display: flex; align-items: center; gap: 10px; color: #64748b; font-size: 0.9rem; }
        .info-row svg { color: #94a3b8; }

        .total-box-small { background: #f8fafc; border-radius: 8px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e2e8f0; margin-top: 4px; }
        .total-box-small .label { font-size: 0.7rem; color: #94a3b8; font-weight: 700; letter-spacing: 0.05em; }
        .total-box-small .value { font-size: 1rem; color: #4f46e5; font-weight: 700; }

        .notes-box { display: flex; gap: 8px; background: #fffbeb; padding: 10px; border-radius: 8px; margin-top: 4px; border: 1px solid #fef3c7; }
        .notes-box p { margin: 0; font-size: 0.8rem; color: #92400e; font-style: italic; }
        .notes-box svg { color: #d97706; flex-shrink: 0; margin-top: 2px; }

        .card-footer { padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #94a3b8; display: flex; align-items: center; justify-content: flex-end; gap: 6px; }

        /* EMPTY & LOADING */
        .empty-state { text-align: center; padding: 60px 20px; color: #64748b; background: white; border-radius: 16px; border: 1px dashed #e2e8f0; }
        .empty-icon { width: 64px; height: 64px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #94a3b8; }
        .loading-state { text-align: center; padding: 40px; color: #64748b; }
        .spin { animation: spin 1s linear infinite; }

        /* MODAL & FORMS */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; animation: fadeIn 0.2s; }
        .modal-card { background: white; width: 100%; max-width: 500px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); margin: 20px; max-height: 90vh; overflow-y: auto; }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; position: sticky; top: 0; z-index: 10; }
        .modal-header h2 { margin: 0; font-size: 1.25rem; color: #1e293b; }
        .close-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; transition: 0.2s; }
        .close-btn:hover { color: #ef4444; }

        .modal-body { padding: 24px; }
        .input-wrapper { position: relative; display: flex; align-items: center; }
        .input-icon { position: absolute; left: 14px; color: #94a3b8; pointer-events: none; }
        .input-wrapper input, .input-wrapper select, .input-wrapper textarea { width: 100%; padding: 12px 14px 12px 40px; border: 1px solid #e2e8f0; border-radius: 10px; outline: none; font-size: 0.95rem; color: #1e293b; background: white; appearance: none; }
        .input-wrapper input:focus, .input-wrapper select:focus, .input-wrapper textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; color: #64748b; font-size: 0.85rem; font-weight: 600; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .help-text { font-size: 0.8rem; color: #ef4444; margin-top: 4px; display: block; }
        .help-text a { color: #4f46e5; text-decoration: underline; font-weight: 600; }

        .total-preview { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; font-weight: 600; }
        .total-preview strong { font-size: 1.2rem; }

        .modal-footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; position: sticky; bottom: 0; }
        .btn-cancel { padding: 10px 20px; border: 1px solid #e2e8f0; background: white; color: #64748b; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn-cancel:hover { background: #f1f5f9; color: #1e293b; }
        .btn-submit { padding: 10px 20px; border: none; background: #4f46e5; color: white; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn-submit:hover:not(:disabled) { background: #4338ca; }
        .btn-submit:disabled { background: #94a3b8; cursor: not-allowed; }

        /* ALERTES */
        .alert-box { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-weight: 500; }
        .alert-box.success { background: #ecfdf5; color: #047857; border: 1px solid #d1fae5; }
        .alert-box.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; }
        .alert-box.info { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }
        .alert-box.warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

        /* BOTTOM NAV */
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-around; padding: 12px 0; z-index: 100; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.02); }
        .nav-item { display: flex; flex-direction: column; align-items: center; text-decoration: none; color: #94a3b8; font-size: 0.75rem; font-weight: 500; gap: 4px; transition: 0.2s; }
        .nav-item.active { color: #4f46e5; }
        .nav-item:hover { color: #475569; }

        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        @media (max-width: 640px) {
          .page-header { flex-direction: column; align-items: flex-start; gap: 16px; padding: 16px; }
          .header-right { width: 100%; display: flex; justify-content: flex-end; }
          .grid-container { grid-template-columns: 1fr; }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}