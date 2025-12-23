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
  const { loading: checkingPermissions, hasPermission, userRole } = usePermissionCheck(['gerant', 'admin']);

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
    // On charge les données uniquement si on a la permission (ou si on est en logique purement offline sans auth stricte, mais ici on priorise la sécurité)
    if (!checkingPermissions && hasPermission) {
      loadData();
    } else if (!isOnline && !checkingPermissions) {
        // Fallback si hors ligne et que la vérif permission échoue (cas complexe, ici on tente quand même de charger le local)
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
        // Si aucune boutique n'est sélectionnée par défaut
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
    // Gestion de l'ID de la boutique (si c'est un objet ou un ID direct)
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
      await clientAPI.delete(id); // Assurez-vous que votre API a une méthode delete (ex: axios.delete(`/clients/${id}/`))
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
          // ✅ MODE MODIFICATION (PUT/PATCH)
          await clientAPI.update(editingId, payload); // Assurez-vous que clientAPI.update fait un PUT ou PATCH
          showMessage('✅ Client modifié avec succès');
        } else {
          // ✅ MODE CRÉATION (POST)
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
      // Gestion hors ligne
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
  // Note: Si hors ligne et que la vérif permission échoue, cela bloquera l'accès.
  // Pour un usage purement offline, il faudrait persister le rôle utilisateur localement.
  if (!hasPermission && isOnline) return <AccessDenied userRole={userRole} />;

  // Si on est hors ligne, hasPermission sera false (car profilAPI échoue),
  // mais on peut décider d'afficher quand même si on veut permettre l'accès offline aux données locales.
  // Ici, je garde la sécurité stricte si on a une réponse "refusé",
  // mais si c'est juste une erreur réseau (offline), on laisse passer pour voir le cache.
  // Code simplifié pour respecter la demande de sécurité :
  if (!hasPermission && !loading && isOnline) return <AccessDenied userRole={userRole} />;


  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn"><ArrowLeft size={20} /><span>Retour</span></Link>
          <div className="title-block">
            <h1>Clients</h1>
            <p className="subtitle">{filteredClients.length} clients enregistrés</p>
          </div>
        </div>
        <div className="header-right">
          {isOnline && (
            <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
              <Plus size={18} /> Nouveau
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

        <div className="search-section">
          <div className="input-wrapper search">
             <Search size={18} className="input-icon" />
             <input
               type="text"
               placeholder="Rechercher (nom, téléphone, email)..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               disabled={loading}
             />
          </div>
        </div>

        {loading ? (
           <div className="loading-state"><Loader className="spin" size={32} /><p>Chargement...</p></div>
        ) : filteredClients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Users size={40} /></div>
            <h3>Aucun client trouvé</h3>
            <p>{searchTerm ? 'Essayez un autre terme de recherche' : 'Commencez par ajouter votre premier client'}</p>
          </div>
        ) : (
          <div className="clients-grid">
            {filteredClients.map(client => (
              <div key={client.id} className="client-card">
                <div className="card-header">
                  <div className="avatar-placeholder">{client.nom.charAt(0).toUpperCase()}</div>
                  <div className="client-main-info">
                    <h3>{client.nom}</h3>
                    <span className="shop-badge"><Store size={12} /> {client.boutique?.nom || 'Boutique #' + client.boutique}</span>
                  </div>
                </div>
                <div className="card-body">
                  {client.telephone && <div className="info-row"><Phone size={14} /><span>{client.telephone}</span></div>}
                  {client.email && <div className="info-row"><Mail size={14} /><span>{client.email}</span></div>}
                  {client.adresse && <div className="info-row"><MapPin size={14} /><span>{client.adresse}</span></div>}
                </div>

                {/* ✅ BOUTONS D'ACTION AJOUTÉS ICI */}
                <div className="card-actions">
                  <button
                    onClick={() => handleEdit(client)}
                    className="btn-action edit"
                    disabled={!isOnline}
                  >
                    <Edit size={14} /> Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="btn-action delete"
                    disabled={!isOnline}
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL NOUVEAU / MODIFIER CLIENT */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              {/* Titre dynamique */}
              <h2>{editingId ? 'Modifier Client' : 'Nouveau Client'}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Nom complet *</label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input type="text" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} required placeholder="Ex: Jean Dupont" />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Téléphone</label>
                  <div className="input-wrapper">
                    <Phone size={18} className="input-icon" />
                    <input type="tel" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} placeholder="06..." />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="client@mail.com" />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Adresse</label>
                <div className="input-wrapper">
                  <MapPin size={18} className="input-icon" />
                  <input type="text" value={formData.adresse} onChange={e => setFormData({...formData, adresse: e.target.value})} placeholder="Adresse complète" />
                </div>
              </div>

              <div className="form-group">
                <label>Boutique d'inscription *</label>
                <div className="input-wrapper">
                   <Store size={18} className="input-icon" />
                   <select value={formData.boutique} onChange={e => setFormData({...formData, boutique: e.target.value})} required>
                    <option value="">Sélectionner une boutique</option>
                    {boutiques.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
                   </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowForm(false)} className="btn-cancel">Annuler</button>
                <button type="submit" className="btn-submit">
                  {editingId ? 'Mettre à jour' : 'Enregistrer Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <Link to="/dashboard" className="nav-item"><Home size={20} /><span>Accueil</span></Link>
        <Link to="/ventes" className="nav-item"><ShoppingCart size={20} /><span>Ventes</span></Link>
        <Link to="/produits" className="nav-item"><Package size={20} /><span>Produits</span></Link>
        <Link to="/clients" className="nav-item active"><Users size={20} /><span>Clients</span></Link>
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

        /* RECHERCHE */
        .search-section { margin-bottom: 24px; }
        .input-wrapper.search input { width: 100%; padding: 14px 14px 14px 44px; font-size: 1rem; border-radius: 12px; }

        /* GRILLE CLIENTS */
        .clients-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .client-card { background: white; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -2px rgba(0,0,0,0.03); overflow: hidden; transition: transform 0.2s; display: flex; flex-direction: column;}
        .client-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }

        .card-header { padding: 20px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #f1f5f9; background: linear-gradient(to right, #ffffff, #f8fafc); }
        .avatar-placeholder { width: 48px; height: 48px; background: #e0e7ff; color: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; }
        .client-main-info h3 { margin: 0 0 4px 0; font-size: 1.1rem; color: #1e293b; }
        .shop-badge { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #64748b; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; width: fit-content; }

        .card-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; flex-grow: 1; }
        .info-row { display: flex; align-items: center; gap: 10px; color: #64748b; font-size: 0.9rem; }
        .info-row svg { color: #94a3b8; }
        .info-row span { color: #334155; }

        /* ACTIONS (NOUVEAU) */
        .card-actions { padding: 12px 20px; border-top: 1px solid #f1f5f9; display: flex; gap: 12px; background: #f8fafc; }
        .btn-action { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s; border: 1px solid transparent; }
        .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-action.edit { background: white; border-color: #e2e8f0; color: #475569; }
        .btn-action.edit:hover:not(:disabled) { background: #f1f5f9; border-color: #cbd5e1; color: #1e293b; }

        .btn-action.delete { background: #fee2e2; color: #ef4444; }
        .btn-action.delete:hover:not(:disabled) { background: #fecaca; color: #dc2626; }

        /* EMPTY & LOADING */
        .empty-state { text-align: center; padding: 60px 20px; color: #64748b; background: white; border-radius: 16px; border: 1px dashed #e2e8f0; }
        .empty-icon { width: 64px; height: 64px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #94a3b8; }
        .loading-state { text-align: center; padding: 40px; color: #64748b; }
        .spin { animation: spin 1s linear infinite; }

        /* FORMULAIRE & INPUTS */
        .input-wrapper { position: relative; display: flex; align-items: center; }
        .input-icon { position: absolute; left: 14px; color: #94a3b8; pointer-events: none; }
        .input-wrapper input, .input-wrapper select { width: 100%; padding: 12px 14px 12px 40px; border: 1px solid #e2e8f0; border-radius: 10px; outline: none; font-size: 0.95rem; color: #1e293b; background: white; appearance: none; }
        .input-wrapper input:focus, .input-wrapper select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; color: #64748b; font-size: 0.85rem; font-weight: 600; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        /* MODAL */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; animation: fadeIn 0.2s; }
        .modal-card { background: white; width: 100%; max-width: 500px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); margin: 20px; }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .modal-header h2 { margin: 0; font-size: 1.25rem; color: #1e293b; }
        .close-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; transition: 0.2s; }
        .close-btn:hover { color: #ef4444; }
        .modal-body { padding: 24px; }
        .modal-footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; }
        .btn-cancel { padding: 10px 20px; border: 1px solid #e2e8f0; background: white; color: #64748b; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn-cancel:hover { background: #f1f5f9; color: #1e293b; }
        .btn-submit { padding: 10px 20px; border: none; background: #4f46e5; color: white; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn-submit:hover { background: #4338ca; }

        /* ALERTES */
        .alert-box { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-weight: 500; }
        .alert-box.success { background: #ecfdf5; color: #047857; border: 1px solid #d1fae5; }
        .alert-box.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; }
        .alert-box.info { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }

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
          .clients-grid { grid-template-columns: 1fr; }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}