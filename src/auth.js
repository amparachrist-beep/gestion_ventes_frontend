// auth.js
import { authAPI } from './api';

// 🔑 Connexion
export const login = async (username, password) => {
  try {
    // CORRIGÉ: Passer un objet credentials avec username et password
    const credentials = { username, password };
    const response = await authAPI.login(credentials);
    const { access, refresh } = response.data;

    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);

    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || 'Erreur de connexion'
    };
  }
};

// 📝 Inscription
export const register = async (userData) => {
  try {
    const response = await authAPI.register(userData);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || "Erreur d'inscription"
    };
  }
};

// 🚪 Déconnexion
export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// ✅ Vérifie si l'utilisateur est connecté
export const isAuthenticated = () => {
  const token = localStorage.getItem('access_token');
  return !!token;
};

// 🔐 Récupère le token d'accès
export const getAccessToken = () => {
  return localStorage.getItem('access_token');
};

// 🔄 Récupère le token de rafraîchissement
export const getRefreshToken = () => {
  return localStorage.getItem('refresh_token');
};

// ⏰ Vérifie l'expiration du token
export const checkTokenExpiration = () => {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convertir en millisecondes
    return Date.now() < exp;
  } catch (e) {
    return false;
  }
};