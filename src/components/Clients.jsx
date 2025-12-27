import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { clientAPI, boutiqueAPI, profilAPI } from '../api'; // Ajout de profilAPI
import { getClients, saveClients, saveClientOffline } from '../db';
import {
  ArrowLeft, Search, User, Phone, Mail, MapPin,
  Store, Plus, X, Loader, Home, ShoppingCart,
  Package, Users, CheckCircle, AlertCircle, Info,
  Edit, Trash2
} from 'lucide-react';

// =====================================================
// 🔒 COMPOSANT DE VÉRIFICATION DE PERMISSION
// À utiliser dans toutes vos pages protégées
// =====================================================

/**
 * Hook personnalisé pour vérifier les permissions
 */
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

/**
 * Composant d'écran de chargement
 */
const LoadingScreen = () => (
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
const AccessDenied = ({ userRole, requiredRoles = ['gérant', 'admin'] }) => (
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

  const handleDelete = async (id) => {
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

  // --- 3. RENDER PERMISSION ---
  if (checkingPermissions) return <LoadingScreen />;
  if (!hasPermission && isOnline) return <AccessDenied userRole={userRole} />;
  if (!hasPermission && !loading && isOnline) return <AccessDenied userRole={userRole} />;

  const canEdit = userRole === 'gerant' || userRole === 'admin';

  return (
    <div className="page-container">
      {/* HEADER */}
      <header className="header">
        <div className="header-content">
          <Link to="/dashboard" className="back-btn">
            <ArrowLeft size={20} />
          </Link>
          <div className="header-center">
            <h1>Clients</h1>
            <p className="subtitle">{filteredClients.length} clients enregistrés</p>
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* SECTION BOUTON NOUVEAU */}
        <div className="new-client-section">
          {isOnline && canEdit && (
            <button className="new-client-btn" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={20} />
              <span>Nouveau</span>
            </button>
          )}
        </div>

        {/* SECTION RECHERCHE */}
        <div className="search-section">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Rechercher (nom, téléphone, email)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* MESSAGES */}
        {message && (
          <div className={`toast ${messageType}`}>
            {messageType === 'error' ? <AlertCircle size={18} /> : messageType === 'info' ? <Info size={18} /> : <CheckCircle size={18} />}
            <span>{message}</span>
          </div>
        )}

        {/* CONTENU PRINCIPAL */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Chargement...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="empty-container">
            <Users size={48} />
            <h3>Aucun client trouvé</h3>
            <p>{searchTerm ? 'Essayez un autre terme de recherche' : 'Commencez par ajouter votre premier client'}</p>
          </div>
        ) : (
          <div className="clients-container">
            {filteredClients.map(client => (
              <div key={client.id} className="client-item">
                <div className="client-header">
                  <div className="client-avatar">
                    {client.nom.charAt(0).toUpperCase()}
                  </div>
                  <div className="client-info">
                    <h3>{client.nom}</h3>
                    <div className="client-boutique">
                      <Store size={12} />
                      <span>{client.boutique?.nom || 'Boutique #' + client.boutique}</span>
                    </div>
                  </div>
                </div>

                <div className="client-details">
                  {client.telephone && (
                    <div className="detail-item">
                      <Phone size={14} />
                      <span>{client.telephone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="detail-item">
                      <Mail size={14} />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.adresse && (
                    <div className="detail-item">
                      <MapPin size={14} />
                      <span>{client.adresse}</span>
                    </div>
                  )}
                </div>

                {isOnline && canEdit && (
                  <div className="client-actions">
                    <button onClick={() => handleEdit(client)} className="action-btn edit-btn">
                      <Edit size={16} /> Modifier
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="action-btn delete-btn">
                      <Trash2 size={16} /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Modifier Client' : 'Nouveau Client'}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Nom complet *</label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={e => setFormData({ ...formData, nom: e.target.value })}
                    required
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Téléphone</label>
                  <div className="input-with-icon">
                    <Phone size={18} className="input-icon" />
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="06..."
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <div className="input-with-icon">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="client@mail.com"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Adresse</label>
                <div className="input-with-icon">
                  <MapPin size={18} className="input-icon" />
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder="Adresse complète"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Boutique d'inscription *</label>
                <div className="input-with-icon">
                  <Store size={18} className="input-icon" />
                  <select
                    value={formData.boutique}
                    onChange={e => setFormData({ ...formData, boutique: e.target.value })}
                    required
                  >
                    <option value="">Sélectionner une boutique</option>
                    {boutiques.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowForm(false)} className="cancel-btn">
                  Annuler
                </button>
                <button type="submit" className="submit-btn">
                  {editingId ? 'Mettre à jour' : 'Enregistrer Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <Link to="/dashboard" className="nav-item">
          <Home size={20} />
          <span>Accueil</span>
        </Link>
        <Link to="/ventes" className="nav-item">
          <ShoppingCart size={20} />
          <span>Vente</span>
        </Link>
        <Link to="/produits" className="nav-item">
          <Package size={20} />
          <span>Stock</span>
        </Link>
        <Link to="/clients" className="nav-item active">
          <Users size={20} />
          <span>Clients</span>
        </Link>
      </nav>

      <style jsx>{`
        .page-container {
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          padding-bottom: 80px;
        }

        /* HEADER */
        .header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 16px 20px;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          max-width: 600px;
          margin: 0 auto;
        }

        .back-btn {
          position: absolute;
          left: 0;
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

        .header-center {
          text-align: center;
        }

        .header h1 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
        }

        .subtitle {
          margin: 4px 0 0;
          font-size: 0.8rem;
          color: #64748b;
        }

        /* MAIN CONTENT */
        .main-content {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        /* BOUTON NOUVEAU */
        .new-client-section {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }

        .new-client-btn {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
        }

        .new-client-btn:hover:not(:disabled) {
          background: #4338ca;
          transform: translateY(-2px);
          box-shadow: 0 6px 8px -1px rgba(79, 70, 229, 0.3);
        }

        .new-client-btn:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* RECHERCHE */
        .search-section {
          margin-bottom: 24px;
        }

        .search-wrapper {
          position: relative;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .search-wrapper input {
          width: 100%;
          padding: 16px 20px 16px 48px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 1rem;
          background: white;
          transition: 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .search-wrapper input:focus {
          border-color: #6366f1;
          outline: none;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .search-wrapper input:disabled {
          background: #f8fafc;
          cursor: not-allowed;
        }

        .clear-search {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
        }

        /* CLIENTS LIST */
        .clients-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .client-item {
          background: white;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .client-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 12px -3px rgba(0, 0, 0, 0.05);
        }

        .client-header {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border-bottom: 1px solid #f1f5f9;
          background: linear-gradient(to right, #ffffff, #f8fafc);
        }

        .client-avatar {
          width: 56px;
          height: 56px;
          background: #e0e7ff;
          color: #4f46e5;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .client-info h3 {
          margin: 0 0 6px 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
        }

        .client-boutique {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: #64748b;
          background: #f1f5f9;
          padding: 4px 8px;
          border-radius: 6px;
          width: fit-content;
        }

        .client-details {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #64748b;
          font-size: 0.9rem;
        }

        .detail-item svg {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .detail-item span {
          color: #334155;
          word-break: break-word;
        }

        .client-actions {
          display: flex;
          border-top: 1px solid #f1f5f9;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          font-size: 0.85rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }

        .edit-btn {
          background: white;
          color: #475569;
          border-right: 1px solid #f1f5f9;
        }

        .edit-btn:hover {
          background: #f8fafc;
          color: #1e293b;
        }

        .delete-btn {
          background: #fff5f5;
          color: #e53e3e;
        }

        .delete-btn:hover {
          background: #fee2e2;
          color: #c53030;
        }

        /* LOADING & EMPTY STATES */
        .loading-container,
        .empty-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: #64748b;
        }

        .empty-container h3 {
          color: #334155;
          margin: 16px 0 8px;
        }

        .empty-container p {
          margin: 0;
          max-width: 300px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
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
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          animation: slideUp 0.3s ease;
          z-index: 50;
        }

        .toast.error {
          background: #ef4444;
        }

        .toast.info {
          background: #3b82f6;
        }

        /* MODAL */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }

        .modal-container {
          background: white;
          width: 100%;
          max-width: 500px;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #1e293b;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          padding: 4px;
        }

        .modal-form {
          padding: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          color: #334155;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .input-with-icon input,
        .input-with-icon select {
          width: 100%;
          padding: 12px 12px 12px 40px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.95rem;
          transition: 0.2s;
          background: white;
        }

        .input-with-icon input:focus,
        .input-with-icon select:focus {
          border-color: #4f46e5;
          outline: none;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }

        .cancel-btn {
          background: #f1f5f9;
          color: #475569;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .submit-btn {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .submit-btn:hover {
          background: #4338ca;
        }

        /* BOTTOM NAV */
        .bottom-nav {
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

        /* ANIMATIONS */
        @keyframes spin {
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes slideUp {
          from {
            transform: translate(-50%, 20px);
            opacity: 0;
          }

          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }

        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }

          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* RESPONSIVE */
        @media (max-width: 640px) {
          .main-content {
            padding: 16px;
          }

          .form-row {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .client-header {
            padding: 16px;
          }

          .client-details {
            padding: 16px;
          }

          .modal-container {
            margin: 0 10px;
          }

          .modal-form {
            padding: 16px;
          }
        }

        @media (min-width: 769px) {
          .bottom-nav {
            display: none;
          }

          .page-container {
            padding-bottom: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Export des composants de permission
export { usePermissionCheck, LoadingScreen, AccessDenied };