// src/db.js
import { openDB } from 'idb';

const DB_NAME = 'sales-management-db';
const DB_VERSION = 4;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // === STORES PRODUITS & CLIENTS ===
      if (!db.objectStoreNames.contains('produits')) {
        const store = db.createObjectStore('produits', { keyPath: 'id' });
        store.createIndex('nom', 'nom');
      }

      if (!db.objectStoreNames.contains('clients')) {
        const store = db.createObjectStore('clients', { keyPath: 'id' });
      }

      // === STORES VENTES ===
      if (!db.objectStoreNames.contains('ventes_synced')) {
        const store = db.createObjectStore('ventes_synced', { keyPath: 'id' });
        store.createIndex('date_heure', 'date_heure');
        store.createIndex('utilisateur', 'utilisateur');
      }

      // Nettoyage ancien store
      if (db.objectStoreNames.contains('ventes_offline')) {
        db.deleteObjectStore('ventes_offline');
      }

      if (!db.objectStoreNames.contains('ventes_pending')) {
        const store = db.createObjectStore('ventes_pending', { keyPath: 'offline_id' });
        store.createIndex('date_heure', 'date_heure');
      }

      // === STORES DÉPENSES ===
      if (!db.objectStoreNames.contains('depenses')) {
        db.createObjectStore('depenses', { keyPath: 'id' });
      }

      // Store pour les dépenses en attente
      if (!db.objectStoreNames.contains('depenses_pending')) {
        const store = db.createObjectStore('depenses_pending', { keyPath: 'offline_id' });
        store.createIndex('date', 'date');
      }

      // Nettoyage ancien store
      if (db.objectStoreNames.contains('depenses_offline')) {
        db.deleteObjectStore('depenses_offline');
      }

      // === METADATA ===
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
  });
};

// ================= PRODUITS =================

export const saveProduits = async (produits) => {
  const db = await initDB();
  const tx = db.transaction('produits', 'readwrite');
  await Promise.all(produits.map(p => tx.store.put(p)));
  await tx.done;
};

export const getProduits = async () => {
  const db = await initDB();
  return db.getAll('produits');
};

export const updateProduitStock = async (id, nouvelleQuantite) => {
  const db = await initDB();
  const tx = db.transaction('produits', 'readwrite');
  const produit = await tx.store.get(id);
  if (produit) {
    produit.quantite = nouvelleQuantite;
    produit.vendu = nouvelleQuantite <= 0;
    await tx.store.put(produit);
  }
  await tx.done;
  return produit;
};

// ================= VENTES (Logique Unifiée) =================

export const saveVentesSynced = async (ventes) => {
  const db = await initDB();
  const tx = db.transaction('ventes_synced', 'readwrite');
  await Promise.all(ventes.map(v => tx.store.put(v)));
  await tx.done;
};

export const saveVenteOffline = async (vente) => {
  const db = await initDB();
  const venteToSave = {
    ...vente,
    sync_status: 'PENDING'
  };
  await db.put('ventes_pending', venteToSave);
  return venteToSave;
};

export const getVentesPending = async () => {
  const db = await initDB();
  return db.getAll('ventes_pending');
};

export const deleteVenteOffline = async (offline_id) => {
  const db = await initDB();
  await db.delete('ventes_pending', offline_id);
};

export const getDashboardUnifiedStats = async (userId = null) => {
  const db = await initDB();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const ventesSynced = await db.getAll('ventes_synced');
  const ventesPending = await db.getAll('ventes_pending');

  // ✅ CORRECTION ANTI-DOUBLON
  // 1. Créer un Set des offline_id qui sont DÉJÀ dans les ventes synchronisées
  const syncedOfflineIds = new Set(
    ventesSynced
      .map(v => v.offline_id)
      .filter(id => id) // On ne garde que ceux qui ont un ID offline
  );

  // 2. Ne garder dans 'pending' que celles qui ne sont PAS dans 'synced'
  const uniquePending = ventesPending.filter(v => !syncedOfflineIds.has(v.offline_id));

  // 3. Fusionner
  const allVentes = [...ventesSynced, ...uniquePending];

  const filteredVentes = allVentes.filter(v => {
    const dateVente = new Date(v.date_heure || v.date_vente || v.created_at);
    if (dateVente < sevenDaysAgo) return false;
    if (userId && String(v.utilisateur) !== String(userId)) return false;
    return true;
  });

  const totalMontant = filteredVentes.reduce((sum, v) => sum + (parseFloat(v.montant_total) || 0), 0);

  return {
    nombre_ventes: filteredVentes.length,
    total_montant: totalMontant,
    ventes_pending_count: uniquePending.length, // On utilise uniquePending ici aussi
    last_sync: await getLastSyncTime()
  };
};

