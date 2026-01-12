// src/components/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(username, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || "Identifiants invalides");
      }
    } catch (err) {
      setError("Une erreur réseau est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.authContainer}>
      {/* Injection CSS pour forcer le centrage et la responsivité */}
      <style>
        {`
          /* Reset de base pour cette page */
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
          }

          .input-field:focus {
            border-color: #4F46E5 !important;
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1) !important;
            outline: none;
          }

          .login-btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
          }

          /* Gestion Responsive */
          @media (max-width: 480px) {
            .auth-card {
              width: 95% !important;
              padding: 30px 20px !important;
              margin: 10px !important;
            }
            .logo-text {
              font-size: 1.1rem !important;
            }
          }

          /* Animation d'apparition */
          .auth-card {
            animation: fadeIn 0.5s ease-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      <div style={styles.authCard} className="auth-card">
        {/* Header du formulaire */}
        <div style={styles.header}>
          <Link to="/" style={styles.backLink}>
            ← Retour à l'accueil
          </Link>
          <div style={styles.logoContainer}>
            <div style={styles.logoIcon}>H</div>
            <h1 style={styles.logoText} className="logo-text">HITCH-VENTES</h1>
          </div>
          <p style={styles.subtitle}>Espace de gestion sécurisé</p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div style={styles.errorBox}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: 10, flexShrink: 0}}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nom d'utilisateur</label>
            <input
              type="text"
              className="input-field"
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="votre_nom"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Mot de passe</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                className="input-field"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.showPasswordBtn}
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-btn"
            style={{
              ...styles.submitBtn,
              backgroundColor: loading ? '#9CA3AF' : '#4F46E5',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            disabled={loading}
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Besoin d'un compte ? <br />
            <a href="https://wa.me/242061814279" target="_blank" rel="noreferrer" style={styles.supportLink}>Contactez l'administrateur</a>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  authContainer: {
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',      // Centrage vertical
    justifyContent: 'center',    // Centrage horizontal
    background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
    fontFamily: "'Inter', sans-serif",
    margin: 0,
    padding: '20px',
    boxSizing: 'border-box',    // Important pour éviter les débordements
  },
  authCard: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#FFFFFF',
    padding: '40px',
    borderRadius: '24px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    border: '1px solid #F1F5F9',
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  backLink: {
    display: 'inline-block',
    fontSize: '0.85rem',
    color: '#64748B',
    textDecoration: 'none',
    marginBottom: '20px',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    background: '#4F46E5',
    color: 'white',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#1E293B',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#64748B',
    fontSize: '0.9rem',
    marginTop: '5px'
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #FEE2E2',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#334155',
    paddingLeft: '2px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1.5px solid #E2E8F0',
    fontSize: '1rem',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  showPasswordBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#4F46E5',
    fontSize: '0.7rem',
    fontWeight: '700',
    cursor: 'pointer',
    textTransform: 'uppercase',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    color: 'white',
    border: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    marginTop: '10px',
    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
  },
  footer: {
    marginTop: '30px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.85rem',
    color: '#64748B',
    lineHeight: '1.5'
  },
  supportLink: {
    color: '#4F46E5',
    textDecoration: 'none',
    fontWeight: '600',
  },
};