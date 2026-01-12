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
      {/* Injection CSS pour les effets de focus et le responsive */}
      <style>
        {`
          .input-field:focus {
            border-color: #4F46E5 !important;
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1) !important;
            outline: none;
          }
          .login-btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
          }
          .login-btn:active {
            transform: translateY(0);
          }
          @media (max-width: 480px) {
            .auth-card {
              width: 90% !important;
              padding: 30px 20px !important;
            }
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
            <h1 style={styles.logoText}>HITCH-VENTES</h1>
          </div>
          <p style={styles.subtitle}>Ravis de vous revoir !</p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div style={styles.errorBox}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: 10}}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
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
              placeholder="Ex: gérant_boutique"
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
            {loading ? (
              <span style={styles.loader}>Chargement...</span>
            ) : (
              "Se connecter"
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Besoin d'aide ? <a href="https://wa.me/242061814279" target="_blank" rel="noreferrer" style={styles.supportLink}>Contacter le support</a>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  authContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
    fontFamily: "'Inter', sans-serif",
  },
  authCard: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#FFFFFF',
    padding: '40px',
    borderRadius: '24px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    border: '1px solid #F1F5F9',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  backLink: {
    display: 'block',
    fontSize: '0.85rem',
    color: '#64748B',
    textDecoration: 'none',
    marginBottom: '20px',
    fontWeight: '500',
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
    fontSize: '0.95rem',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '0.9rem',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #FEE2E2',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#334155',
    paddingLeft: '4px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
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
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    color: 'white',
    border: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    marginTop: '10px',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.875rem',
    color: '#64748B',
  },
  supportLink: {
    color: '#4F46E5',
    textDecoration: 'none',
    fontWeight: '600',
  },
};