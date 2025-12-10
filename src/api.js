import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Instance avec intercepteur
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// --- INTERCEPTEUR REQUEST (Ajout du Token) ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- INTERCEPTEUR RESPONSE (Gestion Refresh Token & Erreurs) ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si erreur 401 (Non autorisé) et qu'on n'a pas déjà essayé de rafraîchir
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        // Appel direct axios pour éviter la boucle infinie de l'intercepteur
        const res = await axios.post(`${API_BASE_URL}/token/refresh/`, { refresh: refreshToken });

        const { access } = res.data;
        localStorage.setItem('access_token', access);

        // Mise à jour du header pour la requête qui a échoué
        originalRequest.headers.Authorization = `Bearer ${access}`;

        // On relance la requête initiale
        return api(originalRequest);
      } catch (e) {
        console.error('Session expirée, reconnexion requise:', e);
        // Nettoyage complet
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================
// 📡 DÉFINITION DES ENDPOINTS
// ============================================================

// === AUTHENTIFICATION ===
export const authAPI = {
  login: (credentials) => api.post('/token/', credentials),
  register: (userData) => api.post('/register/', userData), // ✅ CORRIGÉ: endpoint spécifique
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    return Promise.resolve();
  },
  verifyToken: (token) => api.post('/token/verify/', { token }),
  refreshToken: (refresh) => api.post('/token/refresh/', { refresh }),
  changePassword: (data) => api.post('/change-password/', data),
};

// === DASHBOARD (Stats Serveur) ===
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats/'),
  getWeeklyStats: () => api.get('/dashboard/stats/weekly/'),
  getMonthlyStats: () => api.get('/dashboard/stats/monthly/'),
};

// === PROFILS ===
export const profilAPI = {
  me: () => api.get('/profils/me/'),
  list: () => api.get('/profils/'),
  update: (id, data) => api.put(`/profils/${id}/`, data),
  updateMe: (data) => api.put('/profils/me/', data),
};

