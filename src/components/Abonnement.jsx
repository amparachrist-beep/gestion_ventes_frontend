import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { abonnementAPI, demandePaiementAPI, profilAPI } from '../api';
import {
  ArrowLeft, CreditCard, CheckCircle, Users, Store,
  ShieldCheck, Zap, AlertTriangle, Info, Clock,
  MessageCircle, Activity, Lock, RefreshCw
} from 'lucide-react';

export default function Abonnement({ isOnline }) {
  const [abonnement, setAbonnement] = useState(null);
  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const plans = [
    {
      type: 'STANDARD',
      montant: 10000,
      users: 3,
      boutiques: 1,
      features: ['Support WhatsApp', 'Rapports de base', 'Multi-boutiques']
    },
    {
      type: 'PREMIUM',
      montant: 15000,
      users: 5,
      boutiques: 2,
      features: [
        'Support Prioritaire 24/7',
        'Rapports avancés',
        'Multi-boutiques illimité',
        'Exports Excel/PDF',
        'Gestion des stocks avancée'
      ]
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!isOnline) {
      setLoading(false);
      setError('Mode hors ligne - Connexion requise');
      return;
    }

    try {
      setError(null);

      // 1. Charger le profil utilisateur
      const profilResponse = await profilAPI.me();
      setProfil(profilResponse.data);
      console.log('✅ Profil chargé:', profilResponse.data);

      // 2. Charger l'abonnement (même pour vendeurs/caissiers)
      try {
        const abonnementResponse = await abonnementAPI.current();
        console.log('✅ Réponse abonnement:', abonnementResponse.data);

        // ✅ Vérifier si c'est un vrai abonnement ou l'objet vide
        if (abonnementResponse.data && abonnementResponse.data.type_abonnement) {
          setAbonnement(abonnementResponse.data);
        } else {
          setAbonnement(null);
        }
      } catch (aboError) {
        console.warn('⚠️ Erreur chargement abonnement:', aboError);
        setAbonnement(null);
      }

    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      setError(error.response?.data?.detail || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleChoosePlan = async (plan) => {
    if (!isOnline) {
      alert('❌ Connexion Internet requise pour souscrire à un abonnement');
      return;
    }

    try {
      // 1. Créer la demande de paiement
      await demandePaiementAPI.create({
        type_abonnement: plan.type,
        montant: plan.montant,
        mode_paiement: 'WHATSAPP'
      });

      // 2. Générer le lien WhatsApp
      const linkResponse = await demandePaiementAPI.whatsappLink({
        type: plan.type,
        montant: plan.montant
      });

      // 3. Ouvrir WhatsApp
      if (linkResponse.data.whatsapp_url) {
        window.open(linkResponse.data.whatsapp_url, '_blank');
        alert('✅ Demande créée! Contactez-nous sur WhatsApp pour finaliser.');
      }

    } catch (error) {
      console.error('❌ Erreur souscription:', error);
      alert('❌ Erreur: ' + (error.response?.data?.detail || error.message));
    }
  };

  const isVendeur = profil && (profil.role === 'vendeur' || profil.role === 'caissier');
  const isGerant = profil && profil.role === 'gerant';

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Chargement de votre abonnement...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn">
            <ArrowLeft size={20} />
            <span>Retour</span>
          </Link>
          <div className="title-block">
            <h1>Abonnement & Facturation</h1>
            <p className="subtitle">Gérez votre plan et vos accès</p>
          </div>
        </div>
        <button onClick={loadData} className="btn-refresh" disabled={!isOnline}>
          <RefreshCw size={18} />
          <span>Actualiser</span>
        </button>
      </header>

      <div className="content-wrapper">
        {/* ⚠️ ALERTES */}
        {!isOnline && (
          <div className="alert-box warning">
            <AlertTriangle size={20} />
            <span>Mode hors ligne - La gestion des abonnements nécessite une connexion Internet.</span>
          </div>
        )}

        {error && (
          <div className="alert-box danger">
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* ✅ VUE VENDEUR / CAISSIER */}
        {isVendeur ? (
          <div className="card info-card">
            <div className="card-header">
              <div className="icon-box blue">
                <Lock size={24} />
              </div>
              <div>
                <h2>Statut de votre compte</h2>
                <p>Votre accès dépend de l'abonnement de votre gérant</p>
              </div>
            </div>

            <div className="info-grid">
              <div className="info-item">
                <span className="label">Rôle</span>
                <span className="value badge">{profil.role.toUpperCase()}</span>
              </div>
              <div className="info-item">
                <span className="label">Boutiques assignées</span>
                <span className="value">{profil.boutiques?.length || 0}</span>
              </div>
              <div className="info-item">
                <span className="label">Statut Abonnement</span>
                {abonnement && abonnement.statut === 'ACTIF' ? (
                  <span className="value status-active">
                    <CheckCircle size={14} /> Actif
                  </span>
                ) : (
                  <span className="value status-pending">
                    <Clock size={14} /> En attente
                  </span>
                )}
              </div>
            </div>

            {abonnement && abonnement.statut === 'ACTIF' && (
              <div className="plan-info-compact">
                <h4>Plan actif : {abonnement.type_abonnement}</h4>
                <p>Expire le {new Date(abonnement.date_fin).toLocaleDateString('fr-FR')}</p>
              </div>
            )}

            <div className="alert-box info">
              <Info size={20} />
              <div>
                <h4>Accès Inclus</h4>
                <p>
                  Vous bénéficiez de toutes les fonctionnalités nécessaires à votre rôle
                  sans frais supplémentaires. Contactez votre gérant pour toute modification.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ✅ VUE GÉRANT / ADMIN */
          <>
            {/* ABONNEMENT ACTUEL */}
            {abonnement && abonnement.statut === 'ACTIF' ? (
              <div className="current-plan-section">
                <h2>Votre Abonnement Actuel</h2>
                <div className="card plan-card active-plan">
                  <div className="plan-header">
                    <div>
                      <h3>Plan {abonnement.type_abonnement}</h3>
                      <span className="status-badge active">Actif</span>
                    </div>
                    <div className="icon-box green">
                      <ShieldCheck size={32} />
                    </div>
                  </div>

                  <div className="plan-details">
                    <div className="detail-row">
                      <Clock size={16} />
                      <span>
                        Expire le <strong>{new Date(abonnement.date_fin).toLocaleDateString('fr-FR')}</strong>
                      </span>
                    </div>
                    <div className="detail-row">
                      <Users size={16} />
                      <span>
                        <strong>{abonnement.max_utilisateurs}</strong> utilisateurs max
                      </span>
                    </div>
                    <div className="detail-row">
                      <Store size={16} />
                      <span>
                        <strong>{abonnement.max_boutiques}</strong> boutiques max
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="alert-box warning no-plan">
                <AlertTriangle size={24} />
                <div>
                  <h3>Aucun abonnement actif</h3>
                  <p>
                    {isGerant
                      ? 'Votre période d\'essai est terminée. Choisissez un plan ci-dessous pour continuer.'
                      : 'Vous n\'avez pas encore souscrit à un abonnement.'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* PLANS DISPONIBLES */}
            <div className="plans-section">
              <h2>Choisir un plan</h2>
              <div className="plans-grid">
                {plans.map(plan => (
                  <div
                    key={plan.type}
                    className={`plan-card pricing ${plan.type === 'PREMIUM' ? 'featured' : ''}`}
                  >
                    {plan.type === 'PREMIUM' && <div className="featured-tag">Populaire</div>}

                    <h3>{plan.type}</h3>
                    <div className="price">
                      {plan.montant.toLocaleString()} <span>FCFA/mois</span>
                    </div>

                    <ul className="features-list">
                      <li><Users size={16} /> {plan.users} utilisateurs</li>
                      <li><Store size={16} /> {plan.boutiques} boutiques</li>
                      {plan.features.map((feat, i) => (
                        <li key={i}>
                          <CheckCircle size={16} /> {feat}
                        </li>
                      ))}
                    </ul>

                    <button
                      className={`btn-plan ${plan.type === 'PREMIUM' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => handleChoosePlan(plan)}
                      disabled={!isOnline}
                    >
                      {!isOnline ? 'Hors ligne' : 'Choisir ce plan'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* INFO SUPPLÉMENTAIRE */}
            {isGerant && (
              <div className="alert-box info mt-4">
                <Info size={20} />
                <p>
                  Chaque utilisateur (vendeur ou caissier) que vous créez compte dans votre
                  quota mensuel. Les boutiques supplémentaires sont disponibles selon votre plan.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .page-container {
          min-height: 100vh;
          background: #f8fafc;
          font-family: 'Inter', sans-serif;
          padding-bottom: 40px;
        }

        /* HEADER */
        .page-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          text-decoration: none;
          font-weight: 500;
          padding: 8px 12px;
          border-radius: 8px;
          transition: 0.2s;
        }

        .back-btn:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: 0.2s;
        }

        .btn-refresh:hover:not(:disabled) {
          background: #4338ca;
        }

        .btn-refresh:disabled {
          background: #94a3b8;
          cursor: not-allowed;
        }

        .title-block h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
        }

        .subtitle {
          margin: 4px 0 0;
          font-size: 0.85rem;
          color: #64748b;
        }

        .content-wrapper {
          max-width: 1000px;
          margin: 40px auto;
          padding: 0 20px;
        }

        /* CARDS */
        .card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          margin-bottom: 24px;
        }

        .active-plan {
          border-color: #4f46e5;
          background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-box.blue { background: #dbeafe; color: #1e40af; }
        .icon-box.green { background: #dcfce7; color: #166534; }

        .plan-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .plan-header h3 {
          margin: 0 0 8px;
          font-size: 1.25rem;
          color: #1e293b;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-badge.active {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge.inactive {
          background: #fee2e2;
          color: #991b1b;
        }

        .plan-details {
          display: grid;
          gap: 12px;
          margin-bottom: 20px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #475569;
          font-size: 0.95rem;
        }

        .detail-row svg {
          color: #64748b;
        }

        .plan-info-compact {
          background: #f1f5f9;
          padding: 12px;
          border-radius: 8px;
          margin: 16px 0;
        }

        .plan-info-compact h4 {
          margin: 0 0 4px;
          color: #1e293b;
          font-size: 0.95rem;
        }

        .plan-info-compact p {
          margin: 0;
          color: #64748b;
          font-size: 0.85rem;
        }

        /* PRICING CARDS */
        .plans-section h2 {
          margin: 0 0 20px;
          color: #1e293b;
          font-size: 1.25rem;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }

        .pricing {
          text-align: center;
          position: relative;
          transition: transform 0.2s;
        }

        .pricing:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.05);
        }

        .pricing.featured {
          border: 2px solid #4f46e5;
        }

        .featured-tag {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #4f46e5;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .price {
          font-size: 2rem;
          font-weight: 800;
          color: #1e293b;
          margin: 16px 0;
        }

        .price span {
          font-size: 1rem;
          color: #64748b;
          font-weight: 500;
        }

        .features-list {
          list-style: none;
          padding: 0;
          margin: 24px 0;
          text-align: left;
        }

        .features-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
          color: #475569;
          font-size: 0.9rem;
        }

        .features-list li svg {
          color: #10b981;
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        /* BUTTONS */
        .btn-plan {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
          font-size: 0.95rem;
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
          border: none;
        }

        .btn-primary:hover:not(:disabled) {
          background: #4338ca;
        }

        .btn-outline {
          background: white;
          border: 2px solid #e2e8f0;
          color: #334155;
        }

        .btn-outline:hover:not(:disabled) {
          border-color: #4f46e5;
          color: #4f46e5;
        }

        .btn-plan:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* INFO VENDEUR */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .label {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
        }

        .value {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
        }

        .value.badge {
          display: inline-block;
          padding: 4px 12px;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 20px;
          font-size: 0.85rem;
          width: fit-content;
        }

        .status-active {
          color: #166534;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-pending {
          color: #b45309;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* ALERTS */
        .alert-box {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .alert-box.warning {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fcd34d;
        }

        .alert-box.info {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        .alert-box.danger {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .alert-box h4 {
          margin: 0 0 4px;
          font-size: 0.95rem;
        }

        .alert-box p {
          margin: 0;
          font-size: 0.9rem;
        }

        .mt-4 {
          margin-top: 24px;
        }

        .no-plan {
          padding: 24px;
        }

        .no-plan h3 {
          margin: 0 0 8px;
          font-size: 1.1rem;
        }

        .no-plan p {
          margin: 0;
          font-size: 0.95rem;
        }

        /* LOADING */
        .loading-screen {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #4f46e5;
          border-radius: 50%;
          margin-bottom: 16px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .plans-grid {
            grid-template-columns: 1fr;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}