export const getVentesLocales7Jours = async () => {
  return [];
};

// ================= CLIENTS =================

export const saveClients = async (clients) => {
  const db = await initDB();
  const tx = db.transaction('clients', 'readwrite');
  await Promise.all(clients.map(c => tx.store.put(c)));
  await tx.done;
};

export const getClients = async () => {
  const db = await initDB();
  return db.getAll('clients');
};

export const saveClientOffline = async (client) => {
  const db = await initDB();
  const clientWithId = {
    ...client,
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
    sync_status: 'PENDING'
  };
  const tx = db.transaction('clients', 'readwrite');
  await tx.store.put(clientWithId);
  await tx.done;
  return clientWithId;
};

// ================= DÉPENSES (CRUD Complet) =================

// 1. Sauvegarder le cache serveur
export const saveDepenses = async (depenses) => {
  const db = await initDB();
  const tx = db.transaction('depenses', 'readwrite');
  await Promise.all(depenses.map(d => tx.store.put(d)));
  await tx.done;
};

// 2. Récupérer toutes les dépenses (Cache + Local)
export const getDepenses = async () => {
  const db = await initDB();
  const synced = await db.getAll('depenses');
  const pending = await db.getAll('depenses_pending');
  return [...pending, ...synced]; // Pending d'abord
};

// 3. Sauvegarder une dépense locale
export const saveDepenseOffline = async (depense) => {
  const db = await initDB();
  const depenseToSave = {
    ...depense,
    offline_id: `offline_dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sync_status: 'PENDING',
    date: depense.date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };
  await db.put('depenses_pending', depenseToSave);
  return depenseToSave;
};

// 4. Récupérer les dépenses en attente (pour la sync)
export const getDepensesPending = async () => {
  const db = await initDB();
  return db.getAll('depenses_pending');
};

// 5. Supprimer une dépense locale (après sync)
export const deleteDepenseOffline = async (offline_id) => {
  const db = await initDB();
  await db.delete('depenses_pending', offline_id);
};

// 6. Stats des dépenses (Cache + Local)
export const getDepensesStats = async () => {
  const db = await initDB();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let allDepenses = [];
  try {
    const synced = await db.getAll('depenses');
    const pending = await db.getAll('depenses_pending');
    allDepenses = [...synced, ...pending];
  } catch (e) {}

  const recent = allDepenses.filter(d => {
    const dateStr = d.date || d.created_at;
    return dateStr && new Date(dateStr) >= sevenDaysAgo;
  });

  const total = recent.reduce((sum, d) => sum + (parseFloat(d.montant) || 0), 0);

  return { count: recent.length, total };
};

// ================= METADATA & UTILS =================

export const saveMetadata = async (key, value) => {
  const db = await initDB();
  await db.put('metadata', { key, value });
};

export const getLastSyncTime = async () => {
  const db = await initDB();
  const res = await db.get('metadata', 'last_sync_time');
  return res?.value;
};

export const setLastSyncTime = async (time) => {
  return await saveMetadata('last_sync_time', time);
};

export const getDBStats = async () => {
  try {
    const db = await initDB();
    return {
      produits: await db.count('produits'),
      ventes_pending: await db.count('ventes_pending'),
      clients: await db.count('clients'),
      last_sync: await getLastSyncTime(),
    };
  } catch (error) {
    return {};
  }
};