// === UTILISATEURS (COMPLET POUR GÉRANT) ===
export const userAPI = {
  // ✅ ENDPOINTS STANDARDS
  list: (config = {}) => api.get('/users/', config),
  get: (id) => api.get(`/users/${id}/`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.put(`/users/${id}/`, data),
  delete: (id) => api.delete(`/users/${id}/`),

  // ✅ ENDPOINTS SPÉCIFIQUES POUR GESTION GÉRANT
  quota: () => api.get('/users/quota/'),
  me: () => api.get('/users/me/'), // ✅ AJOUTÉ: Endpoint spécifique
  updateProfil: (id, data) => api.put(`/users/${id}/update_profil/`, data), // ✅ AJOUTÉ: Mise à jour profil
  disponibles: () => api.get('/users/disponibles/'), // ✅ AJOUTÉ: Boutiques disponibles

  // ✅ ENDPOINTS POUR GESTION DES ÉQUIPES
  listEquipe: () => api.get('/users/equipe/'),
  search: (query) => api.get('/users/search/', { params: { q: query } }),

  // ✅ UTILITAIRES
  toggleStatus: (id) => api.post(`/users/${id}/toggle_status/`),
  resetPassword: (id) => api.post(`/users/${id}/reset_password/`),
};

// === BOUTIQUES ===
export const boutiqueAPI = {
  list: (config = {}) => api.get('/boutiques/', config),
  get: (id) => api.get(`/boutiques/${id}/`),
  create: (data) => api.post('/boutiques/', data),
  update: (id, data) => api.put(`/boutiques/${id}/`, data),
  delete: (id) => api.delete(`/boutiques/${id}/`),
  mesBoutiques: () => api.get('/boutiques/mes_boutiques/'),

  // ✅ ENDPOINTS POUR GESTION DES EMPLOYÉS
  employes: (id) => api.get(`/boutiques/${id}/employes/`),
  addEmploye: (id, employeId) => api.post(`/boutiques/${id}/add_employe/`, { employe_id: employeId }),
  removeEmploye: (id, employeId) => api.post(`/boutiques/${id}/remove_employe/`, { employe_id: employeId }),

  // ✅ STATISTIQUES
  stats: (id) => api.get(`/boutiques/${id}/stats/`),
};

// === PRODUITS ===
export const produitAPI = {
  list: (config = {}) => api.get('/produits/', config),
  get: (id) => api.get(`/produits/${id}/`),
  create: (data) => api.post('/produits/', data),
  update: (id, data) => api.put(`/produits/${id}/`, data),
  delete: (id) => api.delete(`/produits/${id}/`),

  // ✅ ENDPOINTS SPÉCIFIQUES
  search: (query) => api.get('/produits/search/', { params: { q: query } }),
  lowStock: () => api.get('/produits/low_stock/'),
  categories: () => api.get('/produits/categories/'),
  import: (data) => api.post('/produits/import/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// === VENTES ===
export const venteAPI = {
  list: (config = {}) => api.get('/ventes/', config),
  get: (id) => api.get(`/ventes/${id}/`),
  create: (data) => api.post('/ventes/', data),
  sync: (ventes) => api.post('/sync-ventes/', { ventes }),

  // ✅ ENDPOINTS SPÉCIFIQUES
  today: () => api.get('/ventes/today/'),
  byDate: (date) => api.get('/ventes/by_date/', { params: { date } }),
  annuler: (id) => api.post(`/ventes/${id}/annuler/`),
  ticket: (id) => api.get(`/ventes/${id}/ticket/`, { responseType: 'blob' }),

  // ✅ RAPPORTS
  rapportJournalier: (date) => api.get('/ventes/rapport/journalier/', { params: { date } }),
  rapportHebdomadaire: () => api.get('/ventes/rapport/hebdomadaire/'),
  rapportMensuel: (month, year) => api.get('/ventes/rapport/mensuel/', {
    params: { month, year }
  }),
};

// === CLIENTS ===
export const clientAPI = {
  list: (config = {}) => api.get('/clients/', config),
  get: (id) => api.get(`/clients/${id}/`),
  create: (data) => api.post('/clients/', data),
  update: (id, data) => api.put(`/clients/${id}/`, data),
  delete: (id) => api.delete(`/clients/${id}/`),

  // ✅ ENDPOINTS SPÉCIFIQUES
  search: (query) => api.get('/clients/search/', { params: { q: query } }),
  historique: (id) => api.get(`/clients/${id}/historique/`),
  fideles: () => api.get('/clients/fideles/'),
};

// === DÉPENSES ===
export const depenseAPI = {
  list: (config = {}) => api.get('/depenses/', config),
  get: (id) => api.get(`/depenses/${id}/`),
  create: (data) => api.post('/depenses/', data),
  update: (id, data) => api.put(`/depenses/${id}/`, data),
  delete: (id) => api.delete(`/depenses/${id}/`),

  // ✅ ENDPOINTS SPÉCIFIQUES
  statsWeekly: () => api.get('/depenses/stats_weekly/'),
  statsMonthly: () => api.get('/depenses/stats_monthly/'),
  categories: () => api.get('/depenses/categories/'),
  byCategory: (category) => api.get('/depenses/by_category/', { params: { category } }),
};

// === FOURNISSEURS ===
export const fournisseurAPI = {
  list: (config = {}) => api.get('/fournisseurs/', config),
  get: (id) => api.get(`/fournisseurs/${id}/`),
  create: (data) => api.post('/fournisseurs/', data),
  update: (id, data) => api.put(`/fournisseurs/${id}/`, data),
  delete: (id) => api.delete(`/fournisseurs/${id}/`),

  // ✅ ENDPOINTS SPÉCIFIQUES
  search: (query) => api.get('/fournisseurs/search/', { params: { q: query } }),
  produits: (id) => api.get(`/fournisseurs/${id}/produits/`),
};

// === ENTRÉES MARCHANDISE ===
export const entreeMarchandiseAPI = {
  list: (config = {}) => api.get('/entrees-marchandise/', config),
  get: (id) => api.get(`/entrees-marchandise/${id}/`),
  create: (data) => api.post('/entrees-marchandise/', data),
  update: (id, data) => api.put(`/entrees-marchandise/${id}/`, data),
  delete: (id) => api.delete(`/entrees-marchandise/${id}/`),

  // ✅ ENDPOINTS SPÉCIFIQUES
  byProduit: (produitId) => api.get('/entrees-marchandise/by_produit/', {
    params: { produit_id: produitId }
  }),
  byFournisseur: (fournisseurId) => api.get('/entrees-marchandise/by_fournisseur/', {
    params: { fournisseur_id: fournisseurId }
  }),
};

// === ABONNEMENTS ===
export const abonnementAPI = {
  current: () => api.get('/abonnements/current/'),
  list: () => api.get('/abonnements/'),
  get: (id) => api.get(`/abonnements/${id}/`),

  // ✅ ENDPOINTS SPÉCIFIQUES
  renew: (id) => api.post(`/abonnements/${id}/renouveler/`),
  upgrade: (id, plan) => api.post(`/abonnements/${id}/upgrade/`, { plan }),
  stats: () => api.get('/abonnements/stats/'),
  history: () => api.get('/abonnements/history/'),
};

// === DEMANDES DE PAIEMENT ===
export const demandePaiementAPI = {
  list: () => api.get('/demandes-paiement/'),
  create: (data) => api.post('/demandes-paiement/', data),
  confirmer: (id, data) => api.post(`/demandes-paiement/${id}/confirmer/`, data),
  whatsappLink: (params) => api.get('/demandes-paiement/whatsapp_link/', { params }),

  // ✅ ENDPOINTS SPÉCIFIQUES
  get: (id) => api.get(`/demandes-paiement/${id}/`),
  cancel: (id) => api.post(`/demandes-paiement/${id}/annuler/`),
  stats: () => api.get('/demandes-paiement/stats/'),
};

// === RAPPORTS ===
export const reportAPI = {
  sales: (period = 'weekly') => api.get('/reports/sales/', { params: { period } }),
  dashboardStats: () => api.get('/dashboard/stats/'),
  beneficesStats: (params) => api.get('/stats/benefices/', { params }),

  // ✅ ENDPOINTS COMPLÉMENTAIRES
  inventory: () => api.get('/reports/inventory/'),
  financial: (startDate, endDate) => api.get('/reports/financial/', {
    params: { start_date: startDate, end_date: endDate }
  }),
  performance: () => api.get('/reports/performance/'),
};

// === NOTIFICATIONS ===
export const notificationAPI = {
  list: () => api.get('/notifications/'),
  unread: () => api.get('/notifications/unread/'),
  markAsRead: (id) => api.post(`/notifications/${id}/mark_as_read/`),
  markAllAsRead: () => api.post('/notifications/mark_all_as_read/'),
  count: () => api.get('/notifications/count/'),
};

// === EXPORTS ===
export const exportAPI = {
  // Export fichiers
  clients: (format = 'excel') =>
    api.get(`/exports/clients/?format=${format}`, { responseType: 'blob' }),

  ventes: (format = 'excel') =>
    api.get(`/exports/ventes/?format=${format}`, { responseType: 'blob' }),

  produits: (format = 'excel') =>
    api.get(`/exports/produits/?format=${format}`, { responseType: 'blob' }),

  depenses: (format = 'excel') =>
    api.get(`/exports/depenses/?format=${format}`, { responseType: 'blob' }),

  utilisateurs: (format = 'excel') => // ✅ AJOUTÉ: Export utilisateurs
    api.get(`/exports/utilisateurs/?format=${format}`, { responseType: 'blob' }),

  stock: (format = 'excel') => // ✅ AJOUTÉ: Export stock
    api.get(`/exports/stock/?format=${format}`, { responseType: 'blob' }),

  // Utilitaire pour déclencher le téléchargement navigateur
  downloadBlob: (response, filename) => {
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

// === UTILITAIRES GÉNÉRAUX ===
export const utilsAPI = {
  checkConnection: () => api.get('/health/'),
  getConfig: () => api.get('/config/'),
  backup: () => api.get('/backup/'),
  restore: (data) => api.post('/restore/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// === CONFIGURATION ET OPTIMISATION ===
api.defaults.timeout = 30000;
api.defaults.withCredentials = true;

// Cache config pour les requêtes GET (optionnel)
const cache = new Map();
api.interceptors.request.use(config => {
  if (config.method === 'get') {
    const cacheKey = `${config.url}${JSON.stringify(config.params || {})}`;
    if (cache.has(cacheKey)) {
      config.adapter = () => Promise.resolve(cache.get(cacheKey));
    }
  }
  return config;
});

api.interceptors.response.use(response => {
  if (response.config.method === 'get') {
    const cacheKey = `${response.config.url}${JSON.stringify(response.config.params || {})}`;
    cache.set(cacheKey, response);
    // Cache pour 5 minutes
    setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000);
  }
  return response;
});

// === LOGGING EN DÉVELOPPEMENT ===
if (import.meta.env.DEV) {
  api.interceptors.request.use(request => {
    console.log(`🚀 ${request.method?.toUpperCase()} ${request.url}`, {
      params: request.params,
      data: request.data,
      headers: request.headers
    });
    return request;
  });

  api.interceptors.response.use(response => {
    console.log(`✅ ${response.status} ${response.config.url}`, {
      data: response.data,
      headers: response.headers
    });
    return response;
  }, error => {
    console.error(`❌ ${error.response?.status || 'NETWORK'} ${error.config?.url}`, {
      data: error.response?.data,
      config: error.config
    });
    return Promise.reject(error);
  });
}

// === UTILITAIRES POUR LE FRONTEND ===
export const apiUtils = {
  // Gestion des erreurs
  handleError: (error) => {
    if (error.response) {
      // Erreur serveur
      return {
        status: error.response.status,
        data: error.response.data,
        message: error.response.data?.detail || 'Une erreur est survenue'
      };
    } else if (error.request) {
      // Pas de réponse
      return {
        status: 0,
        data: null,
        message: 'Pas de réponse du serveur. Vérifiez votre connexion.'
      };
    } else {
      // Erreur de configuration
      return {
        status: -1,
        data: null,
        message: error.message || 'Erreur de configuration'
      };
    }
  },

  // Validation des données
  validateUserData: (data) => {
    const errors = {};

    if (!data.username?.trim()) {
      errors.username = 'Nom d\'utilisateur requis';
    }

    if (!data.email?.trim()) {
      errors.email = 'Email requis';
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
      errors.email = 'Email invalide';
    }

    if (!data.password && data.id === undefined) {
      errors.password = 'Mot de passe requis';
    } else if (data.password && data.password.length < 8) {
      errors.password = 'Minimum 8 caractères';
    }

    if (!data.first_name?.trim()) {
      errors.first_name = 'Prénom requis';
    }

    if (!data.last_name?.trim()) {
      errors.last_name = 'Nom requis';
    }

    if (data.telephone && !/^[\d\s+\-()]{8,20}$/.test(data.telephone)) {
      errors.telephone = 'Numéro de téléphone invalide';
    }

    return Object.keys(errors).length > 0 ? errors : null;
  },

  // Formatage des données utilisateur pour l'API
  formatUserForAPI: (userData) => {
    const formatted = { ...userData };

    // Nettoyer les espaces
    if (formatted.username) formatted.username = formatted.username.trim();
    if (formatted.email) formatted.email = formatted.email.trim();
    if (formatted.first_name) formatted.first_name = formatted.first_name.trim();
    if (formatted.last_name) formatted.last_name = formatted.last_name.trim();
    if (formatted.telephone) formatted.telephone = formatted.telephone.trim();

    // Convertir les IDs de boutiques en nombres si nécessaire
    if (formatted.boutiques && Array.isArray(formatted.boutiques)) {
      formatted.boutiques = formatted.boutiques.map(id =>
        typeof id === 'string' ? parseInt(id, 10) : id
      ).filter(id => !isNaN(id));
    }

    return formatted;
  },

  // Gestion du token
  setToken: (access, refresh) => {
    localStorage.setItem('access_token', access);
    if (refresh) {
      localStorage.setItem('refresh_token', refresh);
    }
  },

  clearToken: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  // Vérifier si l'utilisateur est connecté
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },

  // Récupérer l'utilisateur depuis le localStorage
  getCurrentUser: () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Erreur parsing user:', error);
      return null;
    }
  },

  // Sauvegarder l'utilisateur dans le localStorage
  setCurrentUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

export default api;