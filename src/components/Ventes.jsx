import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { venteAPI, boutiqueAPI, produitAPI, clientAPI, profilAPI } from '../api';
import {
  getProduits,
  getClients,
  saveVenteOffline,
  updateProduitStock,
  saveProduits,
  saveClients
} from '../db';
import { syncVentes } from '../offline_sync';
import { useScanDetection } from '../hooks/useScanDetection';
import {
  ArrowLeft, Home, ShoppingCart, Package, Scan,
  CheckCircle, AlertCircle, Info, Loader
} from 'lucide-react';

export default function Ventes({ isOnline }) {
  const [produits, setProduits] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedProduit, setSelectedProduit] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [profil, setProfil] = useState(null);
  const [barcode, setBarcode] = useState('');

  const playBeep = () => {
    const audio = new Audio('/beep.mp3');
    audio.play().catch(e => console.log("Audio play failed", e));
  };

  useScanDetection({
    onScan: (scannedBarcode) => {
      console.log("📸 Code scanné :", scannedBarcode);
      setBarcode(scannedBarcode);

      const produitTrouve = produits.find(p => p.code_barre === scannedBarcode);

      if (produitTrouve) {
        playBeep();
        if (parseInt(selectedProduit) === produitTrouve.id) {
           setQuantite(prev => parseInt(prev) + 1);
           showMessage(`➕ Quantité augmentée pour ${produitTrouve.nom}`, 'success');
        } else {
           setSelectedProduit(produitTrouve.id);
           setQuantite(1);
           showMessage(`✅ Produit scanné : ${produitTrouve.nom}`, 'success');
        }
      } else {
        showMessage(`❌ Produit non trouvé pour le code : ${scannedBarcode}`, 'error');
      }
    }
  });

  useEffect(() => {
    if (barcode.trim() === '') return;
    const produitTrouve = produits.find(p => p.code_barre === barcode);
    if (produitTrouve) {
      if (parseInt(selectedProduit) !== produitTrouve.id) {
        setSelectedProduit(produitTrouve.id);
        setQuantite(1);
      }
    }
  }, [barcode]);

  useEffect(() => {
    if (selectedProduit) {
      const produit = produits.find(p => p.id === parseInt(selectedProduit));
      if (produit && produit.code_barre) {
        setBarcode(produit.code_barre);
      } else {
        setBarcode('');
      }
    } else {
      setBarcode('');
    }
  }, [selectedProduit, produits]);

  useEffect(() => {
    loadProfil();
    loadData();
  }, [isOnline]);

  const loadProfil = async () => {
    try {
      const response = await profilAPI.me();
      setProfil(response.data);
    } catch (error) {
      console.error("Profil error", error);
    }
  };

  const loadData = async () => {
    try {
      const localProduits = await getProduits();
      const localClients = await getClients();

      setProduits(localProduits.filter(p => !p.vendu && p.quantite > 0));
      setClients(localClients);

      if (isOnline) {
        const [prodRes, cliRes] = await Promise.all([
          produitAPI.list(),
          clientAPI.list()
        ]);

        const prodList = prodRes.data.results || prodRes.data || [];
        const cliList = cliRes.data.results || cliRes.data || [];

        await saveProduits(prodList);
        await saveClients(cliList);

        setProduits(prodList.filter(p => !p.vendu && p.quantite > 0));
        setClients(cliList);
      }
    } catch (error) {
      console.error('Erreur chargement données', error);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  // ✅ FONCTION CORRIGÉE
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const produit = produits.find(p => p.id === parseInt(selectedProduit));

    if (!produit) {
      showMessage('Produit invalide', 'error');
      setLoading(false);
      return;
    }

    // 🔴 SÉCURITÉ BOUTIQUE ID :
    // On essaie de prendre l'ID boutique du produit, SINON celle du profil utilisateur
    const boutiqueId = produit.boutique || (profil && profil.boutique) || null;

    if (!boutiqueId) {
      showMessage("ERREUR : Aucune boutique associée (ni au produit, ni à l'utilisateur).", 'error');
      setLoading(false);
      return;
    }

    if (produit.quantite < quantite) {
      showMessage(`Stock insuffisant (Dispo: ${produit.quantite})`, 'error');
      setLoading(false);
      return;
    }

    const montantTotal = produit.prix * quantite;
    const offlineId = 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const venteData = {
      offline_id: offlineId,
      produit_id: produit.id,
      quantite: parseInt(quantite),
      montant_total: parseFloat(montantTotal.toFixed(2)),
      boutique_id: boutiqueId, // ✅ Utilisation de l'ID sécurisé
      client_id: selectedClient ? parseInt(selectedClient) : null,
      date_heure: new Date().toISOString(),
      notes: notes,
      utilisateur: profil?.id,
      sync_status: 'PENDING'
    };

    try {
      const nouveauStock = produit.quantite - parseInt(quantite);
      await updateProduitStock(produit.id, nouveauStock);

      setProduits(prev => prev.map(p =>
        p.id === produit.id ? { ...p, quantite: nouveauStock } : p
      ));

      let savedOffline = false;

      if (isOnline) {
        try {
          await venteAPI.create({
            produit: venteData.produit_id,
            quantite: venteData.quantite,
            montant_total: venteData.montant_total,
            boutique: venteData.boutique_id,
            client: venteData.client_id,
            date_heure: venteData.date_heure,
            notes: venteData.notes,
            offline_id: venteData.offline_id
          });
          showMessage('✅ Vente enregistrée et synchronisée');
          loadData();
        } catch (error) {
          console.warn('Échec API, basculement offline', error);
          savedOffline = true;
        }
      } else {
        savedOffline = true;
      }

      if (savedOffline) {
        await saveVenteOffline(venteData);
        // Tenter une synchro immédiate en arrière-plan si on a internet
        if (isOnline) syncVentes();
        showMessage('💾 Enregistré hors ligne (Sync auto)', 'info');
      }

      setSelectedProduit('');
      setSelectedClient('');
      setQuantite(1);
      setNotes('');
      setBarcode('');

    } catch (error) {
      console.error("Erreur critique vente", error);
      showMessage('Erreur lors de la vente', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedProdData = produits.find(p => p.id === parseInt(selectedProduit));
  const totalDisplay = selectedProdData ? (selectedProdData.prix * quantite).toLocaleString() : '0';

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn"><ArrowLeft size={20} /><span>Retour</span></Link>
          <div className="title-block">
            <h1>Nouvelle Vente</h1>
            <p className="subtitle">Enregistrer une transaction</p>
          </div>
        </div>
        <div className="header-right">
          <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢 Connecté' : '🔴 Hors Ligne'}
          </span>
        </div>
      </header>

      <div className="content-wrapper">

        {message && (
          <div className={`alert-box ${messageType}`}>
             {messageType === 'error' ? <AlertCircle size={20}/> : messageType === 'info' ? <Info size={20}/> : <CheckCircle size={20}/>}
             <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modern-card">

          <div className="form-group">
            <label>Code-barres</label>
            <div className="input-wrapper">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                placeholder="Scanner ou saisir..."
                autoFocus
              />
              <Scan size={18} className="input-icon-right" />
            </div>
          </div>

          <div className="form-group">
            <label>Produit</label>
            <div className="input-wrapper">
              <select
                value={selectedProduit}
                onChange={e => {
                  setSelectedProduit(e.target.value);
                  setQuantite(1);
                }}
                required
              >
                <option value="">Choisir un produit...</option>
                {produits.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nom} - {p.prix} FCFA (Stock: {p.quantite})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Client</label>
              <div className="input-wrapper">
                <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                  <option value="">Client de passage</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Quantité</label>
              <div className="input-wrapper">
                <input
                  type="number"
                  min="1"
                  value={quantite}
                  onChange={e => setQuantite(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {selectedProdData && (
            <div className="total-display">
              <span className="label">Total à payer</span>
              <span className="amount">{totalDisplay} <small>FCFA</small></span>
            </div>
          )}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? <><Loader className="spin" size={20}/> Traitement...</> : 'Valider la vente'}
          </button>
        </form>
      </div>

      <nav className="bottom-nav">
        <Link to="/dashboard" className="nav-item"><Home size={20} /><span>Accueil</span></Link>
        <Link to="/ventes" className="nav-item active"><ShoppingCart size={20} /><span>Ventes</span></Link>
        <Link to="/produits" className="nav-item"><Package size={20} /><span>Produits</span></Link>
      </nav>

      <style jsx>{`
        /* --- STYLE GLOBAL (Identique HistoriqueVentes) --- */
        .page-container { min-height: 100vh; background-color: #f8fafc; color: #1e293b; font-family: 'Inter', sans-serif; padding-bottom: 90px; }

        /* HEADER */
        .page-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 20; }
        .header-left { display: flex; align-items: center; gap: 24px; }
        .back-btn { display: flex; align-items: center; gap: 8px; color: #64748b; text-decoration: none; font-weight: 500; padding: 8px 12px; border-radius: 8px; transition: 0.2s; }
        .back-btn:hover { background: #f1f5f9; color: #1e293b; }
        .title-block h1 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #0f172a; }
        .subtitle { margin: 4px 0 0; font-size: 0.85rem; color: #64748b; }

        .status-badge { padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; background: #f1f5f9; color: #64748b; }
        .status-badge.online { background: #dcfce7; color: #166534; }
        .status-badge.offline { background: #fee2e2; color: #991b1b; }

        .content-wrapper { max-width: 600px; margin: 30px auto; padding: 0 20px; }

        /* ALERTES */
        .alert-box { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-weight: 500; animation: slideDown 0.3s ease; }
        .alert-box.success { background: #ecfdf5; color: #047857; border: 1px solid #d1fae5; }
        .alert-box.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; }
        .alert-box.info { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        /* CARD FORMULAIRE */
        .modern-card { background: white; padding: 32px; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }

        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; color: #64748b; font-size: 0.9rem; font-weight: 500; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

        .input-wrapper { position: relative; display: flex; align-items: center; }
        .input-wrapper input, .input-wrapper select { width: 100%; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 10px; outline: none; font-size: 1rem; color: #1e293b; transition: all 0.2s; background: #fff; appearance: none; }
        .input-wrapper input:focus, .input-wrapper select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .input-icon-right { position: absolute; right: 12px; color: #94a3b8; pointer-events: none; }

        /* TOTAL DISPLAY */
        .total-display { background: linear-gradient(135deg, #4f46e5, #4338ca); color: white; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3); }
        .total-display .label { display: block; font-size: 0.9rem; opacity: 0.9; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
        .total-display .amount { font-size: 2.5rem; font-weight: 800; }
        .total-display small { font-size: 1rem; font-weight: 500; opacity: 0.8; margin-left: 6px; }

        /* BUTTONS */
        .submit-btn { width: 100%; background: #0f172a; color: white; border: none; padding: 16px; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .submit-btn:hover:not(:disabled) { background: #1e293b; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); }
        .submit-btn:disabled { background: #94a3b8; cursor: not-allowed; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* BOTTOM NAV */
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-around; padding: 12px 0; z-index: 100; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.02); }
        .nav-item { display: flex; flex-direction: column; align-items: center; text-decoration: none; color: #94a3b8; font-size: 0.75rem; font-weight: 500; gap: 4px; transition: 0.2s; }
        .nav-item.active { color: #4f46e5; }
        .nav-item:hover { color: #475569; }

        @media (max-width: 640px) {
          .page-header { flex-direction: column; align-items: flex-start; gap: 16px; padding: 16px; }
          .header-right { width: 100%; display: flex; justify-content: flex-end; }
          .content-wrapper { margin: 20px auto; }
          .modern-card { padding: 20px; }
          .total-display .amount { font-size: 2rem; }
        }
      `}</style>
    </div>
  );
}