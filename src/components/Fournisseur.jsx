import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fournisseurAPI, boutiqueAPI, profilAPI } from '../api';
import {
  ArrowLeft, Search, Plus, Store, Trash2, Edit, // Edit2 remplacé par Edit pour cohérence
  User, Phone, Mail, MapPin, Truck, Home, ShoppingCart,
  Package, Users, Loader, CheckCircle, AlertCircle, Info, X
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
    <p>Vérification des permissions...</p>
    <style jsx>{`
      .loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; font-family: system-ui, -apple-system, sans-serif; color: #64748b; }
      .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top: 3px solid #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `}</style>
  </div>
);

export const AccessDenied = ({ userRole, requiredRoles = ['gérant', 'admin'] }) => (
  <div className="access-denied">
    <div className="denied-icon"><AlertCircle size={48} /></div>
    <h2>Accès Refusé</h2>
    <p>Cette page nécessite les permissions: <strong>{requiredRoles.join(', ')}</strong></p>
    {userRole && <p className="role-info">Votre rôle actuel: <strong>{userRole}</strong></p>}
    <Link to="/dashboard" className="back-btn-denied"><ArrowLeft size={16} /> Retour au tableau de bord</Link>
    <style jsx>{`
      .access-denied { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; font-family: system-ui, -apple-system, sans-serif; color: #64748b; text-align: center; padding: 20px; }
      .denied-icon { width: 80px; height: 80px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; color: #ef4444; }
      h2 { font-size: 1.5rem; font-weight: 600; color: #1e293b; margin: 0 0 10px 0; }
      .back-btn-denied { display: inline-flex; align-items: center; gap: 8px; background: #4f46e5; color: white; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 500; }
    `}</style>
  </div>
);

// =====================================================
// FIN DU COMPOSANT DE VÉRIFICATION
// =====================================================

