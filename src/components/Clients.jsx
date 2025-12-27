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

  // ✅ Fonction pour initier la modification
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

  // ✅ Fonction pour supprimer
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

  // Rôle avec droits d'édition
  const canEdit = userRole === 'gerant' || userRole === 'admin';

  return (
    <div className="page-container">
      {/* HEADER FIXE */}
      <header className="header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn"><ArrowLeft size={20}/></Link>
          <div>
            <h1>Clients</h1>
            <p className="subtitle">{filteredClients.length} clients enregistrés</p>
          </div>
        </div>
      </header>

      <div className="content-wrapper">
        {/* SECTION AVEC BOUTON NOUVEAU ET RECHERCHE */}
        <div className="action-section">
          {isOnline && canEdit && (
            <button className="btn-new" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={20} />
              <span className="btn-text">Nouveau</span>
            </button>
          )}

          {/* BARRE DE RECHERCHE */}
          <div className="search-container">
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

        {/* MESSAGES ALERTE */}
        {message && (
          <div className={`toast ${messageType}`}>
            {messageType === 'error' ? <AlertCircle size={18}/> : messageType === 'info' ? <Info size={18}/> : <CheckCircle size={18}/>}
            <span>{message}</span>
          </div>
        )}

        {/* GRILLE CLIENTS */}
        {loading ? (
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Chargement...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>Aucun client trouvé</h3>
            <p>{searchTerm ? 'Essayez un autre terme de recherche' : 'Commencez par ajouter votre premier client'}</p>
          </div>
        ) : (
          <div className="clients-grid">
            {filteredClients.map(client => (
              <div key={client.id} className="client-card">
                <div className="card-top">
                  <div className="avatar-placeholder">{client.nom.charAt(0).toUpperCase()}</div>
                </div>

                <div className="card-info">
                  <h3>{client.nom}</h3>
                  <div className="badges">
                    <span className="badge-boutique">
                      <Store size={12} /> {client.boutique?.nom || 'Boutique #' + client.boutique}
                    </span>
                  </div>
                </div>

                <div className="card-details">
                  {client.telephone && (
                    <div className="detail-row">
                      <Phone size={14} />
                      <span>{client.telephone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="detail-row">
                      <Mail size={14} />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.adresse && (
                    <div className="detail-row">
                      <MapPin size={14} />
                      <span>{client.adresse}</span>
                    </div>
                  )}
                </div>

                {/* BOUTONS D'ACTION */}
                {isOnline && canEdit && (
                  <div className="card-actions-footer">
                    <button
                      onClick={() => handleEdit(client)}
                      className="btn-action edit"
                    >
                      <Edit size={16} /> Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="btn-action delete"
                    >
                      <Trash2 size={16} /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL NOUVEAU / MODIFIER CLIENT */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Modifier Client' : 'Nouveau Client'}</h2>
              <button className="close-modal" onClick={() => setShowForm(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Nom complet *</label>
                <div className="input-icon-left">
                  <User size={18} className="icon" />
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={e => setFormData({...formData, nom: e.target.value})}
                    required
                    placeholder="Ex: Jean Dupont"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Téléphone</label>
                  <div className="input-icon-left">
                    <Phone size={18} className="icon" />
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={e => setFormData({...formData, telephone: e.target.value})}
                      placeholder="06..."
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <div className="input-icon-left">
                    <Mail size={18} className="icon" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="client@mail.com"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Adresse</label>
                <div className="input-icon-left">
                  <MapPin size={18} className="icon" />
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={e => setFormData({...formData, adresse: e.target.value})}
                    placeholder="Adresse complète"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Boutique d'inscription *</label>
                <div className="input-icon-left">
                  <Store size={18} className="icon" />
                  <select
                    value={formData.boutique}
                    onChange={e => setFormData({...formData, boutique: e.target.value})}
                    required
                  >
                    <option value="">Sélectionner une boutique</option>
                    {boutiques.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowForm(false)} className="btn-cancel">
                  Annuler
                </button>
                <button type="submit" className="btn-submit">
                  {editingId ? 'Mettre à jour' : 'Enregistrer Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="mobile-nav">
        <Link to="/dashboard" className="nav-item"><Home size={20} /><span>Accueil</span></Link>
        <Link to="/ventes" className="nav-item"><ShoppingCart size={20} /><span>Vente</span></Link>
        <Link to="/produits" className="nav-item"><Package size={20} /><span>Stock</span></Link>
        <Link to="/clients" className="nav-item active"><Users size={20} /><span>Clients</span></Link>
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

        /* --- SECTION ACTION --- */
        .action-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .btn-new {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: 0.2s;
          box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
          width: 100%;
          max-width: 200px;
          align-self: center;
        }
        .btn-new:hover:not(:disabled) {
          background: #4338ca;
          transform: translateY(-1px);
          box-shadow: 0 6px 8px -1px rgba(79, 70, 229, 0.3);
        }
        .btn-new:disabled {
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
        .search-container input:disabled {
          background: #f8fafc;
          cursor: not-allowed;
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

        /* GRID CLIENTS */
        .clients-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .client-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .client-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
        }

        .card-top {
          padding: 20px 20px 0;
          display: flex;
          justify-content: center;
        }
        .avatar-placeholder {
          width: 60px;
          height: 60px;
          background: #e0e7ff;
          color: #4f46e5;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .card-info {
          padding: 16px 20px 8px;
          text-align: center;
        }
        .card-info h3 {
          margin: 0 0 8px;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
        }

        .badges {
          display: flex;
          justify-content: center;
          margin-bottom: 8px;
        }
        .badge-boutique {
          font-size: 0.75rem;
          background: #f1f5f9;
          color: #64748b;
          padding: 4px 8px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .card-details {
          padding: 0 20px 16px;
          flex: 1;
        }
        .detail-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
          color: #64748b;
          font-size: 0.9rem;
        }
        .detail-row svg {
          color: #94a3b8;
          flex-shrink: 0;
        }
        .detail-row span {
          color: #334155;
          word-break: break-word;
        }

        /* ACTIONS FOOTER */
        .card-actions-footer {
          display: flex;
          border-top: 1px solid #e2e8f0;
          margin-top: auto;
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

        .input-icon-left {
          position: relative;
        }
        .input-icon-left .icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }
        .input-icon-left input,
        .input-icon-left select {
          width: 100%;
          padding: 10px 12px 10px 40px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.95rem;
          transition: 0.2s;
          background: white;
        }
        .input-icon-left input:focus,
        .input-icon-left select:focus {
          border-color: #4f46e5;
          outline: none;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
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
        .toast.info {
          background: #3b82f6;
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
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #64748b;
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
        .empty-state svg {
          margin-bottom: 16px;
        }
        .empty-state h3 {
          color: #334155;
          margin: 0 0 8px;
        }
        .empty-state p {
          margin: 0;
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

          .btn-new {
            padding: 12px;
            width: 100%;
            max-width: none;
          }

          .action-section {
            gap: 12px;
          }

          .content-wrapper {
            padding: 0 16px;
          }

          .clients-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .client-card {
            flex-direction: column;
          }

          .card-top {
            padding: 20px 20px 0;
          }

          .avatar-placeholder {
            width: 60px;
            height: 60px;
            font-size: 1.5rem;
          }

          .card-info {
            padding: 16px 20px 8px;
            text-align: center;
          }

          .badges {
            justify-content: center;
          }

          .card-details {
            padding: 0 20px 16px;
          }

          .card-actions-footer {
            width: 100%;
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
          .action-section {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }

          .btn-new {
            width: auto;
            max-width: 180px;
          }

          .search-container {
            flex: 1;
            margin-left: 16px;
          }

          .clients-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .modal-content {
            max-width: 90%;
          }
        }

        /* Grands écrans (desktop) */
        @media (min-width: 769px) {
          .action-section {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }

          .btn-new {
            width: auto;
            max-width: 200px;
          }

          .search-container {
            flex: 1;
            max-width: 500px;
            margin-left: 24px;
          }

          .mobile-nav {
            display: none;
          }

          .page-container {
            padding-bottom: 0;
          }

          .clients-grid {
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          }
        }

        /* Très grands écrans */
        @media (min-width: 1200px) {
          .content-wrapper {
            max-width: 1400px;
          }

          .search-container {
            max-width: 600px;
          }

          .clients-grid {
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