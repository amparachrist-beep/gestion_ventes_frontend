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
  const [boutiques, setBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [quota, setQuota] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
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
    boutiques: [] // Tableau d'IDs pour gérer plusieurs boutiques
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
    setLoading(true);
    try {
      const [utilisateursRes, boutiquesRes] = await Promise.all([
        userAPI.list(),
        boutiqueAPI.list()
      ]);

      // ✅ CORRECTION : Gestion de la réponse paginée
      let usersData = [];
      if (utilisateursRes.data && Array.isArray(utilisateursRes.data)) {
        usersData = utilisateursRes.data;
      } else if (utilisateursRes.data && utilisateursRes.data.results) {
        usersData = utilisateursRes.data.results;
      } else if (utilisateursRes.data && typeof utilisateurRes.data === 'object') {
        // Si c'est un objet unique
        usersData = [utilisateursRes.data];
      }

      let boutiquesData = [];
      if (boutiquesRes.data && Array.isArray(boutiquesRes.data)) {
        boutiquesData = boutiquesRes.data;
      } else if (boutiquesRes.data && boutiquesRes.data.results) {
        boutiquesData = boutiquesRes.data.results;
      } else if (boutiquesRes.data && typeof boutiquesRes.data === 'object') {
        // Si c'est un objet unique
        boutiquesData = [boutiquesRes.data];
      }

      // Filtrer selon le rôle actuel
      const filteredUsers = usersData.filter(user => {
        if (!user.profil) return true;
        if (currentUserRole === 'admin') return true;
        // Gérant ne voit pas les admins
        return user.profil.role !== 'admin';
      });

      setUtilisateurs(filteredUsers);
      setBoutiques(boutiquesData);

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

    // Validation côté client
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Nom d\'utilisateur requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.password) {
      newErrors.password = 'Mot de passe requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Minimum 8 caractères';
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Prénom requis';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Nom requis';
    }

    if (formData.boutiques.length === 0 && currentUserRole !== 'admin') {
      newErrors.boutiques = 'Au moins une boutique requise';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // ✅ CORRECTION : Structure exacte attendue par le backend
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

      console.log("📤 Envoi création utilisateur:", userData);

      const response = await userAPI.create(userData);
      console.log("✅ Réponse création:", response.data);

      // ✅ SUCCÈS : Recharger les données
      alert(`✅ Utilisateur ${formData.first_name} ${formData.last_name} créé avec succès`);

      setShowForm(false);
      resetForm();

      // Recharger les données
      await Promise.all([
        loadData(),
        loadQuota()
      ]);

    } catch (err) {
      console.error('❌ Erreur création:', err.response?.data || err.message);

      // ✅ AMÉLIORATION : Gestion d'erreurs détaillée
      if (err.response && err.response.data) {
        const errorData = err.response.data;

        // 1. Erreur globale
        if (errorData.detail) {
          alert(`❌ Erreur: ${errorData.detail}`);
        }
        // 2. Erreurs par champ
        else if (typeof errorData === 'object') {
          const errorMessages = [];

          for (const [field, messages] of Object.entries(errorData)) {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(', ')}`);
            } else {
              errorMessages.push(`${field}: ${messages}`);
            }
          }

          if (errorMessages.length > 0) {
            alert(`❌ Erreurs:\n${errorMessages.join('\n')}`);

            // Mettre à jour les erreurs pour affichage dans le formulaire
            const fieldErrors = {};
            Object.entries(errorData).forEach(([field, messages]) => {
              if (Array.isArray(messages)) {
                fieldErrors[field] = messages.join(', ');
              } else {
                fieldErrors[field] = messages;
              }
            });
            setErrors(fieldErrors);
          }
        }
        // 3. Erreur inconnue
        else {
          alert('❌ Une erreur est survenue lors de la création');
        }
      } else {
        alert('❌ Erreur de connexion au serveur');
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
      boutiques: boutiques.length > 0 ? [boutiques[0].id] : []
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

    // Effacer l'erreur si une boutique est sélectionnée
    if (errors.boutiques && formData.boutiques.length > 0) {
      setErrors(prev => ({ ...prev, boutiques: undefined }));
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Effacer l'erreur pour ce champ quand l'utilisateur tape
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
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
            disabled={quota && quota.restant === 0}
          >
            <Plus size={18} /> Nouvel Utilisateur
          </button>
        </div>
      </header>

      <div className="content-wrapper">
        {/* ✅ CARTE QUOTA AMÉLIORÉE */}
        {quota && (
          <div className={`quota-card ${quota.restant === 0 ? 'warning' : ''} ${quota.est_expire ? 'expired' : ''}`}>
            <div className="quota-icon">
              <Shield size={24} />
            </div>
            <div className="quota-info">
              <h3>Plan {quota.plan || 'Non défini'}</h3>
              <p>{quota.utilisateurs_actuels || 0} / {quota.max_utilisateurs || 0} utilisateurs actifs</p>
              {quota.date_fin && (
                <div className="quota-date">
                  <Calendar size={12} />
                  <span>Expire le {new Date(quota.date_fin).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
            </div>
            <div className="quota-stats">
              <div className="stats-badge">
                <Users size={14} />
                <span>{quota.restant || 0} places restantes</span>
              </div>
              {quota.restant === 0 && (
                <Link to="/abonnement" className="upgrade-link">Mettre à niveau</Link>
              )}
              {quota.est_expire && (
                <span className="expired-badge">Expiré</span>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <Loader className="spin" size={32} />
            <p>Chargement des utilisateurs...</p>
          </div>
        ) : utilisateurs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Users size={40} /></div>
            <h3>Aucun utilisateur trouvé</h3>
            <p>Commencez par ajouter un membre à votre équipe.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-3">
              <Plus size={16} /> Ajouter un utilisateur
            </button>
          </div>
        ) : (
          <>
            <div className="section-header">
              <h2>Membres ({utilisateurs.length})</h2>
              <button onClick={loadData} className="btn-refresh">
                <RefreshCw size={16} /> Actualiser
              </button>
            </div>

            <div className="users-grid">
              {utilisateurs.map(user => (
                <div key={user.id} className="user-card">
                  <div className="user-header">
                    <div className="avatar-placeholder">
                      {user.first_name?.charAt(0) || user.username?.charAt(0) || '?'}
                    </div>
                    <div className="user-main-info">
                      <h3>
                        {user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user.username
                        }
                      </h3>
                      <span className={`role-badge ${user.profil?.role || 'inconnu'}`}>
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
                        {user.profil?.boutiques && user.profil.boutiques.length > 0
                          ? user.profil.boutiques.map(b => b.nom).join(', ')
                          : 'Aucune boutique assignée'
                        }
                      </span>
                    </div>
                  </div>

                  <div className="user-footer">
                    <small>
                      Inscrit le {new Date(user.date_joined).toLocaleDateString('fr-FR')}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ✅ MODAL FORMULAIRE AMÉLIORÉ */}
      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvel Utilisateur</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              {/* Username et Email */}
              <div className="form-row">
                <div className="form-group">
                  <label>Nom utilisateur *</label>
                  <div className="input-wrapper">
                    <User size={18} className="input-icon" />
                    <input
                      value={formData.username}
                      onChange={e => handleFieldChange('username', e.target.value)}
                      required
                      placeholder="john_doe"
                      className={errors.username ? 'error' : ''}
                    />
                  </div>
                  {errors.username && <span className="error-text">{errors.username}</span>}
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => handleFieldChange('email', e.target.value)}
                      required
                      placeholder="email@exemple.com"
                      className={errors.email ? 'error' : ''}
                    />
                  </div>
                  {errors.email && <span className="error-text">{errors.email}</span>}
                </div>
              </div>

              {/* Prénom et Nom */}
              <div className="form-row">
                <div className="form-group">
                  <label>Prénom *</label>
                  <input
                    value={formData.first_name}
                    onChange={e => handleFieldChange('first_name', e.target.value)}
                    required
                    placeholder="Jean"
                    className={`simple-input ${errors.first_name ? 'error' : ''}`}
                  />
                  {errors.first_name && <span className="error-text">{errors.first_name}</span>}
                </div>

                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    value={formData.last_name}
                    onChange={e => handleFieldChange('last_name', e.target.value)}
                    required
                    placeholder="Dupont"
                    className={`simple-input ${errors.last_name ? 'error' : ''}`}
                  />
                  {errors.last_name && <span className="error-text">{errors.last_name}</span>}
                </div>
              </div>

              {/* Mot de passe avec générateur */}
              <div className="form-group">
                <label>Mot de passe *</label>
                <div className="password-field">
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={e => handleFieldChange('password', e.target.value)}
                      required
                      minLength="8"
                      placeholder="Minimum 8 caractères"
                      className={errors.password ? 'error' : ''}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="generate-password-btn"
                    onClick={generatePassword}
                  >
                    <Key size={14} /> Générer
                  </button>
                </div>
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>

              {/* Téléphone et Rôle */}
              <div className="form-row">
                <div className="form-group">
                  <label>Téléphone</label>
                  <div className="input-wrapper">
                    <Phone size={18} className="input-icon" />
                    <input
                      value={formData.telephone}
                      onChange={e => handleFieldChange('telephone', e.target.value)}
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
                      onChange={e => handleFieldChange('role', e.target.value)}
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

              {/* Boutiques */}
              <div className="form-group">
                <label>Boutiques {currentUserRole !== 'admin' && '*'}</label>
                {errors.boutiques && <span className="error-text">{errors.boutiques}</span>}
                <div className="boutiques-grid">
                  {boutiques.length === 0 ? (
                    <p className="info-text">Aucune boutique disponible</p>
                  ) : (
                    boutiques.map(boutique => (
                      <label
                        key={boutique.id}
                        className={`boutique-option ${formData.boutiques.includes(boutique.id) ? 'selected' : ''}`}
                      >
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
                {formData.boutiques.length > 0 && (
                  <p className="info-text">
                    {formData.boutiques.length} boutique(s) sélectionnée(s)
                  </p>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-cancel"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={formData.boutiques.length === 0 && currentUserRole !== 'admin'}
                >
                  <CheckCircle size={18} /> Créer l'utilisateur
                </button>
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
        .btn-primary:disabled { background: #9ca3af; cursor: not-allowed; opacity: 0.6; }
        .mt-3 { margin-top: 12px; }

        .content-wrapper { max-width: 1000px; margin: 30px auto; padding: 0 20px; }

        /* QUOTA CARD IMPROVED */
        .quota-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          border: 2px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .quota-card.warning { border-color: #fecaca; background: #fef2f2; }
        .quota-card.expired { border-color: #fca5a5; background: #fee2e2; }
        .quota-icon {
          width: 48px;
          height: 48px;
          background: #e0e7ff;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4f46e5;
          flex-shrink: 0;
        }
        .quota-info { flex: 1; }
        .quota-info h3 { margin: 0; font-size: 1.1rem; color: #1e293b; font-weight: 600; }
        .quota-info p { margin: 4px 0 0; color: #64748b; font-size: 0.9rem; }
        .quota-date { display: flex; align-items: center; gap: 6px; margin-top: 4px; color: #64748b; font-size: 0.8rem; }
        .quota-stats { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
        .stats-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f1f5f9;
          border-radius: 20px;
          font-size: 0.8rem;
          color: #475569;
          font-weight: 500;
        }
        .upgrade-link {
          color: #ef4444;
          font-weight: 600;
          font-size: 0.85rem;
          text-decoration: none;
          padding: 4px 8px;
          border-radius: 6px;
          background: #fee2e2;
          transition: 0.2s;
        }
        .upgrade-link:hover { background: #fecaca; }
        .expired-badge {
          background: #ef4444;
          color: white;
          font-size: 0.7rem;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 600;
        }

        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .section-header h2 { font-size: 1.1rem; color: #334155; margin: 0; }
        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: 1px solid #e2e8f0;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8rem;
          color: #64748b;
          transition: 0.2s;
        }
        .btn-refresh:hover { background: #f1f5f9; color: #1e293b; }

        .users-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .user-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 4px 6px -2px rgba(0,0,0,0.03);
          overflow: hidden;
          transition: all 0.2s;
        }
        .user-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
          border-color: #e2e8f0;
        }

        .user-header {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border-bottom: 1px solid #f1f5f9;
          background: linear-gradient(to right, #ffffff, #f8fafc);
        }
        .avatar-placeholder {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .user-main-info { flex: 1; }
        .user-main-info h3 {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
          color: #1e293b;
          font-weight: 600;
        }
        .role-badge {
          font-size: 0.7rem;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          font-weight: 700;
          display: inline-block;
        }
        .role-badge.admin { background: #fee2e2; color: #991b1b; }
        .role-badge.gerant { background: #e0e7ff; color: #4338ca; }
        .role-badge.vendeur { background: #dcfce7; color: #166534; }
        .role-badge.caissier { background: #fef9c3; color: #854d0e; }
        .role-badge.inconnu { background: #f1f5f9; color: #64748b; }

        .user-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
        .info-row {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #64748b;
          font-size: 0.9rem;
        }
        .info-row svg { color: #94a3b8; flex-shrink: 0; }
        .boutiques-list {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: #64748b;
          font-size: 0.85rem;
          background: #f8fafc;
          padding: 8px;
          border-radius: 6px;
          margin-top: 4px;
        }
        .boutiques-list svg { margin-top: 2px; flex-shrink: 0; }
        .user-footer {
          padding: 12px 20px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          font-size: 0.75rem;
          color: #94a3b8;
          text-align: right;
        }

        /* MODAL IMPROVED */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s;
          padding: 20px;
        }
        .modal-card {
          background: white;
          width: 100%;
          max-width: 600px;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          overflow: hidden;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .modal-header h2 { margin: 0; font-size: 1.25rem; color: #1e293b; font-weight: 600; }
        .close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          transition: 0.2s;
          border-radius: 6px;
        }
        .close-btn:hover { color: #ef4444; background: #fee2e2; }
        .modal-body { padding: 24px; }

        /* FORM STYLES IMPROVED */
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          color: #94a3b8;
          pointer-events: none;
          z-index: 1;
        }
        .input-wrapper input,
        .input-wrapper select {
          width: 100%;
          padding: 12px 14px 12px 40px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          outline: none;
          font-size: 0.95rem;
          color: #1e293b;
          background: white;
          appearance: none;
          transition: border-color 0.2s;
        }
        .input-wrapper input.error,
        .input-wrapper select.error,
        .simple-input.error {
          border-color: #ef4444;
          background: #fef2f2;
        }
        .input-wrapper input:focus,
        .input-wrapper select:focus,
        .simple-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }

        .password-field { display: flex; gap: 10px; }
        .password-field .input-wrapper { flex: 1; }
        .password-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: 0.2s;
        }
        .password-toggle:hover {
          color: #4f46e5;
          background: #eef2ff;
        }
        .generate-password-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          border: 2px solid #e2e8f0;
          color: #475569;
          padding: 0 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: 0.2s;
          white-space: nowrap;
        }
        .generate-password-btn:hover {
          background: #e2e8f0;
          border-color: #cbd5e1;
        }

        .simple-input {
          width: 100%;
          padding: 12px 14px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          outline: none;
          font-size: 0.95rem;
          color: #1e293b;
          transition: border-color 0.2s;
        }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .form-group { margin-bottom: 16px; }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #475569;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .error-text {
          color: #ef4444;
          font-size: 0.8rem;
          margin-top: 4px;
          display: block;
        }
        .info-text {
          color: #64748b;
          font-size: 0.8rem;
          margin-top: 4px;
          display: block;
        }

        .boutiques-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 10px;
          max-height: 150px;
          overflow-y: auto;
          padding: 10px;
          background: #f8fafc;
          border-radius: 8px;
          border: 2px solid #e2e8f0;
        }
        .boutique-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.85rem;
        }
        .boutique-option:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }
        .boutique-option.selected {
          border-color: #6366f1;
          background: #eef2ff;
          color: #4f46e5;
          font-weight: 600;
        }
        .boutique-option input[type="checkbox"] {
          margin: 0;
          cursor: pointer;
        }

        .modal-footer {
          padding: 20px 24px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          position: sticky;
          bottom: 0;
        }
        .btn-cancel {
          padding: 10px 20px;
          border: 2px solid #e2e8f0;
          background: white;
          color: #64748b;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }
        .btn-cancel:hover { background: #f1f5f9; color: #1e293b; }
        .btn-submit {
          padding: 10px 20px;
          border: none;
          background: #4f46e5;
          color: white;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-submit:hover:not(:disabled) { background: #4338ca; }
        .btn-submit:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* STATES */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
          background: white;
          border-radius: 16px;
          border: 2px dashed #e2e8f0;
        }
        .empty-icon {
          width: 64px;
          height: 64px;
          background: #f1f5f9;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: #94a3b8;
        }
        .loading-state {
          text-align: center;
          padding: 40px;
          color: #64748b;
        }
        .spin { animation: spin 1s linear infinite; }

        /* ANIMATIONS */
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
            padding: 16px;
          }
          .header-right {
            width: 100%;
            display: flex;
            justify-content: flex-end;
          }
          .form-row {
            grid-template-columns: 1fr;
            margin-bottom: 0;
            gap: 12px;
          }
          .users-grid {
            grid-template-columns: 1fr;
          }
          .quota-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .quota-stats {
            width: 100%;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
          .modal-backdrop {
            padding: 10px;
          }
          .modal-card {
            margin: 0;
            max-height: 95vh;
          }
        }

        @media (max-width: 480px) {
          .password-field {
            flex-direction: column;
          }
          .generate-password-btn {
            width: 100%;
            justify-content: center;
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
}