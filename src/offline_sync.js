// src/offline_sync.js
import { venteAPI, produitAPI, clientAPI } from './api';
import {
  getVentesPending,
  deleteVenteOffline,
  saveProduits,
  saveClients,
  setLastSyncTime,
  getLastSyncTime
} from './db';

export const isOnline = () => {
  return navigator.onLine;
};

// ==========================================
// ✅ FONCTION DE SYNCHRONISATION CORRIGÉE
// ==========================================
export const syncVentes = async (onProgress) => {
  if (!isOnline()) {
    return {
      success: false,
      error: 'Pas de connexion Internet',
      synced_count: 0,
      failed_count: 0
    };
  }

  try {
    // 1. Récupération des ventes locales
    const ventesPending = await getVentesPending();

    if (ventesPending.length === 0) {
      if (onProgress) onProgress({ status: 'complete', synced_count: 0 });
      return { success: true, synced_count: 0, message: 'Rien à synchroniser' };
    }

    // 2. Filtrage des données corrompues
    const ventesValides = ventesPending.filter(vente => {
      // On accepte produit_id OU produit (compatibilité)
      const hasProduit = vente.produit_id || vente.produit;
      const hasBoutique = vente.boutique_id || vente.boutique;

      if (!hasProduit || !hasBoutique) {
        console.warn('⚠️ Vente corrompue supprimée:', vente);
        deleteVenteOffline(vente.offline_id);
        return false;
      }
      return true;
    });

    if (ventesValides.length === 0) {
      return { success: true, message: 'Nettoyage effectué' };
    }

    if (onProgress) onProgress({ status: 'syncing', total: ventesValides.length });

    // ✅ CORRECTION MAJEURE : Mapping des données pour l'API
    // L'API attend souvent 'produit' et 'boutique', pas 'produit_id'
    const payload = ventesValides.map(v => ({
      ...v,
      produit: v.produit_id || v.produit,   // S'assure d'envoyer 'produit'
      boutique: v.boutique_id || v.boutique, // S'assure d'envoyer 'boutique'
      client: v.client_id || v.client        // S'assure d'envoyer 'client'
    }));

    // 3. Envoi au serveur
    console.log("📤 Envoi du lot :", payload);
    const response = await venteAPI.sync(payload);
    const { synced_count, failed_count, errors } = response.data;

    console.log(`✅ Résultat : ${synced_count} OK, ${failed_count} Échecs`);

    // 4. Suppression locale des succès
    if (synced_count > 0) {
      // On supprime TOUT ce qu'on a tenté d'envoyer si le serveur a répondu
      // (Cela évite les boucles infinies sur les doublons)
      const deletePromises = ventesValides.map(v => deleteVenteOffline(v.offline_id));
      await Promise.all(deletePromises);
    }

    await setLastSyncTime(new Date().toISOString());

    if (onProgress) {
      onProgress({ status: 'complete', synced_count, failed_count });
    }

    // On considère succès si le serveur a répondu, même s'il y a des rejets (pour ne pas bloquer l'UI)
    return {
      success: true,
      synced_count,
      failed_count,
      errors: errors || []
    };

  } catch (error) {
    console.error('❌ Erreur syncVentes:', error);
    if (onProgress) onProgress({ status: 'error', error: error.message });
    return { success: false, error: error.message };
  }
};

export const syncFromServer = async (onProgress) => {
  if (!isOnline()) return { success: false };

  try {
    if (onProgress) onProgress({ status: 'downloading', item: 'données' });

    const [produitsRes, clientsRes] = await Promise.all([
        produitAPI.list(),
        clientAPI.list()
    ]);

    const produits = produitsRes.data.results || produitsRes.data || [];
    const clients = clientsRes.data.results || clientsRes.data || [];

    await saveProduits(produits);
    await saveClients(clients);
    await setLastSyncTime(new Date().toISOString());

    return { success: true };
  } catch (error) {
    console.error('❌ Erreur syncFromServer:', error);
    return { success: false, error: error.message };
  }
};

export const syncFull = async (onProgress) => {
  const upResult = await syncVentes(onProgress);
  const downResult = await syncFromServer(onProgress);
  return {
    success: upResult.success && downResult.success,
    up: upResult,
    down: downResult
  };
};

let autoSyncInterval = null;

export const startAutoSync = (intervalMinutes = 15, onProgress) => {
  stopAutoSync();
  autoSyncInterval = setInterval(async () => {
    if (isOnline()) {
      console.log('🔄 Auto-sync périodique...');
      await syncVentes(onProgress);
    }
  }, intervalMinutes * 60 * 1000);
};

export const stopAutoSync = () => {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
};

export const setupNetworkListeners = (onOnline, onOffline) => {
  window.addEventListener('online', () => {
    console.log('✅ Connexion rétablie');
    if (onOnline) onOnline();
    syncVentes().catch(console.error);
  });

  window.addEventListener('offline', () => {
    console.log('❌ Connexion perdue');
    if (onOffline) onOffline();
  });
};

export const registerBackgroundSync = async () => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-ventes');
      console.log('Background sync enregistré');
    } catch (error) {
      console.warn('Background sync non supporté:', error);
    }
  }
};

export const setupServiceWorkerMessages = (onSyncRequest) => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SYNC_REQUESTED') {
        console.log('Sync demandée par le service worker');
        if (onSyncRequest) onSyncRequest();
      }
    });
  }
};