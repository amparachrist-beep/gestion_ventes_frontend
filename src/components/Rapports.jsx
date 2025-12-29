import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportAPI } from '../api';
import {
  ArrowLeft, TrendingUp, TrendingDown,
  DollarSign, PieChart, Download, AlertTriangle, RefreshCw
} from 'lucide-react';

export default function Rapports({ isOnline }) {
  // --- ÉTATS ---
  const [period, setPeriod] = useState('weekly'); // daily, weekly, monthly, yearly
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOnline) loadReportData();
  }, [isOnline, period]);

  // --- LOGIQUE MÉTIER (INTACTE) ---

  const loadReportData = async () => {
    if (!isOnline) {
      setError("Connexion requise pour générer le rapport.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Appel API vers 'benefices_stats'
      const response = await reportAPI.beneficesStats({ period });
      const apiResponse = response.data; // La structure renvoyée par Django

      // 2. Extraction des totaux (calculés par le backend)
      const totaux = apiResponse.totaux || { ventes: 0, depenses: 0, benefice: 0 };

      // 3. Traitement des données pour le graphique et le tableau
      const chartData = apiResponse.data.map(item => {
        // CORRECTION DATE : On découpe manuellement pour éviter les problèmes de fuseau horaire
        // item.period est soit "YYYY-MM-DD" (Daily/Weekly/Monthly) soit "YYYY-MM-01" (Yearly)
        const parts = item.period.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Les mois JS commencent à 0
        const day = parseInt(parts[2], 10);

        const dateObj = new Date(year, month, day);
        let label = item.period;

        // Formatage joli de la date selon la période
        if (period === 'weekly' || period === 'daily') {
          // Ex: "Lun. 12"
          label = dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
        } else if (period === 'monthly') {
           // Ex: "12 janv."
           label = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        } else if (period === 'yearly') {
          // Ex: "Janv."
          label = dateObj.toLocaleDateString('fr-FR', { month: 'short' });
        }

        return {
          label: label,
          fullDate: item.period, // Utile pour l'affichage technique
          ventes: parseFloat(item.ventes),
          depenses: parseFloat(item.depenses),
          benefice: parseFloat(item.benefice)
        };
      });

      // 4. Calculs des indicateurs financiers
      // Marge commerciale = (Bénéfice / Ventes) * 100
      const marge = totaux.ventes > 0 ? (totaux.benefice / totaux.ventes) * 100 : 0;

      // Panier moyen : On somme les "count_ventes" de chaque jour
      const totalVentesCount = apiResponse.data.reduce((acc, curr) => acc + (curr.count_ventes || 0), 0);
      const panierMoyen = totalVentesCount > 0 ? (totaux.ventes / totalVentesCount) : 0;

      // Ratio Dépenses = (Dépenses / Ventes) * 100
      const ratioDepenses = totaux.ventes > 0 ? (totaux.depenses / totaux.ventes) * 100 : 0;

      setStats({
        ventes: {
            total: totaux.ventes,
            count: totalVentesCount
        },
        depenses: {
            total: totaux.depenses,
            count: apiResponse.data.reduce((acc, curr) => acc + (curr.count_depenses || 0), 0)
        },
        finance: {
            benefice: totaux.benefice,
            marge,
            panierMoyen,
            ratioDepenses
        },
        chart: chartData,
        lastUpdated: new Date()
      });

    } catch (err) {
      console.error("Erreur rapport:", err);
      // Affichage d'un message d'erreur plus précis si possible
      if (err.response && err.response.status === 404) {
         setError("Erreur API: Endpoint introuvable (404). Vérifiez urls.py.");
      } else {
         setError("Erreur lors de la récupération des données.");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- FORMATTERS ---
  const formatMoney = (amount) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
  const formatPercent = (val) => `${val.toFixed(1)}%`;

  // --- COMPOSANTS UI INTERNES ---

  const KPICard = ({ title, value, subtext, icon: Icon, color }) => (
    <div className="kpi-card">
      <div className="kpi-header">
        <div className={`icon-box ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="kpi-body">
        <h3>{title}</h3>
        <p className="kpi-value">{loading ? '...' : value}</p>
        {subtext && <p className="kpi-subtext">{subtext}</p>}
      </div>
    </div>
  );

  const CustomBarChart = ({ data }) => {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map(d => Math.max(d.ventes, d.depenses))) || 1;

    return (
      <div className="chart-wrapper">
        <div className="bars-container">
          {data.map((d, i) => (
            <div key={i} className="bar-group">
              <div className="bars-pair">
                <div
                  className="bar sales-bar"
                  style={{ height: `${(d.ventes / maxVal) * 100}%` }}
                  title={`Ventes: ${formatMoney(d.ventes)}`}
                />
                <div
                  className="bar expenses-bar"
                  style={{ height: `${(d.depenses / maxVal) * 100}%` }}
                  title={`Dépenses: ${formatMoney(d.depenses)}`}
                />
              </div>
              <span className="bar-label">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="report-page">
      {/* HEADER */}
      <header className="report-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-link">
            <ArrowLeft size={18} /> Retour
          </Link>
          <h1>Rapports Financiers</h1>
        </div>
        <div className="header-actions">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="period-select"
            disabled={loading}
          >
            <option value="weekly">7 derniers jours</option>
            <option value="monthly">Ce mois</option>
            <option value="yearly">Cette année</option>
          </select>
          <button onClick={loadReportData} className="btn-refresh" disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {/* ERROR STATE */}
      {error && (
        <div className="error-banner">
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* CONTENT */}
      <div className="report-content">

        {/* SECTION KPI */}
        <section className="kpi-grid">
          <KPICard
            title="Chiffre d'Affaires"
            value={stats ? formatMoney(stats.ventes.total) : '0 FCFA'}
            subtext={stats ? `${stats.ventes.count} transactions` : '-'}
            icon={DollarSign}
            color="bg-indigo"
          />
          <KPICard
            title="Dépenses Totales"
            value={stats ? formatMoney(stats.depenses.total) : '0 FCFA'}
            subtext={stats ? `${stats.depenses.count} opérations` : '-'}
            icon={TrendingDown}
            color="bg-rose"
          />
          <KPICard
            title="Bénéfice Net"
            value={stats ? formatMoney(stats.finance.benefice) : '0 FCFA'}
            subtext="Résultat net"
            icon={TrendingUp}
            color={stats?.finance.benefice >= 0 ? "bg-emerald" : "bg-red"}
          />
          <KPICard
            title="Marge Commerciale"
            value={stats ? formatPercent(stats.finance.marge) : '0%'}
            subtext="Rentabilité"
            icon={PieChart}
            color="bg-blue"
          />
        </section>

        <div className="charts-split">
          {/* GRAPHIQUE PRINCIPAL */}
          <section className="chart-card main-chart">
            <div className="card-header">
              <h3>Évolution Financière</h3>
              <div className="legend">
                <span className="legend-item"><span className="dot dot-sales"></span> Ventes</span>
                <span className="legend-item"><span className="dot dot-exp"></span> Dépenses</span>
              </div>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="chart-loading">Chargement des données...</div>
              ) : stats && stats.chart.length > 0 ? (
                <CustomBarChart data={stats.chart} />
              ) : (
                <div className="chart-empty">Aucune donnée pour cette période</div>
              )}
            </div>
          </section>

          {/* INDICATEURS SECONDAIRES */}
          <section className="chart-card secondary-stats">
            <div className="card-header">
              <h3>Indicateurs Clés</h3>
            </div>
            <div className="stats-list">
              <div className="stat-row">
                <div className="stat-info">
                  <span className="stat-label">Panier Moyen</span>
                  <span className="stat-desc">Valeur moy. par vente</span>
                </div>
                <span className="stat-number">{stats ? formatMoney(stats.finance.panierMoyen) : '-'}</span>
              </div>
              <div className="divider"></div>
              <div className="stat-row">
                <div className="stat-info">
                  <span className="stat-label">Ratio Dépenses</span>
                  <span className="stat-desc">% du C.A. consommé</span>
                </div>
                <span className="stat-number">
                  {stats ? formatPercent(stats.finance.ratioDepenses) : '0%'}
                </span>
              </div>
              <div className="divider"></div>
              <div className="stat-row">
                <div className="stat-info">
                  <span className="stat-label">Performance</span>
                  <span className="stat-desc">Statut global</span>
                </div>
                <span className={`stat-badge ${stats?.finance.benefice > 0 ? 'good' : 'bad'}`}>
                  {stats?.finance.benefice > 0 ? 'Rentable' : 'Déficitaire'}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* TABLEAU RÉCAPITULATIF */}
        <section className="table-card">
          <div className="card-header">
            <h3>Détail par période</h3>
            <button className="btn-export">
              <Download size={16} /> Exporter
            </button>
          </div>
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Période</th>
                  <th className="text-right">Ventes</th>
                  <th className="text-right">Dépenses</th>
                  <th className="text-right">Résultat</th>
                  <th className="text-center">État</th>
                </tr>
              </thead>
              <tbody>
                {stats && stats.chart.map((row, idx) => (
                  <tr key={idx}>
                    <td className="font-medium">{row.label} <small style={{color:'#94a3b8'}}>({row.fullDate})</small></td>
                    <td className="text-right text-indigo">{formatMoney(row.ventes)}</td>
                    <td className="text-right text-rose">{formatMoney(row.depenses)}</td>
                    <td className={`text-right font-bold ${row.benefice >= 0 ? 'text-emerald' : 'text-red'}`}>
                      {formatMoney(row.benefice)}
                    </td>
                    <td className="text-center">
                      <span className={`status-dot ${row.benefice >= 0 ? 'green' : 'red'}`}></span>
                    </td>
                  </tr>
                ))}
                {!loading && (!stats || stats.chart.length === 0) && (
                  <tr><td colSpan="5" className="text-center py-4">Aucune donnée chargée</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      <style jsx>{`
        /* LAYOUT & GLOBAL */
        .report-page {
          min-height: 100vh;
          background-color: #f1f5f9;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          padding-bottom: 60px;
        }

        .report-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }

        /* HEADER */
        .report-header {
          background: white;
          padding: 16px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky; top: 0; z-index: 10;
        }

        .header-left h1 { margin: 4px 0 0 0; font-size: 1.5rem; font-weight: 700; }
        .back-link {
          display: flex; align-items: center; gap: 6px;
          text-decoration: none; color: #64748b; font-size: 0.9rem; font-weight: 500;
        }

        .header-actions { display: flex; gap: 12px; }
        .period-select {
          padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1;
          background: #f8fafc; color: #334155; font-weight: 600; cursor: pointer;
        }
        .btn-refresh {
          width: 36px; height: 36px; border-radius: 8px; border: 1px solid #cbd5e1;
          background: white; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #475569; transition: 0.2s;
        }
        .btn-refresh:hover { background: #f1f5f9; color: #0f172a; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* KPI CARDS */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .kpi-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          border: 1px solid #f1f5f9;
        }

        .kpi-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .icon-box {
          width: 42px; height: 42px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; color: white;
        }

        .bg-indigo { background: linear-gradient(135deg, #6366f1, #4f46e5); }
        .bg-rose { background: linear-gradient(135deg, #f43f5e, #e11d48); }
        .bg-emerald { background: linear-gradient(135deg, #10b981, #059669); }
        .bg-red { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .bg-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }

        .kpi-body h3 { margin: 0; font-size: 0.85rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
        .kpi-value { margin: 4px 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; }
        .kpi-subtext { margin: 0; font-size: 0.8rem; color: #94a3b8; }

        /* CHARTS SECTION */
        .charts-split {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        @media (max-width: 900px) { .charts-split { grid-template-columns: 1fr; } }

        .chart-card {
          background: white; border-radius: 16px; padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #f1f5f9;
        }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .card-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #334155; }

        .legend { display: flex; gap: 16px; font-size: 0.85rem; color: #64748b; }
        .legend-item { display: flex; align-items: center; gap: 6px; }
        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .dot-sales { background: #6366f1; }
        .dot-exp { background: #f43f5e; }

        /* CUSTOM CHART */
        .chart-wrapper {
          width: 100%;
          height: 250px;
          /* AJOUT SCROLL POUR MOBILE */
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
        }

        .bars-container {
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          height: 100%;
          /* min-width permet au graphe de ne pas s'écraser sur mobile */
          min-width: 100%;
          padding-bottom: 20px;
          padding-left: 10px;
        }

        .bar-group {
          display: flex; flex-direction: column; align-items: center;
          height: 100%; justify-content: flex-end; flex: 1;
          min-width: 40px; /* Assure une largeur minimale par barre */
        }

        .bars-pair {
          display: flex; align-items: flex-end; gap: 4px; height: 85%; width: 30px;
          justify-content: center;
        }

        .bar { width: 12px; border-radius: 4px 4px 0 0; transition: height 0.5s ease; min-height: 4px; }
        .sales-bar { background: #6366f1; opacity: 0.9; }
        .sales-bar:hover { background: #4f46e5; opacity: 1; }
        .expenses-bar { background: #f43f5e; opacity: 0.9; }
        .expenses-bar:hover { background: #e11d48; opacity: 1; }

        .bar-label { margin-top: 8px; font-size: 0.75rem; color: #94a3b8; font-weight: 500; white-space: nowrap; }

        /* SECONDARY STATS LIST */
        .stats-list { display: flex; flex-direction: column; gap: 16px; }
        .stat-row { display: flex; justify-content: space-between; align-items: center; }
        .stat-label { display: block; font-size: 0.9rem; font-weight: 600; color: #334155; }
        .stat-desc { font-size: 0.75rem; color: #94a3b8; }
        .stat-number { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
        .divider { height: 1px; background: #f1f5f9; width: 100%; }

        .stat-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        .stat-badge.good { background: #dcfce7; color: #15803d; }
        .stat-badge.bad { background: #fee2e2; color: #b91c1c; }

        /* TABLE */
        .table-card {
          background: white; border-radius: 16px; padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #f1f5f9;
          overflow: hidden; /* Empêche le débordement de la carte */
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto; /* SCROLL HORIZONTAL TABLEAU */
          -webkit-overflow-scrolling: touch;
        }

        .btn-export {
          background: white; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 8px;
          color: #64748b; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.85rem;
        }
        .btn-export:hover { background: #f8fafc; color: #334155; }

        .report-table { width: 100%; border-collapse: collapse; min-width: 500px; /* Force la largeur pour déclencher le scroll sur mobile */ }
        .report-table th {
          text-align: left; font-size: 0.75rem; text-transform: uppercase;
          color: #94a3b8; padding: 12px; font-weight: 600; letter-spacing: 0.05em;
          white-space: nowrap;
        }
        .report-table td { padding: 16px 12px; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; white-space: nowrap; }
        .report-table tr:last-child td { border-bottom: none; }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-medium { font-weight: 600; color: #334155; }
        .font-bold { font-weight: 700; }
        .text-indigo { color: #4f46e5; }
        .text-rose { color: #e11d48; }
        .text-emerald { color: #059669; }
        .text-red { color: #dc2626; }

        .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .status-dot.green { background: #10b981; box-shadow: 0 0 0 4px #dcfce7; }
        .status-dot.red { background: #ef4444; box-shadow: 0 0 0 4px #fee2e2; }

        .error-banner {
          background: #fef2f2; color: #991b1b; padding: 12px; margin: 0 24px 16px;
          border-radius: 8px; display: flex; align-items: center; gap: 10px; font-size: 0.9rem;
        }

        .chart-loading, .chart-empty {
            display: flex; justify-content: center; align-items: center;
            height: 200px; color: #94a3b8;
        }

        @media (max-width: 640px) {
          .report-content { padding: 16px; }
          .report-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .header-actions { width: 100%; }
          .period-select { flex: 1; }

          /* Pour le graphe mobile : on force une largeur minimale au conteneur interne pour activer le scroll */
          .bars-container {
            justify-content: flex-start;
            gap: 10px;
            padding-right: 20px;
          }
          /* Si beaucoup de données (mensuel), on s'assure que ça ne s'écrase pas */
          .bar-group {
             min-width: 50px;
          }
          .bars-pair { width: 24px; }
        }
      `}</style>
    </div>
  );
}