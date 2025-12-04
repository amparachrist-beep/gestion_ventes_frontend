import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { depenseAPI, boutiqueAPI } from '../api';
import {
  getDepenses,
  saveDepenses,
  saveDepenseOffline
} from '../db';
import {
  ArrowLeft, Plus, CreditCard, ShoppingCart, Home,
  Calendar, FileText, CheckCircle, AlertCircle, Info,
  Loader, X, Tag, DollarSign, Store
} from 'lucide-react';

export default function Depenses({ isOnline }) {
  const [depenses, setDepenses] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    montant: '',
    description: '',
    categorie: 'autre',
    boutique: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    loadData();
  }, [isOnline]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isOnline) {
        try {
          const catRes = await depenseAPI.categories();
          setCategories(catRes.data);
        } catch (e) {
          console.warn("Impossible de charger les catégories");
        }
      }

      // Fallback offline pour les catégories si vide
      if (categories.length === 0) {
        setCategories([
          { value: 'loyer', label: 'Loyer' },
          { value: 'salaire', label: 'Salaire' },
          { value: 'electricite', label: 'Électricité' },
          { value: 'eau', label: 'Eau' },
          { value: 'internet', label: 'Internet' },
          { value: 'transport', label: 'Transport' },
          { value: 'marketing', label: 'Marketing' },
          { value: 'fournitures', label: 'Fournitures' },
          { value: 'entretien', label: 'Entretien' },
          { value: 'autre', label: 'Autre' }
        ]);
      }

      if (isOnline) {
        const [depRes, boutRes] = await Promise.all([
          depenseAPI.list(),
          boutiqueAPI.list()
        ]);

        const serverDepenses = depRes.data.results || depRes.data || [];
        const serverBoutiques = boutRes.data.results || boutRes.data || [];

        await saveDepenses(serverDepenses);
        const allDepenses = await getDepenses();

        setDepenses(allDepenses.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setBoutiques(serverBoutiques);

        if (serverBoutiques.length > 0 && !formData.boutique) {
          setFormData(prev => ({ ...prev, boutique: serverBoutiques[0].id }));
        }
      } else {
        const localDepenses = await getDepenses();
        setDepenses(localDepenses.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }

    } catch (error) {
      console.error('Erreur chargement dépenses:', error);
      const localDepenses = await getDepenses();
      setDepenses(localDepenses);
    }
    setLoading(false);
  };

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.montant || !formData.description || !formData.boutique) {
      showMessage('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    const payload = {
      montant: parseFloat(formData.montant),
      description: formData.description,
      categorie: formData.categorie,
      boutique: parseInt(formData.boutique),
      date: formData.date
    };

    try {
      if (isOnline) {
        await depenseAPI.create(payload);
        showMessage('✅ Dépense enregistrée');
      } else {
        throw new Error("Offline");
      }

      setFormData({ ...formData, montant: '', description: '' });
      setShowForm(false);
      await loadData();

    } catch (error) {
      console.warn("Sauvegarde locale de la dépense");
      await saveDepenseOffline(payload);
      showMessage(isOnline ? '⚠️ Erreur API, sauvegardé localement' : '💾 Sauvegardé hors ligne', 'info');

      setFormData({ ...formData, montant: '', description: '' });
      setShowForm(false);
      await loadData();
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setFormData({ ...formData, montant: '', description: '' });
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn"><ArrowLeft size={20} /><span>Retour</span></Link>
          <div className="title-block">
            <h1>Dépenses</h1>
            <p className="subtitle">Gestion des sorties de caisse</p>
          </div>
        </div>
        <div className="header-right">
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={18} /> Nouvelle Dépense
          </button>
        </div>
      </header>

      <div className="content-wrapper">

        {message && (
          <div className={`alert-box ${messageType}`}>
             {messageType === 'error' ? <AlertCircle size={20}/> : messageType === 'info' ? <Info size={20}/> : <CheckCircle size={20}/>}
             <span>{message}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-state"><Loader className="spin" size={32} /><p>Chargement...</p></div>
        ) : depenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><CreditCard size={40} /></div>
            <h3>Aucune dépense enregistrée</h3>
            <p>Commencez à suivre vos frais pour une meilleure comptabilité.</p>
          </div>
        ) : (
          <div className="grid-container">
            {depenses.map((depense, index) => (
              <div key={depense.id || depense.offline_id || index} className="card expense-card">
                <div className="card-header">
                  <div className="category-badge">
                     <Tag size={12} />
                     <span>{depense.categorie}</span>
                  </div>
                  <div className="amount-display">
                    -{parseFloat(depense.montant).toLocaleString()} FCFA
                  </div>
                </div>

                <div className="card-body">
                  <p className="description">{depense.description}</p>

                  <div className="info-row small">
                    <Store size={12} />
                    <span>Boutique #{depense.boutique}</span>
                  </div>
                </div>

                <div className="card-footer">
                   <div className="date-info">
                     <Calendar size={12} />
                     <span>{new Date(depense.date).toLocaleDateString()}</span>
                   </div>
                   {depense.sync_status === 'PENDING' && (
                      <span className="sync-badge pending">⏳ En attente</span>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL FORMULAIRE */}
      {showForm && (
        <div className="modal-backdrop" onClick={handleCancelForm}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvelle Dépense</h2>
              <button className="close-btn" onClick={handleCancelForm}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Date *</label>
                <div className="input-wrapper">
                  <Calendar size={18} className="input-icon" />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Boutique *</label>
                <div className="input-wrapper">
                  <Store size={18} className="input-icon" />
                  <select
                    value={formData.boutique}
                    onChange={e => setFormData({...formData, boutique: e.target.value})}
                    required
                  >
                    <option value="">Sélectionner une boutique</option>
                    {boutiques.map(b => (
                      <option key={b.id} value={b.id}>{b.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Montant (FCFA) *</label>
                  <div className="input-wrapper">
                    <DollarSign size={18} className="input-icon" />
                    <input
                      type="number"
                      value={formData.montant}
                      onChange={e => setFormData({...formData, montant: e.target.value})}
                      required
                      min="0"
                      placeholder="Ex: 5000"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Catégorie *</label>
                  <div className="input-wrapper">
                    <Tag size={18} className="input-icon" />
                    <select
                      value={formData.categorie}
                      onChange={e => setFormData({...formData, categorie: e.target.value})}
                    >
                      {categories.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <div className="input-wrapper">
                  <FileText size={18} className="input-icon" />
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    required
                    rows="2"
                    placeholder="Ex: Achat rouleau papier caisse"
                    style={{paddingLeft: '40px', paddingTop: '10px'}}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={handleCancelForm} className="btn-cancel">Annuler</button>
                <button type="submit" className="btn-submit">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <Link to="/dashboard" className="nav-item"><Home size={20} /><span>Accueil</span></Link>
        <Link to="/ventes" className="nav-item"><ShoppingCart size={20} /><span>Ventes</span></Link>
        <Link to="/depenses" className="nav-item active"><CreditCard size={20} /><span>Dépenses</span></Link>
      </nav>

      <style jsx>{`
        .page-container { min-height: 100vh; background-color: #f8fafc; color: #1e293b; font-family: 'Inter', sans-serif; padding-bottom: 90px; }

        /* HEADER */
        .page-header { background: white; border-bottom: 1px solid #e2e8f0; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 20; }
        .header-left { display: flex; align-items: center; gap: 24px; }
        .back-btn { display: flex; align-items: center; gap: 8px; color: #64748b; text-decoration: none; font-weight: 500; padding: 8px 12px; border-radius: 8px; transition: 0.2s; }
        .back-btn:hover { background: #f1f5f9; color: #1e293b; }
        .title-block h1 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #0f172a; }
        .subtitle { margin: 4px 0 0; font-size: 0.85rem; color: #64748b; }
        .btn-primary { background: #4f46e5; color: white; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; }
        .btn-primary:hover { background: #4338ca; }

        .content-wrapper { max-width: 800px; margin: 30px auto; padding: 0 20px; }

        /* GRILLE DEPENSES */
        .grid-container { display: flex; flex-direction: column; gap: 16px; }
        .card { background: white; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -2px rgba(0,0,0,0.03); overflow: hidden; transition: transform 0.2s; }
        .card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }

        /* Style Spécifique Dépense */
        .expense-card { border-left: 4px solid #ef4444; }

        .card-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; background: linear-gradient(to right, #ffffff, #fef2f2); }
        .category-badge { display: flex; align-items: center; gap: 6px; background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .amount-display { font-size: 1.1rem; font-weight: 800; color: #dc2626; }

        .card-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; }
        .description { font-size: 1rem; color: #1f2937; font-weight: 500; margin: 0; }
        .info-row.small { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #6b7280; }

        .card-footer { padding: 10px 20px; background: #f9fafb; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #9ca3af; }
        .date-info { display: flex; align-items: center; gap: 6px; }
        .sync-badge.pending { background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 12px; font-weight: 600; }

        /* EMPTY & LOADING */
        .empty-state { text-align: center; padding: 60px 20px; color: #64748b; background: white; border-radius: 16px; border: 1px dashed #e2e8f0; }
        .empty-icon { width: 64px; height: 64px; background: #fef2f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #ef4444; }
        .loading-state { text-align: center; padding: 40px; color: #64748b; }
        .spin { animation: spin 1s linear infinite; }

        /* MODAL & FORMS */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; animation: fadeIn 0.2s; }
        .modal-card { background: white; width: 100%; max-width: 500px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); margin: 20px; }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
        .modal-header h2 { margin: 0; font-size: 1.25rem; color: #1e293b; }
        .close-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; transition: 0.2s; }
        .close-btn:hover { color: #ef4444; }

        .modal-body { padding: 24px; }
        .input-wrapper { position: relative; display: flex; align-items: center; }
        .input-icon { position: absolute; left: 14px; color: #94a3b8; pointer-events: none; }
        .input-wrapper input, .input-wrapper select, .input-wrapper textarea { width: 100%; padding: 12px 14px 12px 40px; border: 1px solid #e2e8f0; border-radius: 10px; outline: none; font-size: 0.95rem; color: #1e293b; background: white; appearance: none; }
        .input-wrapper input:focus, .input-wrapper select:focus, .input-wrapper textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; color: #64748b; font-size: 0.85rem; font-weight: 600; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .modal-footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; }
        .btn-cancel { padding: 10px 20px; border: 1px solid #e2e8f0; background: white; color: #64748b; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn-cancel:hover { background: #f1f5f9; color: #1e293b; }
        .btn-submit { padding: 10px 20px; border: none; background: #4f46e5; color: white; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn-submit:hover { background: #4338ca; }

        /* ALERTES */
        .alert-box { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-weight: 500; }
        .alert-box.success { background: #ecfdf5; color: #047857; border: 1px solid #d1fae5; }
        .alert-box.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; }
        .alert-box.info { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }

        /* BOTTOM NAV */
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-around; padding: 12px 0; z-index: 100; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.02); }
        .nav-item { display: flex; flex-direction: column; align-items: center; text-decoration: none; color: #94a3b8; font-size: 0.75rem; font-weight: 500; gap: 4px; transition: 0.2s; }
        .nav-item.active { color: #4f46e5; }
        .nav-item:hover { color: #475569; }

        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        @media (max-width: 640px) {
          .page-header { flex-direction: column; align-items: flex-start; gap: 16px; padding: 16px; }
          .header-right { width: 100%; display: flex; justify-content: flex-end; }
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}