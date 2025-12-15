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
  const [boutiquesDisponibles, setBoutiquesDisponibles] = useState([]); // ✅ Renommé pour clarté
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

  // ✅ NOUVEAU : Initialisation séquentielle
  const initializeData = async () => {
    setLoading(true);
    setLoadingBoutiques(true);

    try {
      // 1. Charger d'abord le profil actuel
      const profilResponse = await profilAPI.me();
      const { role, id } = profilResponse.data;
      setCurrentUserRole(role);
      setCurrentUserProfil(profilResponse.data);

      // 2. Charger les données en parallèle
      await Promise.all([
        loadUtilisateurs(),
        loadBoutiquesDisponibles(), // ✅ Nouvelle fonction spécifique
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

      // ✅ CORRECTION : Filtrer selon le rôle actuel
      const filteredUsers = usersData.filter(user => {
        if (!user.profil) return true;
        if (currentUserRole === 'admin') return true;
        // Gérant ne voit pas les admins
        if (user.profil.role === 'admin') return false;
        // Gérant ne voit que ses utilisateurs
        if (currentUserRole === 'gerant') {
          // Logique de filtrage pour gérant
          return true; // La logique exacte dépend de votre backend
        }
        return true;
      });

      setUtilisateurs(filteredUsers);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
      setUtilisateurs([]);
    }
  };

  // ✅ NOUVEAU : Charger seulement les boutiques disponibles pour le gérant
  const loadBoutiquesDisponibles = async () => {
    try {
      // Si admin, toutes les boutiques
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
      // Si gérant, charger ses boutiques spécifiques
      else if (currentUserRole === 'gerant') {
        // Utiliser l'endpoint API pour les boutiques disponibles
        const response = await userAPI.disponibles();
        if (response.data && Array.isArray(response.data)) {
          setBoutiquesDisponibles(response.data);
        } else {
          // Fallback : charger toutes les boutiques et filtrer côté frontend
          const allResponse = await boutiqueAPI.list();
          let allBoutiques = [];

          if (allResponse.data && Array.isArray(allResponse.data)) {
            allBoutiques = allResponse.data;
          } else if (allResponse.data && allResponse.data.results) {
            allBoutiques = allResponse.data.results;
          }

          // Ici vous devriez filtrer les boutiques du gérant
          // Pour l'exemple, on prend les 2 premières
          setBoutiquesDisponibles(allBoutiques.slice(0, 2));
        }
      }
      // Autres rôles ne peuvent pas assigner de boutiques
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

    // ✅ Vérification du quota pour gérant
    if (currentUserRole === 'gerant') {
      if (!quota || quota.restant === 0 || quota.est_expire) {
        alert('❌ Quota insuffisant ou abonnement expiré. Veuillez vérifier votre abonnement.');
        return;
      }
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

    // ✅ CORRECTION : Vérification des boutiques seulement pour les rôles qui peuvent en assigner
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
      // ✅ STRUCTURE CORRECTE
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

      // SUCCÈS
      alert(`✅ Utilisateur ${formData.first_name} ${formData.last_name} créé avec succès`);

      setShowForm(false);
      resetForm();

      // Recharger les données
      await Promise.all([
        loadUtilisateurs(),
        loadQuota()
      ]);

    } catch (err) {
      console.error('❌ Erreur création:', err.response?.data || err.message);

      // Gestion d'erreurs détaillée
      if (err.response && err.response.data) {
        const errorData = err.response.data;

        if (errorData.detail) {
          alert(`❌ Erreur: ${errorData.detail}`);
        }
        else if (typeof errorData === 'object') {
          const errorMessages = [];
          const fieldErrors = {};

          for (const [field, messages] of Object.entries(errorData)) {
            if (Array.isArray(messages)) {
              const message = messages.join(', ');
              errorMessages.push(`${field}: ${message}`);
              fieldErrors[field] = message;
            } else {
              errorMessages.push(`${field}: ${messages}`);
              fieldErrors[field] = messages;
            }
          }

          if (errorMessages.length > 0) {
            alert(`❌ Erreurs:\n${errorMessages.join('\n')}`);
            setErrors(fieldErrors);
          }
        }
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

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // ✅ Calculer si le bouton "Nouvel Utilisateur" doit être désactivé
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

  // ✅ Obtenir les rôles disponibles selon l'utilisateur actuel
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
            title={!canCreateUser() ? "Vous ne pouvez pas créer d'utilisateurs" : ""}
          >
            <Plus size={18} /> Nouvel Utilisateur
          </button>
        </div>
      </header>

      <div className="content-wrapper">
        {/* ✅ AMÉLIORATION : Message d'information pour gérant */}
        {currentUserRole === 'gerant' && quota && (
          <div className="info-banner">
            <Info size={20} />
            <div>
              <strong>Plan {quota.plan}</strong> : Vous pouvez créer jusqu'à {quota.max_utilisateurs} utilisateurs.
              <br />
              <small>Places restantes : {quota.restant}</small>
            </div>
          </div>
        )}

        {/* CARTE QUOTA */}
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
            <div className="section-header">
              <h2>Membres ({utilisateurs.length})</h2>
              <button onClick={initializeData} className="btn-refresh">
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

      {/* MODAL FORMULAIRE */}
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
                      disabled={getAvailableRoles().length === 0}
                    >
                      {getAvailableRoles().map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Boutiques - seulement si des boutiques sont disponibles */}
              {boutiquesDisponibles.length > 0 && (
                <div className="form-group">
                  <label>Boutiques {['admin', 'gerant'].includes(currentUserRole) && '*'}</label>
                  {errors.boutiques && <span className="error-text">{errors.boutiques}</span>}
                  <div className="boutiques-grid">
                    {boutiquesDisponibles.map(boutique => (
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
                    ))}
                  </div>
                  {formData.boutiques.length > 0 && (
                    <p className="info-text">
                      {formData.boutiques.length} boutique(s) sélectionnée(s)
                    </p>
                  )}
                </div>
              )}

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
                  disabled={
                    (formData.boutiques.length === 0 && boutiquesDisponibles.length > 0) ||
                    (currentUserRole === 'gerant' && (!quota || quota.restant === 0))
                  }
                >
                  <CheckCircle size={18} /> Créer l'utilisateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ AJOUTER CES STYLES CSS */}
      <style jsx>{`
        .info-banner {
          background: #e0f2fe;
          border: 1px solid #7dd3fc;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          color: #0369a1;
          font-size: 0.9rem;
        }
        .info-banner svg {
          flex-shrink: 0;
          margin-top: 2px;
        }
        .info-banner small {
          color: #0c4a6e;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}