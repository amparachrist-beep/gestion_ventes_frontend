import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { clientAPI, boutiqueAPI, profilAPI } from '../api'; // Ajout de profilAPI
import { getClients, saveClients, saveClientOffline } from '../db';
import {
  ArrowLeft, Search, User, Phone, Mail, MapPin,
  Store, Plus, X, Loader, Home, ShoppingCart,
  Package, Users, CheckCircle, AlertCircle, Info,
  Edit, Trash2, ChevronRight
} from 'lucide-react';

// =====================================================
// 🔒 COMPOSANT DE VÉRIFICATION DE PERMISSION
// =====================================================

const usePermissionCheck = (requiredRoles = ['gerant', 'admin']) => {
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

const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="spinner"></div>
    <p>Vérification des permissions...</p>
    <style jsx>{`
      .loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh; font-family: system-ui, -apple-system, sans-serif; color: #64748b; }
      .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top: 3px solid #5542f6; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `}</style>
  </div>
);

const AccessDenied = ({ userRole, requiredRoles = ['gérant', 'admin'] }) => (
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
      .back-btn-denied { display: inline-flex; align-items: center; gap: 8px; background: #5542f6; color: white; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 500; }
    `}</style>
  </div>
);

export const withPermission = (Component, requiredRoles = ['gerant', 'admin']) => {
  return (props) => {
    const { loading, hasPermission, userRole } = usePermissionCheck(requiredRoles);
    if (loading) return <LoadingScreen />;
    if (!hasPermission) return <AccessDenied userRole={userRole} requiredRoles={requiredRoles} />;
    return <Component {...props} userRole={userRole} />;
  };
};

// =====================================================
// FIN DU COMPOSANT DE VÉRIFICATION
// =====================================================

export default function Clients({ isOnline }) {
  // --- 1. VÉRIFICATION PERMISSION ---
  const { loading: checkingPermissions, hasPermission, userRole } = usePermissionCheck(['gerant', 'admin', 'vendeur']);

  const [clients, setClients] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);

  // État pour savoir si on modifie ou on crée
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    nom: '',
    telephone: '',
    email: '',
    adresse: '',
    boutique: ''
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
  }, [isOnline, searchTerm, hasPermission, checkingPermissions]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isOnline) {
        const params = searchTerm ? { search: searchTerm } : {};
        const [clientsRes, boutiquesRes] = await Promise.all([
          clientAPI.list({ params }),
          boutiqueAPI.list()
        ]);
        const serverClients = clientsRes.data.results || clientsRes.data;
        const boutiqueList = boutiquesRes.data.results || boutiquesRes.data;
        await saveClients(serverClients);
        setClients(serverClients);
        setBoutiques(boutiqueList);
        if (boutiqueList.length > 0 && !formData.boutique) {
          setFormData(prev => ({ ...prev, boutique: boutiqueList[0].id }));
        }
      } else {
        const localClients = await getClients();
        const filtered = localClients.filter(client =>
          client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (client.telephone && client.telephone.includes(searchTerm)) ||
          (client.email && client.email.includes(searchTerm))
        );
        setClients(filtered);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    }
    setLoading(false);
  };

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleEdit = (client) => {
    const boutiqueId = typeof client.boutique === 'object' ? client.boutique.id : client.boutique;

    setFormData({
      nom: client.nom,
      telephone: client.telephone || '',
      email: client.email || '',
      adresse: client.adresse || '',
      boutique: boutiqueId || (boutiques.length > 0 ? boutiques[0].id : '')
    });
    setEditingId(client.id);
    setShowForm(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Empêcher l'ouverture du mode édition si on clique sur supprimer
    if (!isOnline) {
      showMessage('La suppression est impossible hors ligne.', 'error');
      return;
    }

    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) return;

    try {
      await clientAPI.delete(id);
      showMessage('🗑️ Client supprimé avec succès', 'success');
      await loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
      showMessage('❌ Erreur lors de la suppression', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nom || !formData.boutique) {
      showMessage('Nom et boutique sont requis', 'error');
      return;
    }

    const payload = {
      nom: formData.nom.trim(),
      telephone: formData.telephone.trim(),
      email: formData.email.trim(),
      adresse: formData.adresse.trim(),
      boutique: parseInt(formData.boutique)
    };

    if (isOnline) {
      try {
        if (editingId) {
          await clientAPI.update(editingId, payload);
          showMessage('✅ Client modifié avec succès');
        } else {
          await clientAPI.create(payload);
          showMessage('✅ Client créé avec succès');
        }
        resetForm();
        await loadData();
      } catch (error) {
        console.error('Erreur:', error);
        showMessage('❌ ' + (error.response?.data?.detail || 'Erreur opération'), 'error');
      }
    } else {
      if (editingId) {
        showMessage('Modification impossible hors ligne pour le moment', 'error');
      } else {
        await saveClientOffline(payload);
        showMessage('💾 Client enregistré hors ligne', 'info');
        resetForm();
        await loadData();
      }
    }
  };

  const resetForm = () => {
    setFormData({ nom: '', telephone: '', email: '', adresse: '', boutique: boutiques[0]?.id || '' });
    setEditingId(null);
    setShowForm(false);
    setSearchTerm('');
  };

  const filteredClients = useMemo(() => {
    if (isOnline) return clients;
    return clients.filter(client =>
      client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.telephone && client.telephone.includes(searchTerm)) ||
      (client.email && client.email.includes(searchTerm))
    );
  }, [clients, searchTerm, isOnline]);

  // --- 3. RENDER ---
  if (checkingPermissions) return <LoadingScreen />;
  if (!hasPermission && isOnline) return <AccessDenied userRole={userRole} />;
  if (!hasPermission && !loading && isOnline) return <AccessDenied userRole={userRole} />;

  const canEdit = userRole === 'gerant' || userRole === 'admin';

  return (
    <div className="page-container">
      {/* HEADER SIMILAIRE À L'IMAGE */}
      <header className="header">
        <div className="header-left">
           <Link to="/dashboard" className="back-link">
             <ArrowLeft size={24} color="#333" />
             <span className="back-text">Retour</span>
           </Link>
        </div>
        <div className="header-center">
          <h1>Gestion Clients</h1>
          <p>{filteredClients.length} enregistrés</p>
        </div>
        <div className="header-right">
            {/* Indicateur de statut style "En ligne" vert de l'image */}
            <div className={`status-pill ${isOnline ? 'online' : 'offline'}`}>
                <div className="dot"></div>
                <span>{isOnline ? 'En ligne' : 'Hors ligne'}</span>
            </div>
        </div>
      </header>

      <div className="main-content">
        {/* BOUTON "NOUVELLE ENTRÉE" STYLE IMAGE */}
        <div className="action-area">
          {isOnline && canEdit && (
            <button className="big-purple-btn" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={24} />
              <span>Nouveau Client</span>
            </button>
          )}
        </div>

        {/* BARRE DE RECHERCHE */}
        <div className="search-area">
            <div className="search-box">
                <Search size={20} color="#94a3b8" />
                <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                 {searchTerm && <X size={18} color="#94a3b8" onClick={() => setSearchTerm('')} />}
            </div>
        </div>

        {/* MESSAGES */}
        {message && (
          <div className={`toast ${messageType}`}>
            {messageType === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span>{message}</span>
          </div>
        )}

        {/* LISTE DES CARTES STYLE IMAGE */}
        {loading ? (
          <div className="loader-container"><div className="spinner"></div></div>
        ) : filteredClients.length === 0 ? (
          <div className="empty-state">
            <Users size={48} color="#cbd5e1" />
            <p>Aucun client trouvé</p>
          </div>
        ) : (
          <div className="cards-list">
            {filteredClients.map(client => (
              <div key={client.id} className="custom-card" onClick={() => canEdit && handleEdit(client)}>
                {/* PARTIE HAUTE : ICONE + NOM */}
                <div className="card-top">
                    <div className="icon-box">
                        <User size={24} color="#0EA5E9" />
                    </div>
                    <div className="card-info">
                        <h3 className="card-title">{client.nom}</h3>
                        <div className="stock-badge">
                            {client.boutique?.nom || 'Boutique'}
                        </div>
                    </div>
                </div>

                {/* PARTIE MILIEU : DETAILS */}
                <div className="card-details">
                    <div className="detail-row">
                        <Phone size={16} color="#94a3b8" />
                        <span>{client.telephone || 'Pas de numéro'}</span>
                    </div>
                    {client.adresse && (
                        <div className="detail-row">
                            <MapPin size={16} color="#94a3b8" />
                            <span>{client.adresse}</span>
                        </div>
                    )}
                </div>

                {/* PARTIE BASSE : TOTAL / ACTIONS (Style de l'image "TOTAL ... FCFA") */}
                <div className="card-footer">
                    <div className="footer-label">ACTIONS</div>
                    <div className="footer-actions">
                        {canEdit && (
                            <button
                                className="delete-icon-btn"
                                onClick={(e) => handleDelete(client.id, e)}
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                         <span className="edit-hint">Modifier <ChevronRight size={14}/></span>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL (Gardée fonctionnelle mais propre) */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Modifier' : 'Nouveau'} Client</h2>
              <button onClick={() => setShowForm(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Nom complet</label>
                <input type="text" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} required placeholder="Ex: Jean Dupont" />
              </div>
              <div className="input-row">
                <div className="input-group">
                    <label>Téléphone</label>
                    <input type="tel" value={formData.telephone} onChange={e => setFormData({ ...formData, telephone: e.target.value })} placeholder="06..." />
                </div>
                <div className="input-group">
                    <label>Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="@..." />
                </div>
              </div>
              <div className="input-group">
                <label>Adresse</label>
                <input type="text" value={formData.adresse} onChange={e => setFormData({ ...formData, adresse: e.target.value })} placeholder="Adresse" />
              </div>
              <div className="input-group">
                <label>Boutique</label>
                <select value={formData.boutique} onChange={e => setFormData({ ...formData, boutique: e.target.value })} required>
                  <option value="">Choisir boutique</option>
                  {boutiques.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                </select>
              </div>
              <button type="submit" className="submit-btn">
                {editingId ? 'Sauvegarder' : 'Créer Client'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NAVIGATION DU BAS (Identique) */}
      <nav className="bottom-nav">
        <Link to="/dashboard" className="nav-item"><Home size={20} /><span>Accueil</span></Link>
        <Link to="/ventes" className="nav-item"><ShoppingCart size={20} /><span>Vente</span></Link>
        <Link to="/produits" className="nav-item"><Package size={20} /><span>Stock</span></Link>
        <Link to="/clients" className="nav-item active"><Users size={20} /><span>Clients</span></Link>
      </nav>

      <style jsx>{`
        /* GLOBAL LAYOUT */
        .page-container {
          min-height: 100vh;
          background-color: #f9fafb; /* Fond très clair comme l'image */
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          padding-bottom: 80px;
          color: #1e293b;
        }

        /* HEADER STYLE IMAGE */
        .header {
          background: white;
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .header-left { flex: 1; }
        .back-link { display: flex; align-items: center; gap: 5px; text-decoration: none; color: #64748b; font-weight: 500; }
        .back-text { font-size: 1rem; color: #64748b; }

        .header-center {
          flex: 2;
          text-align: center;
        }
        .header-center h1 {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .header-center p {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 2px 0 0 0;
        }

        .header-right { flex: 1; display: flex; justify-content: flex-end; }

        /* STATUS PILL (Le badge vert en haut à droite) */
        .status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
        }
        .status-pill.online { background-color: #10b981; box-shadow: 0 2px 5px rgba(16, 185, 129, 0.3); }
        .status-pill.offline { background-color: #64748b; }
        .dot { width: 8px; height: 8px; background: white; border-radius: 50%; opacity: 0.8; }

        /* MAIN CONTENT CENTERING */
        .main-content {
          max-width: 500px; /* Limite la largeur comme sur un mobile centré */
          margin: 0 auto;
          padding: 20px;
        }

        /* BIG PURPLE BUTTON */
        .action-area {
          margin-bottom: 20px;
        }
        .big-purple-btn {
          width: 100%;
          background-color: #5542f6; /* Violet de l'image */
          color: white;
          border: none;
          padding: 16px;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 12px rgba(85, 66, 246, 0.25);
          cursor: pointer;
          transition: transform 0.1s;
        }
        .big-purple-btn:active { transform: scale(0.98); }

        /* SEARCH AREA */
        .search-area { margin-bottom: 20px; }
        .search-box {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .search-box input {
          border: none;
          outline: none;
          width: 100%;
          font-size: 0.95rem;
          color: #334155;
        }

        /* CARDS STYLE IMAGE "POULET" */
        .cards-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .custom-card {
          background: white;
          border-radius: 20px; /* Arrondi prononcé comme l'image */
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03); /* Ombre très douce */
          cursor: pointer;
          transition: transform 0.2s;
        }
        .custom-card:hover { transform: translateY(-2px); }

        /* Card Top: Icon + Title */
        .card-top {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .icon-box {
          width: 50px;
          height: 50px;
          background-color: #e0f2fe; /* Bleu clair fond icone */
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .card-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
        }
        .stock-badge {
          background-color: #dcfce7; /* Vert clair badge */
          color: #166534;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          width: fit-content;
        }

        /* Card Details: Middle */
        .card-details {
          margin-bottom: 20px;
        }
        .detail-row {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #64748b;
          font-size: 0.9rem;
          margin-bottom: 8px;
        }

        /* Card Footer: Total/Actions */
        .card-footer {
          background-color: #f8fafc; /* Fond gris clair bas de carte */
          margin: 0 -20px -20px -20px; /* Étendre aux bords */
          padding: 15px 20px;
          border-radius: 0 0 20px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #f1f5f9;
        }
        .footer-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .footer-actions {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .edit-hint {
          color: #5542f6;
          font-weight: 700;
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .delete-icon-btn {
          background: #fee2e2;
          border: none;
          color: #ef4444;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        /* MODAL */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 100;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .modal-content {
          background: white; width: 100%; max-width: 400px; border-radius: 20px; overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        .modal-header {
          padding: 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;
        }
        .modal-header h2 { margin: 0; font-size: 1.2rem; }
        .modal-header button { background: none; border: none; cursor: pointer; color: #94a3b8; }

        form { padding: 20px; }
        .input-group { margin-bottom: 16px; }
        .input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        label { display: block; margin-bottom: 6px; font-size: 0.85rem; color: #64748b; font-weight: 500; }
        input, select {
          width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem;
          box-sizing: border-box; transition: border-color 0.2s;
        }
        input:focus, select:focus { outline: none; border-color: #5542f6; }

        .submit-btn {
          width: 100%; padding: 14px; background: #5542f6; color: white; border: none; border-radius: 10px;
          font-weight: 600; cursor: pointer; margin-top: 10px;
        }

        /* TOAST */
        .toast {
          position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%);
          background: #1e293b; color: white; padding: 12px 24px; border-radius: 30px;
          display: flex; align-items: center; gap: 8px; font-size: 0.9rem; z-index: 99;
        }
        .toast.error { background: #ef4444; }

        /* LOADING */
        .loader-container, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 40px; color: #94a3b8; }
        .spinner { width: 30px; height: 30px; border: 3px solid #e2e8f0; border-top-color: #5542f6; border-radius: 50%; animation: spin 1s infinite; }

        /* BOTTOM NAV */
        .bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e2e8f0;
          display: flex; justify-content: space-around; padding: 10px 0; z-index: 90;
        }
        .nav-item { display: flex; flex-direction: column; align-items: center; color: #94a3b8; text-decoration: none; font-size: 0.7rem; gap: 4px; }
        .nav-item.active { color: #5542f6; }

        @media (min-width: 768px) {
          .bottom-nav { display: none; }
          .page-container { padding-bottom: 0; }
        }
      `}</style>
    </div>
  );
}

// Exports
export { usePermissionCheck, LoadingScreen, AccessDenied };