export default function Fournisseur({ isOnline }) {
  // --- 1. VÉRIFICATION PERMISSION ---
  const { loading: checkingPermissions, hasPermission, userRole } = usePermissionCheck(['gerant', 'admin']);

  const [fournisseurs, setFournisseurs] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState(null);

  const [formData, setFormData] = useState({
    nom: '', contact: '', telephone: '', email: '', adresse: '', boutique: ''
  });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // --- 2. CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    if (!checkingPermissions && hasPermission) {
      loadData();
    } else if (!isOnline && !checkingPermissions) {
      loadData();
    }
  }, [isOnline, searchTerm, checkingPermissions, hasPermission]);

  const loadData = async () => {
    if (!isOnline) {
      showMessage('Mode hors ligne - Fonctionnalité limitée', 'warning');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const [fournisseursRes, boutiquesRes] = await Promise.all([
        fournisseurAPI.list({ params }),
        boutiqueAPI.list()
      ]);
      setFournisseurs(fournisseursRes.data.results || fournisseursRes.data);
      const boutiquesData = boutiquesRes.data.results || boutiquesRes.data;
      setBoutiques(boutiquesData);
      if (boutiquesData.length > 0 && !formData.boutique) {
        setFormData(prev => ({ ...prev, boutique: boutiquesData[0].id }));
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
      showMessage('Erreur lors du chargement', 'error');
    }
    setLoading(false);
  };

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOnline) return showMessage('Connexion Internet requise', 'error');

    try {
      if (editingFournisseur) {
        await fournisseurAPI.update(editingFournisseur.id, formData);
        showMessage('✅ Fournisseur mis à jour');
      } else {
        await fournisseurAPI.create(formData);
        showMessage('✅ Fournisseur créé');
        setSearchTerm('');
      }
      handleCancelForm();
      await loadData();
    } catch (error) {
      console.error('Erreur:', error);
      showMessage('❌ Erreur: ' + (error.response?.data?.message || error.message), 'error');
    }
  };

  const handleEdit = (fournisseur) => {
    setEditingFournisseur(fournisseur);
    setFormData({
      nom: fournisseur.nom,
      contact: fournisseur.contact || '',
      telephone: fournisseur.telephone || '',
      email: fournisseur.email || '',
      adresse: fournisseur.adresse || '',
      boutique: fournisseur.boutique
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return;
    if (!isOnline) return showMessage('Connexion Internet requise', 'error');

    try {
      await fournisseurAPI.delete(id);
      showMessage('✅ Fournisseur supprimé');
      await loadData();
    } catch (error) {
      showMessage('❌ Erreur lors de la suppression', 'error');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingFournisseur(null);
    setFormData({
      nom: '', contact: '', telephone: '', email: '', adresse: '', boutique: boutiques.length > 0 ? boutiques[0].id : ''
    });
  };

  const filteredFournisseurs = useMemo(() => {
    if (isOnline) return fournisseurs;
    return fournisseurs.filter(f =>
      f.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.contact && f.contact.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.telephone && f.telephone.includes(searchTerm))
    );
  }, [fournisseurs, searchTerm, isOnline]);

  // --- 3. RENDER ---
  if (checkingPermissions) return <LoadingScreen />;
  if (!hasPermission && isOnline) return <AccessDenied userRole={userRole} />;

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn"><ArrowLeft size={20} /><span>Retour</span></Link>
          <div className="title-block">
            <h1>Fournisseurs</h1>
            <p className="subtitle">{filteredFournisseurs.length} partenaires</p>
          </div>
        </div>
        {/* Bouton Nouveau caché sur mobile dans le header, on peut le laisser ou l'enlever selon préférence.
            Ici je le garde mais j'ajoute un bouton flottant ou centré si besoin.
            Pour l'instant, je garde le style desktop. */}
        <div className="header-right">
          {isOnline && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={18} /> Nouveau
            </button>
          )}
        </div>
      </header>

      <div className="content-wrapper">
        {message && (
          <div className={`alert-box ${messageType}`}>
             {messageType === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
             <span>{message}</span>
          </div>
        )}

        <div className="search-section">
          <div className="input-wrapper search">
             <Search size={18} className="input-icon" />
             <input
               type="text"
               placeholder="Rechercher (nom, téléphone)..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               disabled={loading}
             />
          </div>
        </div>

        {loading ? (
          <div className="loading-state"><Loader className="spin" size={32} /><p>Chargement...</p></div>
        ) : filteredFournisseurs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Truck size={40} /></div>
            <h3>Aucun fournisseur</h3>
            <p>Commencez par ajouter votre premier fournisseur.</p>
          </div>
        ) : (
          <div className="grid-container">
            {filteredFournisseurs.map(fournisseur => (
              <div key={fournisseur.id} className="card">
                <div className="card-header">
                  <div className="avatar-placeholder">{fournisseur.nom.charAt(0).toUpperCase()}</div>
                  <div className="card-title-block">
                    <h3>{fournisseur.nom}</h3>
                    {fournisseur.contact && <span className="contact-badge"><User size={10} /> {fournisseur.contact}</span>}
                  </div>
                  {/* Plus de boutons icônes ici */}
                </div>

                <div className="card-body">
                  {fournisseur.telephone && (
                    <div className="info-row">
                      <Phone size={14} />
                      <a href={`tel:${fournisseur.telephone}`}>{fournisseur.telephone}</a>
                    </div>
                  )}
                  {fournisseur.email && (
                    <div className="info-row">
                      <Mail size={14} />
                      <span className="truncate">{fournisseur.email}</span>
                    </div>
                  )}
                  {fournisseur.adresse && (
                    <div className="info-row">
                      <MapPin size={14} />
                      <span className="truncate">{fournisseur.adresse}</span>
                    </div>
                  )}
                </div>

                {/* NOUVELLE BARRE D'ACTION AVEC TEXTE */}
                {isOnline && (
                  <div className="card-actions-row">
                    <button onClick={() => handleEdit(fournisseur)} className="action-btn edit">
                      <Edit size={16} /> Modifier
                    </button>
                    <button onClick={() => handleDelete(fournisseur.id)} className="action-btn delete">
                      <Trash2 size={16} /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL AVEC DÉFILEMENT INTERNE FIXÉ */}
      {showForm && (
        <div className="modal-backdrop" onClick={handleCancelForm}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingFournisseur ? 'Modifier' : 'Nouveau'} Fournisseur</h2>
              <button className="close-btn" onClick={handleCancelForm}><X size={24} /></button>
            </div>

            {/* Corps défilable */}
            <form onSubmit={handleSubmit} className="modal-form-container">
              <div className="modal-scrollable-content">
                <div className="form-group">
                  <label>Nom de l'entreprise *</label>
                  <div className="input-wrapper">
                    <Truck size={18} className="input-icon" />
                    <input type="text" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} required placeholder="Ex: Société Import" />
                  </div>
                </div>

                <div className="form-group">
                  <label>Personne de contact</label>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input type="text" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} placeholder="Ex: M. Jean" />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Téléphone *</label>
                    <div className="input-wrapper">
                      <Phone size={18} className="input-icon" />
                      <input type="tel" value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} required placeholder="+242..." />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <div className="input-wrapper">
                      <Mail size={18} className="input-icon" />
                      <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="@..." />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Adresse</label>
                  <div className="input-wrapper">
                    <MapPin size={18} className="input-icon" />
                    <input type="text" value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} placeholder="Adresse..." />
                  </div>
                </div>

                <div className="form-group">
                  <label>Boutique associée *</label>
                  <div className="input-wrapper">
                    <Store size={18} className="input-icon" />
                    <select value={formData.boutique} onChange={(e) => setFormData({ ...formData, boutique: e.target.value })} required>
                      <option value="">Sélectionner...</option>
                      {boutiques.map(b => (<option key={b.id} value={b.id}>{b.nom}</option>))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Footer fixe en bas */}
              <div className="modal-footer">
                <button type="button" onClick={handleCancelForm} className="btn-cancel">Annuler</button>
                <button type="submit" className="btn-submit">{editingFournisseur ? 'Mettre à jour' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <Link to="/dashboard" className="nav-item"><Home size={20} /><span>Accueil</span></Link>
        <Link to="/ventes" className="nav-item"><ShoppingCart size={20} /><span>Ventes</span></Link>
        <Link to="/produits" className="nav-item"><Package size={20} /><span>Produits</span></Link>
        <Link to="/clients" className="nav-item"><Users size={20} /><span>Clients</span></Link>
      </nav>

      <style jsx>{`
        .page-container { min-height: 100vh; background-color: #f8fafc; color: #1e293b; font-family: 'Inter', sans-serif; padding-bottom: 90px; }
        .page-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 20; }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .back-btn { display: flex; align-items: center; gap: 8px; color: #64748b; text-decoration: none; font-weight: 500; padding: 8px; border-radius: 8px; background: #f1f5f9; }
        .title-block h1 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
        .subtitle { margin: 2px 0 0; font-size: 0.8rem; color: #64748b; }
        .btn-primary { background: #4f46e5; color: white; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; }

        .content-wrapper { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
        .search-section { margin-bottom: 20px; }
        .input-wrapper.search input { width: 100%; padding: 12px 12px 12px 40px; font-size: 1rem; border-radius: 12px; border: 1px solid #e2e8f0; }

        /* CARDS */
        .grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
        .card { background: white; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.02); overflow: hidden; display: flex; flex-direction: column; }
        .card-header { padding: 16px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #f1f5f9; }
        .avatar-placeholder { width: 44px; height: 44px; background: #e0e7ff; color: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
        .card-title-block h3 { margin: 0; font-size: 1rem; color: #1e293b; }
        .contact-badge { font-size: 0.7rem; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; }

        .card-body { padding: 16px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
        .info-row { display: flex; align-items: center; gap: 10px; color: #64748b; font-size: 0.85rem; }
        .info-row a { color: #4f46e5; text-decoration: none; }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }

        /* ACTION BUTTONS (NOUVEAU STYLE) */
        .card-actions-row { display: flex; border-top: 1px solid #e2e8f0; }
        .action-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; font-size: 0.85rem; font-weight: 600; border: none; cursor: pointer; transition: background 0.2s; }
        .action-btn.edit { background: white; color: #475569; border-right: 1px solid #e2e8f0; }
        .action-btn.edit:hover { background: #f8fafc; color: #1e293b; }
        .action-btn.delete { background: #fff5f5; color: #e53e3e; }
        .action-btn.delete:hover { background: #fee2e2; color: #c53030; }

        /* MODAL FIX MOBILE */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .modal-card {
          background: white; width: 100%; max-width: 500px; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
          display: flex; flex-direction: column;
          max-height: 90vh; /* IMPORTANT POUR MOBILE */
        }
        .modal-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .close-btn { background: none; border: none; cursor: pointer; color: #94a3b8; }

        /* Conteneur Formulaire Flex */
        .modal-form-container { display: flex; flex-direction: column; overflow: hidden; height: 100%; }

        /* Contenu Scrollable */
        .modal-scrollable-content {
          padding: 20px;
          overflow-y: auto; /* SCROLL ICI */
          flex: 1;
        }

        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 6px; font-size: 0.85rem; font-weight: 500; color: #64748b; }
        .input-wrapper { position: relative; }
        .input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
        .input-wrapper input, .input-wrapper select { width: 100%; padding: 10px 10px 10px 36px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* Footer Fixe */
        .modal-footer { padding: 16px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px; background: white; flex-shrink: 0; }
        .btn-cancel { padding: 10px 20px; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .btn-submit { padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }

        /* ALERTS & LOADER */
        .alert-box { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; }
        .alert-box.error { background: #fee2e2; color: #991b1b; }
        .alert-box.success { background: #dcfce7; color: #166534; }
        .empty-state { text-align: center; padding: 40px 20px; color: #94a3b8; }
        .loading-state { text-align: center; padding: 40px; color: #94a3b8; }
        .spin { animation: spin 1s linear infinite; }

        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-around; padding: 12px 0; z-index: 90; }
        .nav-item { display: flex; flex-direction: column; align-items: center; color: #94a3b8; text-decoration: none; font-size: 0.7rem; gap: 4px; }
        .nav-item.active { color: #4f46e5; }

        @media (max-width: 640px) {
          .page-header { padding: 12px 16px; }
          .header-left span { display: none; } /* Cache le texte Retour sur mobile */
          .grid-container { grid-template-columns: 1fr; }
          .form-grid { grid-template-columns: 1fr; }
          /* En mode mobile, le modal prend presque tout l'écran pour confort */
          .modal-card { width: 100%; height: auto; max-height: 95vh; margin: 10px; }
        }
      `}</style>
    </div>
  );
}