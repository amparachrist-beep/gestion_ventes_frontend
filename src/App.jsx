import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// 🔐 Pages d'authentification
import Login from './components/Login';
import Register from './components/Register';

// 📊 Pages principales
import Dashboard from './components/Dashboard';
import Produits from './components/Produits';
import Ventes from './components/Ventes';
import Clients from './components/Clients';
import Depenses from './components/Depenses';

// 🏪 Gestion boutique
import Boutique from './components/Boutique';
import Fournisseur from './components/Fournisseur';
import EntreeMarchandise from './components/EntreeMarchandise';

// 👥 Gestion utilisateurs & abonnements
import GestionUtilisateurs from './components/GestionUtilisateurs';
import Abonnement from './components/Abonnement';

// 📈 Rapports & Exports
import Rapports from './components/Rapports';
import Export from './components/Export';

// 📋 Historique
import HistoriqueVentes from './components/HistoriqueVentes';
import HistoriqueMesVentes from './components/HistoriqueMesVentes';
// 🔧 Utilitaires
import { isAuthenticated } from './auth';
import { initDB } from './db';
import { setupNetworkListeners, startAutoSync } from './offline_sync';

import './App.css';

/**
 * 🔒 Route protégée - Redirige vers /login si non authentifié
 */
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

/**
 * 🎯 Composant principal de l'application
 */
function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState(null);

  useEffect(() => {
    // ✅ Initialiser la base de données IndexedDB
    initDB();

    // ✅ Enregistrer le Service Worker pour le mode hors ligne
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('✅ Service Worker enregistré'))
        .catch(err => console.error('❌ Erreur Service Worker:', err));
    }

    // ✅ Écouter les changements de connexion
    setupNetworkListeners(
      () => {
        setIsOnline(true);
        console.log('🟢 Connexion rétablie');
      },
      () => {
        setIsOnline(false);
        console.log('🔴 Connexion perdue');
      }
    );

    // ✅ Démarrer la synchronisation automatique si authentifié
    if (isAuthenticated()) {
      startAutoSync(15, (progress) => {
        setSyncStatus(progress);
        if (progress.status === 'complete') {
          console.log(`✅ Sync: ${progress.synced_count} vente(s) synchronisée(s)`);
        }
      });
    }
  }, []);

  return (
    <Router>
      <div className="app">
        {/* 🌐 Indicateur de connexion */}
        <div className={`network-indicator ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}
          {syncStatus?.status === 'syncing' && (
            <span className="sync-progress">
              {' '} | 🔄 Sync... {syncStatus.current}/{syncStatus.total}
            </span>
          )}
        </div>

        <Routes>
          {/* 🔐 AUTHENTIFICATION */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* 📊 PAGES PRINCIPALES */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard isOnline={isOnline} syncStatus={syncStatus} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/produits"
            element={
              <ProtectedRoute>
                <Produits isOnline={isOnline} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ventes"
            element={
              <ProtectedRoute>
                <Ventes isOnline={isOnline} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <Clients isOnline={isOnline} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/depenses"
            element={
              <ProtectedRoute>
                <Depenses isOnline={isOnline} />
              </ProtectedRoute>
            }
          />

          {/* 🏪 GESTION BOUTIQUE */}
          <Route
            path="/boutiques"
            element={
              <ProtectedRoute>
                <Boutique isOnline={isOnline} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/fournisseurs"
            element={
              <ProtectedRoute>
                <Fournisseur isOnline={isOnline} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/entrees-marchandise"
            element={
              <ProtectedRoute>
                <EntreeMarchandise isOnline={isOnline} />
              </ProtectedRoute>
            }
          />

          {/* 👥 GESTION UTILISATEURS & ABONNEMENTS */}
          <Route
            path="/utilisateurs"
            element={
              <ProtectedRoute>
                <GestionUtilisateurs isOnline={isOnline} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/abonnement"
            element={
              <ProtectedRoute>
                <Abonnement isOnline={isOnline} />
              </ProtectedRoute>
            }
          />

          {/* 📈 RAPPORTS & EXPORTS */}
          <Route
            path="/rapports"
            element={
              <ProtectedRoute>
                <Rapports isOnline={isOnline} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/export"
            element={
              <ProtectedRoute>
                <Export isOnline={isOnline} />
              </ProtectedRoute>
            }
          />

          {/* 📋 HISTORIQUE */}
          <Route
            path="/historique-ventes"
            element={
              <ProtectedRoute>
                <HistoriqueVentes isOnline={isOnline} />
              </ProtectedRoute>
            }
          />
          <Route
              path="/historique-mes-ventes"
              element={
                <ProtectedRoute>
                  <HistoriqueMesVentes isOnline={isOnline} />
                </ProtectedRoute>
              }
          />

          {/* 🏠 REDIRECTION PAR DÉFAUT */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;