import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userAPI, boutiqueAPI, profilAPI } from '../api';
import {
  ArrowLeft, Plus, RefreshCw, Users, Shield, Store,
  Phone, Mail, User, Lock, CheckCircle, AlertCircle,
  Info, Loader, X, Calendar, Key, Eye, EyeOff
} from 'lucide-react';

export default function GestionUtilisateurs({ isOnline }) {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [boutiquesDisponibles, setBoutiquesDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBoutiques, setLoadingBoutiques] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [quota, setQuota] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserProfil, setCurrentUserProfil] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // État du formulaire
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    telephone: '',
    role: 'vendeur',
    boutiques: []
  });

  useEffect(() => {
    if (isOnline) {
      initializeData();
    } else {
      setLoading(false);
      setLoadingBoutiques(false);
    }
  }, [isOnline]);

  const initializeData = async () => {
    setLoading(true);
    setLoadingBoutiques(true);

    try {
      const profilResponse = await profilAPI.me();
      const { role } = profilResponse.data;
      setCurrentUserRole(role);
      setCurrentUserProfil(profilResponse.data);

      await Promise.all([
        loadUtilisateurs(),
        loadBoutiquesDisponibles(),
        loadQuota()
      ]);
    } catch (error) {
      console.error('Erreur initialisation:', error);
    } finally {
      setLoading(false);
      setLoadingBoutiques(false);
    }
  };

  const loadUtilisateurs = async () => {
    try {
      const response = await userAPI.list();
      let usersData = [];

      if (response.data && Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response.data && response.data.results) {
        usersData = response.data.results;
      } else if (response.data && typeof response.data === 'object') {
        usersData = [response.data];
      }

      const filteredUsers = usersData.filter(user => {
        if (!user.profil) return true;
        if (currentUserRole === 'admin') return true;
        if (user.profil.role === 'admin') return false;
        if (currentUserRole === 'gerant') {
          return true;
        }
        return true;
      });

      setUtilisateurs(filteredUsers);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      setUtilisateurs([]);
    }
  };

  const loadBoutiquesDisponibles = async () => {
    try {
      if (currentUserRole === 'admin') {
        const response = await boutiqueAPI.list();
        let boutiquesData = [];
        if (response.data && Array.isArray(response.data)) {
          boutiquesData = response.data;
        } else if (response.data && response.data.results) {
          boutiquesData = response.data.results;
        }
        setBoutiquesDisponibles(boutiquesData);
      }
      else if (currentUserRole === 'gerant') {
        const response = await userAPI.disponibles();
        if (response.data && Array.isArray(response.data)) {
          setBoutiquesDisponibles(response.data);
        } else {
          const allResponse = await boutiqueAPI.list();
          let allBoutiques = [];
          if (allResponse.data && Array.isArray(allResponse.data)) {
            allBoutiques = allResponse.data;
          } else if (allResponse.data && allResponse.data.results) {
            allBoutiques = allResponse.data.results;
          }
          setBoutiquesDisponibles(allBoutiques.slice(0, 2));
        }
      }
      else {
        setBoutiquesDisponibles([]);
      }
    } catch (error) {
      console.error('Erreur chargement boutiques:', error);
      setBoutiquesDisponibles([]);
    }
  };

  const loadQuota = async () => {
    try {
      const response = await userAPI.quota();
      setQuota(response.data);
    } catch (error) {
      console.error('Erreur chargement quota:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!isOnline) {
      alert('❌ Connexion Internet requise');
      return;
    }

    if (currentUserRole === 'gerant') {
      if (!quota || quota.restant === 0 || quota.est_expire) {
        alert('❌ Quota insuffisant ou abonnement expiré.');
        return;
      }
    }

    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Nom d\'utilisateur requis';
    if (!formData.email.trim()) newErrors.email = 'Email requis';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email invalide';
    if (!formData.password) newErrors.password = 'Mot de passe requis';
    else if (formData.password.length < 8) newErrors.password = 'Minimum 8 caractères';
    if (!formData.first_name.trim()) newErrors.first_name = 'Prénom requis';
    if (!formData.last_name.trim()) newErrors.last_name = 'Nom requis';

    if (currentUserRole !== 'vendeur' && currentUserRole !== 'caissier') {
      if (formData.boutiques.length === 0 && boutiquesDisponibles.length > 0) {
        newErrors.boutiques = 'Au moins une boutique requise';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const userData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        role: formData.role,
        telephone: formData.telephone.trim() || '',
        boutiques: formData.boutiques.map(id => parseInt(id))
      };

      await userAPI.create(userData);
      alert(`✅ Utilisateur ${formData.first_name} ${formData.last_name} créé avec succès`);
      setShowForm(false);
      resetForm();
      await Promise.all([loadUtilisateurs(), loadQuota()]);

    } catch (err) {
      console.error('❌ Erreur création:', err.response?.data || err.message);
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        if (errorData.detail) {
          alert(`❌ Erreur: ${errorData.detail}`);
        } else if (typeof errorData === 'object') {
          const fieldErrors = {};
          for (const [field, messages] of Object.entries(errorData)) {
            fieldErrors[field] = Array.isArray(messages) ? messages.join(', ') : messages;
          }
          setErrors(fieldErrors);
        } else {
          alert('❌ Une erreur est survenue');
        }
      } else {
        alert('❌ Erreur de connexion');
      }
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
      boutiques: boutiquesDisponibles.length > 0 ? [boutiquesDisponibles[0].id] : []
    });
    setErrors({});
  };

  const handleBoutiqueChange = (boutiqueId) => {
    setFormData(prev => {
      const newBoutiques = prev.boutiques.includes(boutiqueId)
        ? prev.boutiques.filter(id => id !== boutiqueId)
        : [...prev.boutiques, boutiqueId];
      return { ...prev, boutiques: newBoutiques };
    });
    if (errors.boutiques) setErrors(prev => ({ ...prev, boutiques: undefined }));
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData(prev => ({ ...prev, password }));
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const canCreateUser = () => {
    if (!isOnline) return false;
    if (currentUserRole === 'admin') return true;
    if (currentUserRole === 'gerant') {
      if (!quota) return false;
      if (quota.restant === 0) return false;
      if (quota.est_expire) return false;
      return true;
    }
    return false;
  };

  const getAvailableRoles = () => {
    if (currentUserRole === 'admin') {
      return [
        { value: 'vendeur', label: 'Vendeur' },
        { value: 'caissier', label: 'Caissier' },
        { value: 'gerant', label: 'Gérant' },
        { value: 'admin', label: 'Admin' }
      ];
    } else if (currentUserRole === 'gerant') {
      return [
        { value: 'vendeur', label: 'Vendeur' },
        { value: 'caissier', label: 'Caissier' }
      ];
    }
    return [];
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn">
            <ArrowLeft size={20} />
            <span>Retour</span>
          </Link>
          <div className="title-block">
            <h1>Équipe</h1>
            <p className="subtitle">Gérer les accès utilisateurs</p>
          </div>
        </div>
        <div className="header-right">
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
            disabled={!canCreateUser()}
            title={!canCreateUser() ? "Quota atteint ou hors ligne" : ""}
          >
            <Plus size={18} /> <span className="btn-text">Nouveau Membre</span>
          </button>
        </div>
      </header>

      <div className="content-wrapper">

        {/* INFO BANNER QUOTA */}
        {currentUserRole === 'gerant' && quota && (
          <div className={`info-banner ${quota.restant === 0 ? 'warning' : 'info'}`}>
            <Info size={20} />
            <div className="banner-content">
              <strong>Plan {quota.plan}</strong>
              <span>Vous utilisez {quota.utilisateurs_actuels} / {quota.max_utilisateurs} licences.</span>
              <span className="pill">{quota.restant} places restantes</span>
            </div>
            {quota.restant === 0 && <Link to="/abonnement" className="banner-link">Augmenter</Link>}
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <Loader className="spin" size={40} />
            <p>Chargement de l'équipe...</p>
          </div>
        ) : utilisateurs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Users size={48} /></div>
            <h3>Aucun membre trouvé</h3>
            <p>Commencez par ajouter votre premier collaborateur.</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary mt-3"
              disabled={!canCreateUser()}
            >
              <Plus size={16} /> Ajouter un utilisateur
            </button>
          </div>
        ) : (
          <>
            <div className="grid-header">
              <div className="grid-title">Membres ({utilisateurs.length})</div>
              <button onClick={initializeData} className="btn-icon-text">
                <RefreshCw size={14} /> Actualiser
              </button>
            </div>

            <div className="users-grid">
              {utilisateurs.map(user => (
                <div key={user.id} className="user-card">
                  <div className="card-top-decoration"></div>
                  <div className="user-header">
                    <div className={`avatar-placeholder role-${user.profil?.role}`}>
                      {user.first_name?.charAt(0) || user.username?.charAt(0) || '?'}
                    </div>
                    <div className="user-identity">
                      <h3>{user.first_name} {user.last_name}</h3>
                      <span className="username">@{user.username}</span>
                    </div>
                    <span className={`role-badge ${user.profil?.role}`}>
                      {user.profil?.role === 'gerant' ? 'Gérant' :
                       user.profil?.role === 'admin' ? 'Admin' :
                       user.profil?.role === 'caissier' ? 'Caissier' : 'Vendeur'}
                    </span>
                  </div>

                  <div className="user-body">
                    {user.email && (
                      <div className="info-item">
                        <Mail size={14} /> <span>{user.email}</span>
                      </div>
                    )}
                    {user.profil?.telephone && (
                      <div className="info-item">
                        <Phone size={14} /> <span>{user.profil.telephone}</span>
                      </div>
                    )}

                    <div className="boutiques-section">
                      <div className="section-label"><Store size={12}/> Accès Boutiques</div>
                      <div className="tags-container">
                        {user.profil?.boutiques && user.profil.boutiques.length > 0 ? (
                          user.profil.boutiques.map(b => (
                            <span key={b.id} className="shop-tag">{b.nom}</span>
                          ))
                        ) : (
                          <span className="no-shop">Aucune boutique</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="user-footer">
                    <Calendar size={12} />
                    <span>Inscrit le {new Date(user.date_joined).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-text">
                <h2>Nouveau Membre</h2>
                <p>Ajouter un utilisateur à votre équipe</p>
              </div>
              <button className="close-btn" onClick={() => setShowForm(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-section">
                <div className="form-row">
                  <div className={`form-group ${errors.first_name ? 'has-error' : ''}`}>
                    <label>Prénom</label>
                    <input
                      value={formData.first_name}
                      onChange={e => handleFieldChange('first_name', e.target.value)}
                      placeholder="Jean"
                    />
                  </div>
                  <div className={`form-group ${errors.last_name ? 'has-error' : ''}`}>
                    <label>Nom</label>
                    <input
                      value={formData.last_name}
                      onChange={e => handleFieldChange('last_name', e.target.value)}
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className={`form-group ${errors.username ? 'has-error' : ''}`}>
                    <label>Identifiant *</label>
                    <div className="input-with-icon">
                      <User size={16} />
                      <input
                        value={formData.username}
                        onChange={e => handleFieldChange('username', e.target.value)}
                        placeholder="jean.dupont"
                      />
                    </div>
                    {errors.username && <span className="field-error">{errors.username}</span>}
                  </div>

                  <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
                    <label>Email *</label>
                    <div className="input-with-icon">
                      <Mail size={16} />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => handleFieldChange('email', e.target.value)}
                        placeholder="jean@mail.com"
                      />
                    </div>
                    {errors.email && <span className="field-error">{errors.email}</span>}
                  </div>
                </div>

                <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
                  <label>Mot de passe *</label>
                  <div className="password-group">
                    <div className="input-with-icon flex-grow">
                      <Lock size={16} />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={e => handleFieldChange('password', e.target.value)}
                        placeholder="••••••••"
                      />
                      <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                    <button type="button" className="btn-generate" onClick={generatePassword} title="Générer un mot de passe fort">
                      <Key size={16} /> Générer
                    </button>
                  </div>
                  {errors.password && <span className="field-error">{errors.password}</span>}
                </div>
              </div>

              <div className="form-divider"></div>

              <div className="form-section">
                <div className="form-row">
                  <div className="form-group">
                    <label>Téléphone</label>
                    <div className="input-with-icon">
                      <Phone size={16} />
                      <input
                        value={formData.telephone}
                        onChange={e => handleFieldChange('telephone', e.target.value)}
                        placeholder="+242..."
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Rôle *</label>
                    <div className="input-with-icon">
                      <Shield size={16} />
                      <select
                        value={formData.role}
                        onChange={e => handleFieldChange('role', e.target.value)}
                      >
                        {getAvailableRoles().map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {boutiquesDisponibles.length > 0 && (
                  <div className={`form-group ${errors.boutiques ? 'has-error' : ''}`}>
                    <label>Affectation Boutiques</label>
                    <div className="boutiques-grid">
                      {boutiquesDisponibles.map(boutique => (
                        <div
                          key={boutique.id}
                          className={`boutique-select-card ${formData.boutiques.includes(boutique.id) ? 'selected' : ''}`}
                          onClick={() => handleBoutiqueChange(boutique.id)}
                        >
                          <div className="checkbox-custom">
                            {formData.boutiques.includes(boutique.id) && <CheckCircle size={14} />}
                          </div>
                          <span>{boutique.nom}</span>
                        </div>
                      ))}
                    </div>
                    {errors.boutiques && <span className="field-error">{errors.boutiques}</span>}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary-full">Créer le compte</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        /* GLOBAL LAYOUT */
        .page-container { min-height: 100vh; background-color: #f8fafc; font-family: 'Inter', sans-serif; color: #1e293b; padding-bottom: 80px; }

        /* HEADER */
        .page-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .back-btn { display: flex; align-items: center; gap: 8px; color: #64748b; text-decoration: none; font-weight: 500; padding: 8px 12px; border-radius: 8px; transition: 0.2s; background: #f1f5f9; }
        .back-btn:hover { background: #e2e8f0; color: #0f172a; }
        .title-block h1 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #0f172a; }
        .subtitle { margin: 2px 0 0; font-size: 0.85rem; color: #64748b; }

        .btn-primary { background: #4f46e5; color: white; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); }
        .btn-primary:hover:not(:disabled) { background: #4338ca; transform: translateY(-1px); }
        .btn-primary:disabled { background: #94a3b8; cursor: not-allowed; box-shadow: none; }

        /* CONTENT */
        .content-wrapper { max-width: 1200px; margin: 24px auto; padding: 0 20px; }

        /* INFO BANNER */
        .info-banner { background: white; border: 1px solid #e0f2fe; border-left: 4px solid #0ea5e9; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .info-banner.warning { border-left-color: #f59e0b; background: #fffbeb; }
        .info-banner svg { color: #0ea5e9; flex-shrink: 0; }
        .info-banner.warning svg { color: #f59e0b; }
        .banner-content { display: flex; flex-direction: column; gap: 4px; flex: 1; font-size: 0.9rem; color: #334155; }
        .pill { display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 12px; width: fit-content; margin-top: 4px; }
        .banner-link { color: #4f46e5; font-weight: 600; font-size: 0.85rem; text-decoration: none; margin-left: auto; align-self: center; }

        /* GRID HEADER */
        .grid-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .grid-title { font-size: 1.1rem; font-weight: 600; color: #334155; }
        .btn-icon-text { display: flex; align-items: center; gap: 6px; background: white; border: 1px solid #e2e8f0; color: #64748b; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; transition: 0.2s; }
        .btn-icon-text:hover { background: #f8fafc; color: #4f46e5; border-color: #cbd5e1; }

        /* USERS GRID */
        .users-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }

        .user-card { background: white; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -2px rgba(0,0,0,0.03); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; position: relative; }
        .user-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08); border-color: #e2e8f0; }
        .card-top-decoration { height: 6px; background: linear-gradient(90deg, #4f46e5, #818cf8); width: 100%; }

        .user-header { padding: 20px; display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #f1f5f9; }
        .avatar-placeholder { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 700; color: white; flex-shrink: 0; }
        .avatar-placeholder.role-admin { background: linear-gradient(135deg, #a855f7, #9333ea); }
        .avatar-placeholder.role-gerant { background: linear-gradient(135deg, #4f46e5, #4338ca); }
        .avatar-placeholder.role-vendeur { background: linear-gradient(135deg, #0ea5e9, #0284c7); }
        .avatar-placeholder.role-caissier { background: linear-gradient(135deg, #14b8a6, #0d9488); }

        .user-identity { flex: 1; overflow: hidden; }
        .user-identity h3 { margin: 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-identity .username { display: block; font-size: 0.85rem; color: #64748b; margin-top: 2px; }

        .role-badge { font-size: 0.7rem; padding: 4px 8px; border-radius: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .role-badge.admin { background: #f3e8ff; color: #7e22ce; }
        .role-badge.gerant { background: #e0e7ff; color: #4338ca; }
        .role-badge.vendeur { background: #e0f2fe; color: #0369a1; }
        .role-badge.caissier { background: #ccfbf1; color: #0f766e; }

        .user-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; flex: 1; }
        .info-item { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: #475569; }
        .info-item svg { color: #94a3b8; }

        .boutiques-section { margin-top: 8px; padding-top: 12px; border-top: 1px dashed #e2e8f0; }
        .section-label { font-size: 0.75rem; color: #94a3b8; font-weight: 600; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
        .tags-container { display: flex; flex-wrap: wrap; gap: 6px; }
        .shop-tag { background: #f8fafc; border: 1px solid #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
        .no-shop { font-size: 0.75rem; color: #cbd5e1; font-style: italic; }

        .user-footer { padding: 12px 20px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 0.75rem; color: #94a3b8; display: flex; align-items: center; gap: 6px; }

        /* EMPTY & LOADER */
        .empty-state { text-align: center; padding: 60px 20px; background: white; border-radius: 16px; border: 1px dashed #e2e8f0; color: #64748b; }
        .empty-icon { width: 80px; height: 80px; background: #f8fafc; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #94a3b8; }
        .loading-state { text-align: center; padding: 60px; color: #64748b; }
        .spin { animation: spin 1s linear infinite; }

        /* MODAL */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; animation: fadeIn 0.2s; padding: 20px; }
        .modal-card { background: white; width: 100%; max-width: 550px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; max-height: 90vh; }

        .modal-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start; background: white; flex-shrink: 0; }
        .header-text h2 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #1e293b; }
        .header-text p { margin: 4px 0 0; font-size: 0.85rem; color: #64748b; }
        .close-btn { background: #f1f5f9; border: none; color: #64748b; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .close-btn:hover { background: #fee2e2; color: #ef4444; }

        .modal-form { padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px; }
        .form-section { display: flex; flex-direction: column; gap: 16px; }
        .form-divider { height: 1px; background: #f1f5f9; margin: 4px 0; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .form-group label { display: block; margin-bottom: 6px; font-size: 0.85rem; font-weight: 600; color: #334155; }
        .input-with-icon { position: relative; display: flex; align-items: center; }
        .input-with-icon svg { position: absolute; left: 12px; color: #94a3b8; pointer-events: none; }

        input, select { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; color: #1e293b; transition: all 0.2s; background: white; }
        .input-with-icon input, .input-with-icon select { padding-left: 38px; }
        input:focus, select:focus { border-color: #4f46e5; outline: none; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
        .has-error input { border-color: #ef4444; }
        .field-error { font-size: 0.75rem; color: #ef4444; margin-top: 4px; display: block; }

        .password-group { display: flex; gap: 10px; }
        .flex-grow { flex: 1; }
        .eye-btn { position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; display: flex; align-items: center; }
        .eye-btn:hover { color: #475569; }
        .btn-generate { display: flex; align-items: center; gap: 6px; padding: 0 12px; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: 0.2s; }
        .btn-generate:hover { background: #e2e8f0; color: #1e293b; }

        .boutiques-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-top: 8px; }
        .boutique-select-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.2s; }
        .boutique-select-card:hover { border-color: #94a3b8; }
        .boutique-select-card.selected { border-color: #4f46e5; background: #eef2ff; color: #4f46e5; font-weight: 500; }
        .checkbox-custom { width: 18px; height: 18px; border: 2px solid #cbd5e1; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: white; transition: 0.2s; }
        .selected .checkbox-custom { background: #4f46e5; border-color: #4f46e5; color: white; }

        .modal-footer { padding-top: 10px; display: flex; justify-content: flex-end; gap: 12px; }
        .btn-ghost { padding: 12px 20px; background: white; border: 1px solid #e2e8f0; color: #64748b; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn-ghost:hover { background: #f8fafc; color: #1e293b; }
        .btn-primary-full { padding: 12px 24px; background: #4f46e5; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.25); }
        .btn-primary-full:hover { background: #4338ca; transform: translateY(-1px); }

        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        @media (max-width: 640px) {
          .users-grid { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr; }
          .page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
          .header-right { width: 100%; }
          .btn-primary { width: 100%; justify-content: center; }
          .modal-card { height: 100%; max-height: 100%; border-radius: 0; }
        }
      `}</style>
    </div>
  );
}