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
  register: (userData) => api.post('/users/', userData),
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    return Promise.resolve();
  },
  verifyToken: (token) => api.post('/token/verify/', { token }),
  refreshToken: (refresh) => api.post('/token/refresh/', { refresh }),
};

// === DASHBOARD (Stats Serveur) ===
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats/'),
};

// === PROFILS ===
export const profilAPI = {
  me: () => api.get('/profils/me/'),
  list: () => api.get('/profils/'),
};

// === UTILISATEURS ===
export const userAPI = {
  list: (config = {}) => api.get('/users/', config),
  get: (id) => api.get(`/users/${id}/`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.put(`/users/${id}/`, data),
  delete: (id) => api.delete(`/users/${id}/`),
  quota: () => api.get('/users/quota/'),
  debugInfo: () => api.get('/users/debug_info/'),
  disponibles: () => api.get('/users/disponibles/'),
};

// === BOUTIQUES ===
export const boutiqueAPI = {
  list: (config = {}) => api.get('/boutiques/', config),
  get: (id) => api.get(`/boutiques/${id}/`),
  create: (data) => api.post('/boutiques/', data),
  update: (id, data) => api.put(`/boutiques/${id}/`, data),
  delete: (id) => api.delete(`/boutiques/${id}/`),
  mesBoutiques: () => api.get('/boutiques/mes_boutiques/'),
};

// === PRODUITS ===
export const produitAPI = {
  list: (config = {}) => api.get('/produits/', config),
  get: (id) => api.get(`/produits/${id}/`),
  create: (data) => api.post('/produits/', data),
  update: (id, data) => api.put(`/produits/${id}/`, data),
  delete: (id) => api.delete(`/produits/${id}/`),
};

// === VENTES ===
export const venteAPI = {
  list: (config = {}) => api.get('/ventes/', config),
  get: (id) => api.get(`/ventes/${id}/`),
  create: (data) => api.post('/ventes/', data),
  update: (id, data) => api.put(`/ventes/${id}/`, data),
  delete: (id) => api.delete(`/ventes/${id}/`),
  sync: (ventes) => api.post('/sync-ventes/', { ventes }),

  // Statistiques de ventes
  stats: (params = {}) => api.get('/ventes/stats_benefices/', { params }),

  // Historique des ventes (pour compatibilité)
  historique: (params = {}) => api.get('/ventes/historique/', { params }),

  // Export des ventes
  exportVentes: (format = 'excel') =>
    api.get(`/exports/ventes/?format=${format}`, { responseType: 'blob' }),
};

// === HISTORIQUE VENTES (NOUVEAU) ===
export const historiqueAPI = {
  // Historique complet pour gérant/admin
  complet: (params = {}) => api.get('/historique-complet/', { params }),

  // Historique personnel pour vendeur/caissier
  personnel: (params = {}) => api.get('/historique-mes-ventes/', { params }),

  // Action d'historique complet
  historiqueComplet: (params = {}) => api.get('/historique-complet/historique_complet/', { params }),

  // Statistiques pour le dashboard historique (gérant)
  statsGerant: (params = {}) => api.get('/historique-complet/stats/', { params }),

  // Statistiques personnelles vendeur
  statsVendeur: () => api.get('/historique-mes-ventes/mes_stats/'),

  // Export historique
  export: (format = 'excel', params = {}) =>
    api.get(`/exports/historique/?format=${format}`, {
      params,
      responseType: 'blob'
    }),
};

// === CLIENTS ===
export const clientAPI = {
  list: (config = {}) => api.get('/clients/', config),
  get: (id) => api.get(`/clients/${id}/`),
  create: (data) => api.post('/clients/', data),
  update: (id, data) => api.put(`/clients/${id}/`, data),
  delete: (id) => api.delete(`/clients/${id}/`),
};

// === DÉPENSES ===
export const depenseAPI = {
  list: (config = {}) => api.get('/depenses/', config),
  get: (id) => api.get(`/depenses/${id}/`),
  create: (data) => api.post('/depenses/', data),
  update: (id, data) => api.put(`/depenses/${id}/`, data),
  delete: (id) => api.delete(`/depenses/${id}/`),
  statsWeekly: () => api.get('/depenses/stats_weekly/'),
  categories: () => api.get('/depenses/categories/'),
};

// === FOURNISSEURS ===
export const fournisseurAPI = {
  list: (config = {}) => api.get('/fournisseurs/', config),
  get: (id) => api.get(`/fournisseurs/${id}/`),
  create: (data) => api.post('/fournisseurs/', data),
  update: (id, data) => api.put(`/fournisseurs/${id}/`, data),
  delete: (id) => api.delete(`/fournisseurs/${id}/`),
};

// === ENTRÉES MARCHANDISE ===
export const entreeMarchandiseAPI = {
  list: () => api.get('/entrees-marchandise/'),
  get: (id) => api.get(`/entrees-marchandise/${id}/`),
  create: (data) => api.post('/entrees-marchandise/', data),
};

// === ABONNEMENTS ===
export const abonnementAPI = {
  current: () => api.get('/abonnements/current/'),
  list: () => api.get('/abonnements/'),
  stats: () => api.get('/abonnements/stats/'),
  renouveler: (id, data) => api.post(`/abonnements/${id}/renouveler/`, data),
};

// === DEMANDES DE PAIEMENT ===
export const demandePaiementAPI = {
  list: () => api.get('/demandes-paiement/'),
  create: (data) => api.post('/demandes-paiement/', data),
  confirmer: (id, data) => api.post(`/demandes-paiement/${id}/confirmer/`, data),
  whatsappLink: (params) => api.get('/demandes-paiement/whatsapp_link/', { params }),
};

// === RAPPORTS ===
export const reportAPI = {
  sales: (period = 'weekly') => api.get('/reports/sales/', { params: { period } }),
  dashboardStats: () => api.get('/dashboard/stats/'),
  beneficesStats: (params) => api.get('/stats/benefices/', { params }),
};

// === EXPORTS (Optimisé avec Axios) ===
export const exportAPI = {
  clients: (format = 'excel') =>
    api.get(`/exports/clients/?format=${format}`, { responseType: 'blob' }),

  ventes: (format = 'excel') =>
    api.get(`/exports/ventes/?format=${format}`, { responseType: 'blob' }),

  produits: (format = 'excel') =>
    api.get(`/exports/produits/?format=${format}`, { responseType: 'blob' }),

  depenses: (format = 'excel') =>
    api.get(`/exports/depenses/?format=${format}`, { responseType: 'blob' }),

  // Export historique spécifique
  historique: (format = 'excel', params = {}) =>
    api.get(`/exports/historique/?format=${format}`, {
      params,
      responseType: 'blob'
    }),

  // Utilitaire pour déclencher le téléchargement navigateur
  downloadBlob: (response, filename) => {
    // Axios met le contenu binaire dans response.data
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

// === UTILITAIRES DE DÉBOGAGE ===
export const debugAPI = {
  testPermissions: () => api.get('/test-permissions/'),
  debugBoutiques: () => api.get('/debug-boutiques/'),
  testAccesVendeur: () => api.get('/test-acces-vendeur/'),
  testVentes: () => api.get('/test-ventes/'),
  checkHistorique: () => api.get('/check-historique/'),
};

// === FONCTIONS UTILITAIRES ===
export const utils = {
  // Gestion des erreurs API
  handleApiError: (error, defaultMessage = "Une erreur est survenue") => {
    if (error.response) {
      const { data, status } = error.response;
      switch (status) {
        case 400:
          return data.detail || data.message || "Données invalides";
        case 401:
          return "Session expirée, veuillez vous reconnecter";
        case 403:
          return "Accès refusé. Vous n'avez pas les permissions nécessaires";
        case 404:
          return "Ressource non trouvée";
        case 500:
          return "Erreur serveur interne";
        default:
          return data.detail || defaultMessage;
      }
    } else if (error.request) {
      return "Pas de réponse du serveur. Vérifiez votre connexion internet.";
    } else {
      return error.message || defaultMessage;
    }
  },

  // Téléchargement de fichier
  downloadFile: (response, filename) => {
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Formatage des dates pour les requêtes
  formatDateForAPI: (date) => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return date.toISOString().split('T')[0];
  }
};

// === CONFIGURATION DEV ===
api.defaults.timeout = 30000;

if (import.meta.env.DEV) {
  api.interceptors.request.use(request => {
    console.log(`🚀 ${request.method?.toUpperCase()} ${request.url}`, request.params || '');
    return request;
  });

  api.interceptors.response.use(response => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  }, error => {
    console.error(`❌ ${error.response?.status || 'NETWORK'} ${error.config?.url}`, error.response?.data);
    return Promise.reject(error);
  });
}

export default api;