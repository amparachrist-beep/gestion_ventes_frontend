import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userAPI as usersAPI, boutiqueAPI, profilAPI } from '../api';
import {
  ArrowLeft, Plus, RefreshCw, Users, Shield, Store,
  Phone, Mail, User, Lock, CheckCircle, AlertCircle,
  Info, Loader, X
} from 'lucide-react';

export default function GestionUtilisateurs({ isOnline }) {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [quota, setQuota] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // État du formulaire
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    telephone: '',
    role: 'vendeur',
    boutiques: [] // ✅ Tableau d'IDs
  });

  useEffect(() => {
    if (isOnline) {
      loadData();
      loadQuota();
      loadCurrentUserRole();
    } else {
      setLoading(false);
    }
  }, [isOnline]);

  const loadCurrentUserRole = async () => {
    try {
      const response = await profilAPI.me();
      setCurrentUserRole(response.data.role);
    } catch (error) {
      console.error('Erreur chargement rôle:', error);
    }
  };

  const loadData = async () => {
    try {
      const profilRes = await profilAPI.me();
      const myRole = profilRes.data.role;

      const [utilisateursRes, boutiquesRes] = await Promise.all([
        usersAPI.list(),
        boutiqueAPI.list()
      ]);

      const usersData = Array.isArray(utilisateursRes.data)
        ? utilisateursRes.data
        : utilisateursRes.data?.results || utilisateursRes.data || [];

      const boutiquesData = Array.isArray(boutiquesRes.data)
        ? boutiquesRes.data
        : boutiquesRes.data?.results || boutiquesRes.data || [];

      // Filtrer : Le gérant ne voit pas les admins
      const filteredUsers = usersData.filter(user => {
        if (myRole === 'admin') return true;
        return user.profil?.role !== 'admin';
      });

      setUtilisateurs(filteredUsers);
      setBoutiques(boutiquesData);

      // Pré-sélectionner la première boutique si dispo
      if (boutiquesData.length > 0 && formData.boutiques.length === 0) {
        setFormData(prev => ({ ...prev, boutiques: [boutiquesData[0].id] }));
      }

    } catch (err) {
      console.error('❌ Erreur chargement:', err);
      setUtilisateurs([]);
      setBoutiques([]);
    } finally {
      setLoading(false);
    }
  };

  const loadQuota = async () => {
    try {
      const response = await usersAPI.quota();
      setQuota(response.data);
    } catch (error) {
      console.error('Erreur chargement quota:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isOnline) {
      alert('❌ Connexion Internet requise');
      return;
    }

    if (formData.boutiques.length === 0) {
      alert('❌ Veuillez sélectionner au moins une boutique');
      return;
    }

    try {
      // ✅ Payload structuré pour le backend
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        boutiques: formData.boutiques, // Liste des IDs envoyée à la racine
        profil: {
          role: formData.role,
          telephone: formData.telephone
        }
      };

      await usersAPI.create(userData);

      alert('✅ Utilisateur créé avec succès');
      setShowForm(false);
      resetForm();
      await loadData();
      await loadQuota();

    } catch (err) {
      console.error('❌ Erreur création:', err);
      // Gestion des messages d'erreur du backend
      let msg = 'Erreur lors de la création';
      if (err.response && err.response.data) {
        if (err.response.data.detail) msg = err.response.data.detail;
        else if (err.response.data.username) msg = `Nom d'utilisateur : ${err.response.data.username[0]}`;
        else if (err.response.data.password) msg = `Mot de passe : ${err.response.data.password[0]}`;
      }
      alert('❌ ' + msg);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      telephone: '',
      role: 'vendeur',
      boutiques: boutiques.length > 0 ? [boutiques[0].id] : []
    });
  };

  // Gestion des cases à cocher (Multi-select)
  const handleBoutiqueChange = (boutiqueId) => {
    setFormData(prev => {
      const newBoutiques = prev.boutiques.includes(boutiqueId)
        ? prev.boutiques.filter(id => id !== boutiqueId) // Retirer
        : [...prev.boutiques, boutiqueId]; // Ajouter
      return { ...prev, boutiques: newBoutiques };
    });
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn"><ArrowLeft size={20} /><span>Retour</span></Link>
          <div className="title-block">
            <h1>Équipe</h1>
            <p className="subtitle">Gérer les accès utilisateurs</p>
          </div>
        </div>
        <div className="header-right">
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
            disabled={quota && quota.restant === 0}
          >
            <Plus size={18} /> Nouvel Utilisateur
          </button>
        </div>
      </header>

      <div className="content-wrapper">

        {quota && (
          <div className={`quota-card ${quota.restant === 0 ? 'warning' : ''}`}>
            <div className="quota-icon">
              <Shield size={24} />
            </div>
            <div className="quota-info">
              <h3>Plan {quota.plan}</h3>
              <p>{quota.utilisateurs_actuels} / {quota.max_utilisateurs} utilisateurs actifs</p>
            </div>
            {quota.restant === 0 && (
              <Link to="/abonnement" className="upgrade-link">Mettre à niveau</Link>
            )}
          </div>
        )}

        {loading ? (
          <div className="loading-state"><Loader className="spin" size={32} /><p>Chargement...</p></div>
        ) : utilisateurs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Users size={40} /></div>
            <h3>Aucun utilisateur trouvé</h3>
            <p>Commencez par ajouter un membre à votre équipe.</p>
          </div>
        ) : (
          <>
            <div className="section-header">
              <h2>Membres ({utilisateurs.length})</h2>
              <button onClick={loadData} className="btn-refresh"><RefreshCw size={16} /> Actualiser</button>
            </div>

            <div className="users-grid">
              {utilisateurs.map(user => (
                <div key={user.id} className="user-card">
                  <div className="user-header">
                    <div className="avatar-placeholder">{user.username.charAt(0).toUpperCase()}</div>
                    <div className="user-main-info">
                      <h3>{user.first_name} {user.last_name || user.username}</h3>
                      <span className={`role-badge ${user.profil?.role}`}>
                        {user.profil?.role || 'Inconnu'}
                      </span>
                    </div>
                  </div>

                  <div className="user-body">
                    <div className="info-row">
                      <User size={14} />
                      <span>@{user.username}</span>
                    </div>
                    {user.email && (
                      <div className="info-row">
                        <Mail size={14} />
                        <span>{user.email}</span>
                      </div>
                    )}
                    {user.profil?.telephone && (
                      <div className="info-row">
                        <Phone size={14} />
                        <span>{user.profil.telephone}</span>
                      </div>
                    )}

                    <div className="boutiques-list">
                      <Store size={14} />
                      <span>
                        {user.profil?.boutiques?.length > 0
                          ? user.profil.boutiques.map(b => b.nom).join(', ')
                          : 'Aucune boutique'}
                      </span>
                    </div>
                  </div>

                  <div className="user-footer">
                    <small>Inscrit le {new Date(user.date_joined).toLocaleDateString()}</small>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* MODAL FORMULAIRE */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvel Utilisateur</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Nom utilisateur *</label>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      required
                      placeholder="john_doe"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      required
                      placeholder="email@..."
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Prénom *</label>
                  <input
                    value={formData.first_name}
                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                    required
                    placeholder="Jean"
                    className="simple-input"
                  />
                </div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    value={formData.last_name}
                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                    required
                    placeholder="Dupont"
                    className="simple-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Mot de passe *</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required
                    minLength="8"
                    placeholder="Minimum 8 caractères"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Téléphone</label>
                  <div className="input-wrapper">
                    <Phone size={18} className="input-icon" />
                    <input
                      value={formData.telephone}
                      onChange={e => setFormData({...formData, telephone: e.target.value})}
                      placeholder="+242..."
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Rôle *</label>
                  <div className="input-wrapper">
                    <Shield size={18} className="input-icon" />
                    <select
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="vendeur">Vendeur</option>
                      <option value="caissier">Caissier</option>
                      {currentUserRole === 'admin' && (
                        <>
                          <option value="gerant">Gérant</option>
                          <option value="admin">Admin</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Boutiques * (Cochez pour assigner)</label>
                <div className="boutiques-grid">
                  {boutiques.length === 0 ? (
                    <p className="error-text">❌ Aucune boutique disponible</p>
                  ) : (
                    boutiques.map(boutique => (
                      <label key={boutique.id} className={`boutique-option ${formData.boutiques.includes(boutique.id) ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={formData.boutiques.includes(boutique.id)}
                          onChange={() => handleBoutiqueChange(boutique.id)}
                        />
                        <span>{boutique.nom}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowForm(false)} className="btn-cancel">Annuler</button>
                <button type="submit" className="btn-submit" disabled={formData.boutiques.length === 0}>Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container { min-height: 100vh; background-color: #f8fafc; color: #1e293b; font-family: 'Inter', sans-serif; padding-bottom: 90px; }
        .page-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 20; }
        .header-left { display: flex; align-items: center; gap: 24px; }
        .back-btn { display: flex; align-items: center; gap: 8px; color: #64748b; text-decoration: none; font-weight: 500; padding: 8px 12px; border-radius: 8px; transition: 0.2s; }
        .back-btn:hover { background: #f1f5f9; color: #1e293b; }
        .title-block h1 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #0f172a; }
        .subtitle { margin: 4px 0 0; font-size: 0.85rem; color: #64748b; }
        .btn-primary { background: #4f46e5; color: white; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; }
        .btn-primary:hover:not(:disabled) { background: #4338ca; }
        .btn-primary:disabled { background: #9ca3af; cursor: not-allowed; }

        .content-wrapper { max-width: 1000px; margin: 30px auto; padding: 0 20px; }
        .quota-card { background: white; padding: 16px 20px; border-radius: 12px; display: flex; align-items: center; gap: 16px; margin-bottom: 24px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .quota-card.warning { border-color: #fecaca; background: #fef2f2; }
        .quota-icon { width: 40px; height: 40px; background: #e0e7ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #4f46e5; }
        .quota-info h3 { margin: 0; font-size: 1rem; color: #1e293b; }
        .quota-info p { margin: 2px 0 0; color: #64748b; font-size: 0.85rem; }
        .upgrade-link { margin-left: auto; color: #ef4444; font-weight: 600; font-size: 0.85rem; text-decoration: underline; }

        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .section-header h2 { font-size: 1.1rem; color: #334155; margin: 0; }
        .btn-refresh { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; color: #64748b; transition: 0.2s; }
        .btn-refresh:hover { background: #f1f5f9; color: #1e293b; }

        .users-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .user-card { background: white; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -2px rgba(0,0,0,0.03); overflow: hidden; transition: transform 0.2s; }
        .user-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }

        .user-header { padding: 20px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #f1f5f9; background: linear-gradient(to right, #ffffff, #f8fafc); }
        .avatar-placeholder { width: 48px; height: 48px; background: #e0e7ff; color: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; }
        .user-main-info h3 { margin: 0 0 4px 0; font-size: 1.1rem; color: #1e293b; }
        .role-badge { font-size: 0.7rem; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; font-weight: 700; display: inline-block; }
        .role-badge.admin { background: #fee2e2; color: #991b1b; }
        .role-badge.gerant { background: #e0e7ff; color: #4338ca; }
        .role-badge.vendeur { background: #dcfce7; color: #166534; }
        .role-badge.caissier { background: #fef9c3; color: #854d0e; }

        .user-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
        .info-row { display: flex; align-items: center; gap: 10px; color: #64748b; font-size: 0.9rem; }
        .info-row svg { color: #94a3b8; }
        .boutiques-list { display: flex; align-items: flex-start; gap: 10px; color: #64748b; font-size: 0.85rem; background: #f8fafc; padding: 8px; border-radius: 6px; }
        .boutiques-list svg { margin-top: 2px; }
        .user-footer { padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #94a3b8; text-align: right; }

        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; animation: fadeIn 0.2s; }
        .modal-card { background: white; width: 100%; max-width: 600px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); margin: 20px; max-height: 90vh; overflow-y: auto; }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; position: sticky; top: 0; z-index: 10; }
        .modal-header h2 { margin: 0; font-size: 1.25rem; color: #1e293b; }
        .close-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; transition: 0.2s; }
        .close-btn:hover { color: #ef4444; }
        .modal-body { padding: 24px; }
        .input-wrapper { position: relative; display: flex; align-items: center; }
        .input-icon { position: absolute; left: 14px; color: #94a3b8; pointer-events: none; }
        .input-wrapper input, .input-wrapper select { width: 100%; padding: 12px 14px 12px 40px; border: 1px solid #e2e8f0; border-radius: 10px; outline: none; font-size: 0.95rem; color: #1e293b; background: white; appearance: none; }
        .simple-input { width: 100%; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 10px; outline: none; font-size: 0.95rem; color: #1e293b; }
        .input-wrapper input:focus, .input-wrapper select:focus, .simple-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 8px; color: #64748b; font-size: 0.85rem; font-weight: 600; }
        .boutiques-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; max-height: 150px; overflow-y: auto; padding: 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
        .boutique-option { display: flex; align-items: center; gap: 8px; padding: 8px; background: white; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; transition: 0.2s; font-size: 0.85rem; }
        .boutique-option.selected { border-color: #6366f1; background: #eef2ff; color: #4f46e5; font-weight: 600; }
        .modal-footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; position: sticky; bottom: 0; }
    `}</style>
    </div>
  );
}