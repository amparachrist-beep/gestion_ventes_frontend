import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';

export default function SyncStatus({ lastSync, status, error, onRetry, isOnline }) {
  // status options: 'IDLE', 'SYNCING', 'ERROR', 'SUCCESS'
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '--/--/---- --:--';
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const getStatusColor = () => {
    if (!isOnline) return 'offline';
    if (status === 'SYNCING') return 'syncing';
    if (status === 'ERROR') return 'error';
    return 'success';
  };

  const currentStyle = getStatusColor();

  return (
    <div className={`sync-widget ${currentStyle}`}>

      {/* Partie Gauche : Icône et indicateur */}
      <div className="icon-wrapper">
        {!isOnline ? (
          <WifiOff size={18} />
        ) : status === 'SYNCING' ? (
          <RefreshCw size={18} className="spin" />
        ) : status === 'ERROR' ? (
          <AlertCircle size={18} />
        ) : (
          <CheckCircle size={18} />
        )}
      </div>

      {/* Partie Centrale : Texte */}
      <div className="text-content">
        <span className="label">
          {!isOnline ? 'Mode Hors Ligne' : status === 'SYNCING' ? 'Synchronisation...' : 'Dernière synchro'}
        </span>
        <span className="value">
          {formatDate(lastSync)}
        </span>
      </div>

      {/* Partie Droite : Action ou Badge Erreur */}
      {status === 'ERROR' && isOnline && (
        <div className="action-area">
          <button
            className="retry-btn"
            onClick={onRetry}
            title="Réessayer la synchronisation"
          >
            <RefreshCw size={14} />
          </button>
          <span
            className="error-badge"
            onMouseEnter={() => setShowErrorDetails(true)}
            onMouseLeave={() => setShowErrorDetails(false)}
          >
            Erreur
          </span>
        </div>
      )}

      {/* Tooltip pour l'erreur */}
      {showErrorDetails && error && (
        <div className="error-tooltip">
          {error}
        </div>
      )}

      <style jsx>{`
        .sync-widget {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          position: relative;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        /* --- VARIANTS --- */
        .sync-widget.success { border-color: #d1fae5; background: #ecfdf5; }
        .sync-widget.success .icon-wrapper { color: #059669; }
        .sync-widget.success .value { color: #065f46; }

        .sync-widget.syncing { border-color: #dbeafe; background: #eff6ff; }
        .sync-widget.syncing .icon-wrapper { color: #2563eb; }
        .sync-widget.syncing .value { color: #1e40af; }

        .sync-widget.error { border-color: #fee2e2; background: #fef2f2; }
        .sync-widget.error .icon-wrapper { color: #dc2626; }
        .sync-widget.error .value { color: #991b1b; }

        .sync-widget.offline { border-color: #f1f5f9; background: #f8fafc; opacity: 0.8; }
        .sync-widget.offline .icon-wrapper { color: #64748b; }

        /* --- ELEMENTS --- */
        .icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .text-content {
          display: flex;
          flex-direction: column;
        }

        .label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          font-weight: 600;
        }

        .value {
          font-size: 0.85rem;
          font-weight: 700;
          font-family: 'Monaco', monospace; /* Pour aligner les chiffres */
        }

        .action-area {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 8px;
          padding-left: 8px;
          border-left: 1px solid rgba(0,0,0,0.1);
        }

        .error-badge {
          font-size: 0.7rem;
          background: #dc2626;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          cursor: help;
        }

        .retry-btn {
          background: white;
          border: 1px solid #fee2e2;
          color: #dc2626;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.2s;
        }
        .retry-btn:hover {
          background: #dc2626;
          color: white;
          transform: rotate(180deg);
        }

        /* --- TOOLTIP --- */
        .error-tooltip {
          position: absolute;
          top: 110%;
          right: 0;
          background: #1e293b;
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          white-space: nowrap;
          z-index: 50;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          animation: fadeIn 0.2s ease;
        }
        .error-tooltip::after {
          content: '';
          position: absolute;
          bottom: 100%;
          right: 20px;
          border-width: 6px;
          border-style: solid;
          border-color: transparent transparent #1e293b transparent;
        }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 640px) {
          .label { display: none; }
          .sync-widget { padding: 6px 10px; }
        }
      `}</style>
    </div>
  );
}