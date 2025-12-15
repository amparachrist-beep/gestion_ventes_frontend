// hooks/useHistoriqueVentes.js
import { useState, useEffect } from 'react';
import { historiqueAPI } from '../api';

export function useHistoriqueVentes(userRole, userId) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let response;
        let statsResponse;

        if (userRole === 'gerant' || userRole === 'admin') {
          // Gérant/Admin: historique complet
          response = await historiqueAPI.complet();
          statsResponse = await historiqueAPI.statsGerant();
        } else if (userRole === 'vendeur' || userRole === 'caissier') {
          // Vendeur/Caissier: historique personnel
          response = await historiqueAPI.personnel();
          statsResponse = await historiqueAPI.statsVendeur();
        } else {
          // Autres rôles: pas d'accès
          setData([]);
          setStats(null);
          return;
        }

        setData(response.data.results || response.data || []);
        setStats(statsResponse.data);
      } catch (error) {
        console.error('Erreur chargement historique:', error);
        setData([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    if (userRole) {
      loadData();
    }
  }, [userRole, userId]);

  return {
    data,
    loading,
    stats,
    refetch: () => {
      // Logique de rechargement
    }
  };
}