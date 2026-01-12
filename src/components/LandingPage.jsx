import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const PHONE_NUMBER = "242061814279";
  const YOUTUBE_VIDEO_ID = "YlEo5xYIKEw";
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const message = encodeURIComponent("Bonjour, je souhaite tester Hitch-Ventes (Essai gratuit 7 jours).");
  const whatsappUrl = `https://wa.me/${PHONE_NUMBER}?text=${message}`;

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') setIsVideoOpen(false); };
    if (isVideoOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isVideoOpen]);

  return (
    <div style={styles.container}>
      {/* --- INJECTION CSS POUR LES HOVERS ET LE RESPONSIVE --- */}
      <style>
        {`
          .btn-hover:hover { transform: translateY(-2px); filter: brightness(1.1); }
          .card-hover:hover { transform: translateY(-8px) !important; box-shadow: 0 20px 40px rgba(0,0,0,0.08) !important; }
          .nav-link:hover { background: rgba(79, 70, 229, 0.15) !important; }

          @media (max-width: 768px) {
            .nav-content { padding: 0 15px !important; }
            .logo-text { font-size: 1.1rem !important; }
            .logo-sub { display: none; } /* On cache "VENTES" sur très petit écran */
            .hero-main { padding: 40px 20px !important; }
            .btn-group { flex-direction: column; width: 100%; }
            .primary-btn, .secondary-btn { width: 100%; justify-content: center; }
            .features-grid { grid-template-columns: 1fr !important; }
          }
        `}
      </style>

      <header style={styles.navbar}>
        <div style={styles.navContent} className="nav-content">
          <div style={styles.logoContainer}>
            <div style={styles.logoIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 10V3L4 14H11V21L20 10H13Z" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <span style={styles.logoText} className="logo-text">HITCH</span>
              <span style={styles.logoSubText} className="logo-sub">VENTES</span>
            </div>
          </div>
          <Link to="/login" style={styles.navLoginBtn} className="nav-link">
            Espace Client
          </Link>
        </div>
      </header>

      <main style={styles.main} className="hero-main">
        <div style={styles.heroContent}>
          <div style={styles.badgeContainer}>
            <span style={styles.badge}>✨ NOUVEAU</span>
            <span style={styles.badgeVersion}>v2.0</span>
          </div>

          <h1 style={styles.title}>
            Gérez votre boutique
            <span style={styles.titleHighlight}> simplement</span>
            <br />
            <span style={styles.titleSub}>et sans connexion internet</span>
          </h1>

          <p style={styles.subtitle}>
            La solution tout-en-un pour les commerçants modernes.
            Gestion des stocks et ventes même hors ligne.
          </p>

          <div style={styles.buttonGroup} className="btn-group">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={styles.primaryBtn} className="btn-hover primary-btn">
              <div style={styles.btnContent}>
                <span style={styles.btnMain}>Essai Gratuit 7 Jours</span>
                <span style={styles.btnSub}>Démarrer sur WhatsApp</span>
              </div>
            </a>

            <button onClick={() => setIsVideoOpen(true)} style={styles.secondaryBtn} className="btn-hover secondary-btn">
              <div style={styles.btnContent}>
                <span style={styles.btnMain}>Voir la Démo</span>
                <span style={styles.btnSub}>Vidéo 2 min</span>
              </div>
            </button>
          </div>
        </div>

        <div style={styles.featuresGrid} className="features-grid">
          <FeatureCard icon="⚡" title="Mode Hors-ligne" desc="Vendez sans internet, synchronisez plus tard." color="#4F46E5" />
          <FeatureCard icon="👥" title="Multi-utilisateurs" desc="Gérez vos vendeurs et leurs accès." color="#10B981" />
          <FeatureCard icon="📊" title="Analyses" desc="Rapports de ventes détaillés en un clic." color="#F59E0B" />
        </div>
      </main>

      <footer style={styles.footer}>
        <p style={styles.footerText}>© 2024 Hitch-Ventes SaaS. Fait à Brazzaville. ❤️</p>
      </footer>

      {/* --- MODAL --- */}
      {isVideoOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsVideoOpen(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={{color: 'white', fontWeight: 'bold'}}>Démo Hitch-Ventes</span>
              <button onClick={() => setIsVideoOpen(false)} style={styles.closeBtn}>×</button>
            </div>
            <div style={styles.videoWrapper}>
              <iframe
                width="100%" height="100%"
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1`}
                title="YouTube video" frameBorder="0"
                allow="autoplay; encrypted-media; fullscreen" allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, color }) => (
  <div style={styles.card} className="card-hover">
    <div style={{...styles.cardIcon, color, background: `${color}15`}}>{icon}</div>
    <h3 style={styles.cardTitle}>{title}</h3>
    <p style={styles.cardDesc}>{desc}</p>
  </div>
);

const styles = {
  container: {
    fontFamily: "'Inter', sans-serif",
    minHeight: '100vh',
    background: '#FFFFFF',
    color: '#0F172A',
    display: 'flex',
    flexDirection: 'column',
  },
  navbar: {
    padding: '15px 0',
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    borderBottom: '1px solid #F1F5F9'
  },
  navContent: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoContainer: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoIcon: {
    width: '35px', height: '35px', background: '#4F46E5', color: 'white',
    borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  logoText: { fontWeight: '800', fontSize: '1.2rem', letterSpacing: '-0.5px' },
  logoSubText: { fontWeight: '600', fontSize: '1.2rem', color: '#64748B', marginLeft: '4px' },
  navLoginBtn: {
    textDecoration: 'none', color: '#4F46E5', fontWeight: '600', padding: '8px 16px',
    borderRadius: '8px', background: 'rgba(79, 70, 229, 0.08)', transition: '0.2s'
  },
  main: {
    maxWidth: '1100px', margin: '0 auto', padding: '80px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
  },
  heroContent: { maxWidth: '800px', marginBottom: '60px' },
  badgeContainer: {
    display: 'inline-flex', gap: '8px', marginBottom: '20px', padding: '6px 12px',
    background: '#F1F5F9', borderRadius: '20px', border: '1px solid #E2E8F0'
  },
  badge: { color: '#4F46E5', fontSize: '0.75rem', fontWeight: '700' },
  badgeVersion: { color: '#64748B', fontSize: '0.75rem', fontWeight: '600' },
  title: { fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: '800', lineHeight: '1.1', marginBottom: '20px' },
  titleHighlight: { color: '#4F46E5' },
  titleSub: { color: '#64748B' },
  subtitle: { fontSize: '1.1rem', color: '#64748B', lineHeight: '1.6', marginBottom: '40px' },
  buttonGroup: { display: 'flex', gap: '15px', justifyContent: 'center' },
  primaryBtn: {
    background: '#25D366', color: 'white', padding: '15px 30px', borderRadius: '12px',
    textDecoration: 'none', display: 'flex', alignItems: 'center', transition: '0.3s'
  },
  secondaryBtn: {
    background: 'white', color: '#1E293B', padding: '15px 30px', borderRadius: '12px',
    border: '1px solid #E2E8F0', cursor: 'pointer', transition: '0.3s'
  },
  btnContent: { display: 'flex', flexDirection: 'column', textAlign: 'left' },
  btnMain: { fontWeight: '700', fontSize: '1rem' },
  btnSub: { fontSize: '0.75rem', opacity: 0.9 },
  featuresGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', width: '100%'
  },
  card: {
    background: 'white', padding: '30px', borderRadius: '20px', textAlign: 'left',
    border: '1px solid #F1F5F9', transition: '0.3s'
  },
  cardIcon: {
    width: '50px', height: '50px', borderRadius: '12px', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '20px'
  },
  cardTitle: { fontSize: '1.2rem', fontWeight: '700', marginBottom: '10px' },
  cardDesc: { color: '#64748B', fontSize: '0.95rem' },
  footer: { padding: '40px', borderTop: '1px solid #F1F5F9', textAlign: 'center' },
  footerText: { color: '#94A3B8', fontSize: '0.9rem' },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(5px)'
  },
  modalContent: { width: '90%', maxWidth: '800px', background: '#000', borderRadius: '15px', overflow: 'hidden' },
  modalHeader: { padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' },
  videoWrapper: { width: '100%', aspectRatio: '16/9' }
};

export default LandingPage;