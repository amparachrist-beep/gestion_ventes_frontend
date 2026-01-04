import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  // --- CONFIGURATION ---
  const PHONE_NUMBER = "242061814279"; // Ton numéro
  const YOUTUBE_VIDEO_ID = "YlEo5xYIKEw"; // Remplace par l'ID de ta vidéo YouTube (ex: la partie après ?v=)

  // --- STATE ---
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  // --- LOGIQUE WHATSAPP ---
  const message = encodeURIComponent("Bonjour, je souhaite créer un compte Gérant pour tester Hitch-Ventes (Essai gratuit 7 jours).");
  const whatsappUrl = `https://wa.me/${PHONE_NUMBER}?text=${message}`;

  return (
    <div style={styles.container}>
      {/* --- NAVBAR --- */}
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <div style={styles.logoContainer}>
            <div style={styles.logoIcon}>H</div>
            <span style={styles.logoText}>Hitch-Ventes</span>
          </div>
          <Link to="/login" style={styles.navLoginBtn}>
            Espace Client
          </Link>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main style={styles.main}>
        <div style={styles.heroContent}>
          <div style={styles.badge}>✨ Nouveau : Version 2.0 disponible</div>

          <h1 style={styles.title}>
            Gérez votre boutique <br />
            <span style={styles.gradientText}>simplement & sans internet.</span>
          </h1>

          <p style={styles.subtitle}>
            La solution de caisse tout-en-un pour les commerçants ambitieux.
            Encaissez, gérez vos stocks et suivez vos ventes, même hors ligne.
          </p>

          <div style={styles.buttonGroup}>
            {/* Bouton WhatsApp (Principal) */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.primaryBtn}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: 8}}>
                <path d="M17.472 14.382C17.112 14.162 15.341 13.064 15.006 12.956C14.676 12.846 14.433 12.791 14.194 13.125C13.951 13.46 13.266 14.162 13.06 14.417C12.85 14.665 12.641 14.706 12.281 14.545C11.921 14.382 10.763 14.053 9.387 13.011C8.297 12.185 7.563 11.168 7.35 10.835C7.14 10.505 7.33 10.339 7.51 10.186C7.67 10.05 7.865 9.832 8.046 9.645C8.226 9.462 8.286 9.317 8.406 9.102C8.526 8.887 8.466 8.694 8.406 8.56C8.346 8.425 7.865 7.426 7.668 7.025C7.464 6.634 7.265 6.689 7.09 6.689C6.929 6.689 6.743 6.685 6.557 6.685C6.371 6.685 6.066 6.745 5.82 6.983C5.575 7.22 4.88 7.787 4.88 8.941C4.88 10.096 5.906 11.213 6.056 11.388C6.206 11.564 8.1 14.135 10.999 15.186C13.899 16.237 13.899 15.86 14.415 15.86C14.93 15.86 16.075 15.32 16.31 14.757C16.545 14.195 16.545 13.714 16.485 13.58C16.425 13.445 16.185 13.38 15.825 13.245H17.472V14.382Z" fill="currentColor"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M12 21.75C16.9706 21.75 21 17.7206 21 12.75C21 7.77944 16.9706 3.75 12 3.75C7.02944 3.75 3 7.77944 3 12.75C3 14.4251 3.45688 15.9934 4.26297 17.3463L3.2384 21.1895L7.27218 20.218C8.68119 21.2053 10.2922 21.75 12 21.75ZM12 23.25C10.0468 23.25 8.21148 22.668 6.67131 21.6661L1.5 22.95L2.8596 18.0673C1.69171 16.5363 1 14.7126 1 12.75C1 6.67487 5.92487 1.75 12 1.75C18.0751 1.75 23 6.67487 23 12.75C23 18.8251 18.0751 23.25 12 23.25Z" fill="currentColor"/>
              </svg>
              Essai Gratuit (7 jours)
            </a>

            {/* Bouton Démo (Secondaire) */}
            <button onClick={() => setIsVideoOpen(true)} style={styles.secondaryBtn}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: 8}}>
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 8L16 12L10 16V8Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Voir la démo
            </button>
          </div>
        </div>

        {/* --- FEATURES GRID --- */}
        <div style={styles.featuresGrid}>
          <FeatureCard
            icon="⚡"
            title="100% Offline"
            desc="Continuez à vendre même sans connexion internet. Synchronisation automatique."
          />
          <FeatureCard
            icon="👥"
            title="Multi-Utilisateurs"
            desc="Gérez vos vendeurs et caissiers avec des permissions adaptées."
          />
          <FeatureCard
            icon="📈"
            title="Stocks & Rapports"
            desc="Visualisez votre chiffre d'affaires et l'état de vos stocks en temps réel."
          />
        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer style={styles.footer}>
        <p>© 2024 Hitch-Ventes SaaS. Fait avec ❤️ à Brazzaville.</p>
      </footer>

      {/* --- VIDEO MODAL --- */}
      {isVideoOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsVideoOpen(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setIsVideoOpen(false)}>×</button>
            <div style={styles.videoWrapper}>
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1`}
                title="Démo Hitch-Ventes"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPOSANT CARTE AVANTAGE ---
const FeatureCard = ({ icon, title, desc }) => (
  <div style={styles.card}>
    <div style={styles.cardIcon}>{icon}</div>
    <h3 style={styles.cardTitle}>{title}</h3>
    <p style={styles.cardDesc}>{desc}</p>
  </div>
);

// --- STYLES CSS-IN-JS MODERNES ---
const styles = {
  container: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f9fafb 0%, #eff6ff 100%)',
    color: '#111827',
    display: 'flex',
    flexDirection: 'column',
  },
  navbar: {
    padding: '20px 0',
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    borderBottom: '1px solid rgba(0,0,0,0.05)'
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    background: '#4f46e5',
    color: 'white',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '18px'
  },
  logoText: {
    fontWeight: '800',
    fontSize: '1.25rem',
    color: '#1f2937',
    letterSpacing: '-0.5px'
  },
  navLoginBtn: {
    textDecoration: 'none',
    color: '#4f46e5',
    fontWeight: '600',
    fontSize: '0.95rem',
    padding: '8px 16px',
    borderRadius: '8px',
    transition: 'background 0.2s',
    ':hover': { background: '#eef2ff' }
  },
  main: {
    flex: 1,
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  badge: {
    background: '#eef2ff',
    color: '#4f46e5',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '24px',
    display: 'inline-block'
  },
  heroContent: {
    maxWidth: '800px',
    marginBottom: '60px'
  },
  title: {
    fontSize: '3.5rem',
    fontWeight: '900',
    lineHeight: '1.1',
    marginBottom: '24px',
    letterSpacing: '-1.5px',
    color: '#111827'
  },
  gradientText: {
    background: 'linear-gradient(to right, #4f46e5, #9333ea)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1.25rem',
    color: '#6b7280',
    marginBottom: '40px',
    lineHeight: '1.6',
    maxWidth: '600px',
    marginLeft: 'auto',
    marginRight: 'auto'
  },
  buttonGroup: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    background: '#25D366', // Vert WhatsApp
    color: 'white',
    padding: '16px 32px',
    borderRadius: '12px',
    fontWeight: '600',
    textDecoration: 'none',
    fontSize: '1.1rem',
    boxShadow: '0 10px 25px -5px rgba(37, 211, 102, 0.4)',
    transition: 'transform 0.2s',
    cursor: 'pointer'
  },
  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    background: 'white',
    color: '#374151',
    border: '1px solid #e5e7eb',
    padding: '16px 32px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '1.1rem',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.2s',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
    width: '100%',
    maxWidth: '1100px',
    marginBottom: '40px'
  },
  card: {
    background: 'white',
    padding: '30px',
    borderRadius: '24px',
    textAlign: 'left',
    boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.05)',
    border: '1px solid rgba(0,0,0,0.03)',
    transition: 'transform 0.2s',
  },
  cardIcon: {
    fontSize: '2.5rem',
    marginBottom: '16px',
    background: '#f3f4f6',
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '16px'
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '8px',
    color: '#111827'
  },
  cardDesc: {
    color: '#6b7280',
    lineHeight: '1.5'
  },
  footer: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#9ca3af',
    fontSize: '0.9rem',
    borderTop: '1px solid #e5e7eb'
  },
  // Styles Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  modalContent: {
    position: 'relative',
    width: '100%',
    maxWidth: '900px',
    aspectRatio: '16/9',
    backgroundColor: 'black',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  closeBtn: {
    position: 'absolute',
    top: '-40px',
    right: '-10px',
    background: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '32px',
    cursor: 'pointer',
    padding: '10px'
  },
  videoWrapper: {
    width: '100%',
    height: '100%'
  }
};

export default LandingPage;