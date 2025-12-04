import { useState } from 'react';
import { Link } from 'react-router-dom';
import { exportAPI } from '../api';
import {
  ArrowLeft, FileText, Database, FileSpreadsheet,
  Download, CheckCircle, AlertCircle, Info, Loader,
  Home, TrendingUp, CreditCard, ShoppingCart
} from 'lucide-react';

export default function Export({ isOnline }) {
  const [loading, setLoading] = useState(false);
  const [currentExport, setCurrentExport] = useState(null); // Pour savoir quel bouton charge
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleExport = async (type, format) => {
    if (!isOnline) {
      showMessage('Connexion Internet requise pour exporter', 'error');
      return;
    }

    setLoading(true);
    setCurrentExport(`${type}-${format}`);

    try {
      const blob = await exportAPI[type](format);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const extension = format === 'excel' ? 'xlsx' : 'pdf';
      link.download = `${type}_${timestamp}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      showMessage(`Export ${type} ${format.toUpperCase()} réussi`, 'success');
    } catch (error) {
      console.error('Erreur export:', error);
      showMessage(`Erreur: ${error.message}`, 'error');
    } finally {
      setLoading(false);
      setCurrentExport(null);
    }
  };

  const ExportCard = ({ title, icon: Icon, type, description, colorClass }) => (
    <div className="card export-card">
      <div className={`icon-box ${colorClass}`}>
        <Icon size={32} />
      </div>
      <div className="card-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="export-actions">
        <button
          onClick={() => handleExport(type, 'pdf')}
          disabled={loading}
          className="btn-action btn-pdf"
        >
          {loading && currentExport === `${type}-pdf` ? <Loader className="spin" size={16} /> : <FileText size={16} />}
          <span>PDF</span>
        </button>
        <button
          onClick={() => handleExport(type, 'excel')}
          disabled={loading}
          className="btn-action btn-excel"
        >
          {loading && currentExport === `${type}-excel` ? <Loader className="spin" size={16} /> : <FileSpreadsheet size={16} />}
          <span>Excel</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn"><ArrowLeft size={20} /><span>Retour</span></Link>
          <div className="title-block">
            <h1>Exports de Données</h1>
            <p className="subtitle">Téléchargez vos rapports et archives</p>
          </div>
        </div>
      </header>

      <div className="content-wrapper">
        {!isOnline && (
          <div className="alert-box warning">
            <AlertCircle size={20} />
            <span>Les exports nécessitent une connexion Internet active.</span>
          </div>
        )}

        {message && (
          <div className={`alert-box ${messageType}`}>
             {messageType === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
             <span>{message}</span>
          </div>
        )}

        <div className="grid-container">
          <ExportCard
            title="Clients"
            icon={UsersIcon}
            type="clients"
            description="Liste complète des clients et coordonnées."
            colorClass="blue"
          />

          <ExportCard
            title="Ventes"
            icon={ShoppingCartIcon}
            type="ventes"
            description="Historique détaillé de toutes les transactions."
            colorClass="green"
          />

          <ExportCard
            title="Produits"
            icon={PackageIcon}
            type="produits"
            description="Catalogue produits, prix et état des stocks."
            colorClass="purple"
          />

          <ExportCard
            title="Dépenses"
            icon={CreditCardIcon}
            type="depenses"
            description="Suivi complet des charges et dépenses."
            colorClass="red"
          />
        </div>
      </div>

      <nav className="bottom-nav">
        <Link to="/dashboard" className="nav-item"><Home size={20} /><span>Accueil</span></Link>
        <Link to="/rapports" className="nav-item"><TrendingUp size={20} /><span>Rapports</span></Link>
        <Link to="/export" className="nav-item active"><Download size={20} /><span>Exports</span></Link>
        <Link to="/abonnement" className="nav-item"><CreditCard size={20} /><span>Plan</span></Link>
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

        .content-wrapper { max-width: 1000px; margin: 30px auto; padding: 0 20px; }

        /* ALERTES */
        .alert-box { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-weight: 500; animation: fadeIn 0.3s ease; }
        .alert-box.success { background: #ecfdf5; color: #047857; border: 1px solid #d1fae5; }
        .alert-box.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; }
        .alert-box.warning { background: #fffbeb; color: #b45309; border: 1px solid #fcd34d; }

        /* GRILLE */
        .grid-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }

        /* CARDS */
        .card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -2px rgba(0,0,0,0.03); display: flex; flex-direction: column; align-items: center; text-align: center; transition: transform 0.2s; }
        .card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }

        .icon-box { width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .icon-box.blue { background: #eff6ff; color: #3b82f6; }
        .icon-box.green { background: #dcfce7; color: #166534; }
        .icon-box.purple { background: #f3e8ff; color: #9333ea; }
        .icon-box.red { background: #fee2e2; color: #dc2626; }

        .card-content h3 { margin: 0 0 8px 0; font-size: 1.2rem; color: #1e293b; }
        .card-content p { color: #64748b; font-size: 0.9rem; margin-bottom: 24px; min-height: 40px; }

        .export-actions { display: flex; gap: 12px; width: 100%; }
        .btn-action { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 0.9rem; }
        .btn-action:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-pdf { background: #fee2e2; color: #dc2626; }
        .btn-pdf:hover:not(:disabled) { background: #fecaca; }

        .btn-excel { background: #dcfce7; color: #166534; }
        .btn-excel:hover:not(:disabled) { background: #bbf7d0; }

        /* LOADING */
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        /* BOTTOM NAV */
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-around; padding: 12px 0; z-index: 100; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.02); }
        .nav-item { display: flex; flex-direction: column; align-items: center; text-decoration: none; color: #94a3b8; font-size: 0.75rem; font-weight: 500; gap: 4px; transition: 0.2s; }
        .nav-item.active { color: #4f46e5; }
        .nav-item:hover { color: #475569; }

        @media (max-width: 640px) {
          .page-header { padding: 16px; flex-direction: column; align-items: flex-start; gap: 16px; }
          .grid-container { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

// Icônes mappées pour éviter les erreurs si non importées
const UsersIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const ShoppingCartIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>;
const PackageIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>;
const CreditCardIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;