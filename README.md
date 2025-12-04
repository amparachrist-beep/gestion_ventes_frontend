# 📊 Sales Management SaaS - Application de Gestion de Ventes

Application web SaaS de gestion de ventes 100% web (PWA mobile-friendly) avec fonctionnalités offline-first.

## 🚀 Fonctionnalités principales

- ✅ **Mode Offline** : Enregistrement des ventes hors ligne avec synchronisation automatique
- 📱 **PWA Mobile-First** : Application installable sur mobile et desktop
- 🔐 **Authentification JWT** : Sécurité avec tokens d'accès et de rafraîchissement
- 💳 **Système SaaS** : Essai gratuit 7 jours + plans payants (STANDARD, PREMIUM)
- 👥 **Multi-utilisateurs** : Rôles (admin, gérant, vendeur, caissier)
- 🔄 **Synchronisation** : Sync bidirectionnelle automatique et manuelle
- 📊 **Rapports** : Statistiques de ventes (hebdo/mensuel/annuel)
- 📄 **Exports** : PDF et Excel pour clients et produits
- 💬 **Paiement WhatsApp** : Validation manuelle des abonnements

## 🛠 Stack Technique

### Backend
- Django 4/5
- Django REST Framework
- SimpleJWT (authentification JWT)
- PostgreSQL (production) / SQLite (développement)
- ReportLab & OpenPyXL (exports)

### Frontend
- React 18 + Vite
- React Router
- Axios (API client)
- IndexedDB (idb) pour le stockage offline
- Service Worker (sw.js) pour PWA

## 📁 Structure du projet

```
sales-management-saas/
├── backend/
│   ├── config/          # Configuration Django
│   ├── core/            # Application principale
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── permissions.py
│   │   └── management/commands/
│   ├── requirements.txt
│   └── manage.py
├── frontend/
│   ├── public/
│   │   ├── manifest.json
│   │   └── sw.js
│   ├── src/
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── db.js
│   │   ├── offline_sync.js
│   │   └── components/
│   ├── package.json
│   └── vite.config.js
├── README.md
└── QUICK_START.md
```

## 🚦 Installation rapide

### Prérequis
- Python 3.9+
- Node.js 18+
- Git

### Backend

```bash
cd backend

# Créer environnement virtuel
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Installer dépendances
pip install -r requirements.txt

# Créer fichier .env
cp .env.example .env

# Migrations
python manage.py migrate

# Créer super-admin
python manage.py init_superadmin

# Seed données de test (optionnel)
python manage.py seed_data

# Lancer serveur
python manage.py runserver
```

**Accès admin** : http://localhost:8000/admin/
- Username: `admin`
- Password: `admin123`

### Frontend

```bash
cd frontend

# Installer dépendances
npm install

# Lancer dev server
npm run dev
```

**Application** : http://localhost:5173

## 🔑 Comptes de test

### Super Admin
- Username: `admin`
- Password: `admin123`

### Gérant
- Username: `gerant1`
- Password: `password123`
- Abonnement: Gratuit (7 jours)

## 📡 API Endpoints

### Authentification
- `POST /api/register/` - Inscription
- `POST /api/token/` - Connexion (obtenir tokens)
- `POST /api/token/refresh/` - Rafraîchir token

### Ressources
- `GET/POST /api/produits/` - Produits
- `GET /api/produits/offline/` - Téléchargement produits offline
- `GET/POST /api/ventes/` - Ventes
- `POST /api/sync/` - Synchronisation ventes offline
- `GET/POST /api/clients/` - Clients
- `GET /api/abonnements/current/` - Abonnement actuel
- `POST /api/demandes-paiement/` - Demander abonnement
- `GET /api/reports/sales/?period=weekly` - Rapports

### Exports
- `GET /api/exports/clients/?format=pdf|excel`
- `GET /api/exports/products/?format=pdf|excel`

## 🔄 Synchronisation Offline

L'application utilise IndexedDB pour stocker localement :
- Produits
- Clients
- Ventes non synchronisées

### Workflow
1. **Mode Offline** : Les ventes sont enregistrées localement
2. **Décrément immédiat** : Le stock local est mis à jour instantanément
3. **Sync automatique** : Toutes les 15 minutes si en ligne
4. **Sync manuelle** : Bouton "Synchroniser maintenant"
5. **Résolution conflits** : Le serveur a priorité sur le stock

## 💳 Système d'abonnement

### Essai Gratuit
- **Durée** : 7 jours
- **Quotas** : 2 utilisateurs, 1 boutique
- **Activation** : Automatique à l'inscription gérant

### Plans Payants

#### STANDARD (1 mois)
- 5 utilisateurs max
- 2 boutiques max
- Support email

#### PREMIUM (1 mois)
- 20 utilisateurs max
- 5 boutiques max
- Support prioritaire

### Processus de paiement
1. Gérant choisit un plan
2. Création `DemandePaiement` (statut: EN_ATTENTE)
3. Notification envoyée au super-admin
4. Redirection WhatsApp pour paiement manuel
5. Admin confirme → Abonnement activé

## 🔐 Sécurité

- JWT avec tokens courts (60 min) et refresh (7 jours)
- CORS strict en production
- Permissions basées sur les rôles
- Vérification ownership des ressources
- Webhooks signés (prévu)

## 🚀 Déploiement

### Variables d'environnement (.env)

```env
SECRET_KEY=your-secret-key
DEBUG=False
DATABASE_URL=postgresql://user:pass@host:5432/dbname
CORS_ALLOWED_ORIGINS=https://yourdomain.com
WHATSAPP_NUMBER=+242064000000
ADMIN_EMAIL=admin@yourdomain.com
```

### Build Frontend

```bash
cd frontend
npm run build
```

Les fichiers sont générés dans `frontend/dist/`

### Collectstatic Django

```bash
python manage.py collectstatic --noinput
```

### Déploiement recommandé
- **Backend** : Heroku, Render, DigitalOcean App Platform
- **Frontend** : Vercel, Netlify
- **Base de données** : PostgreSQL (Heroku Postgres, Railway, Supabase)

## 📱 Installation PWA

1. Ouvrir l'application dans Chrome/Edge/Safari
2. Cliquer sur "Installer l'application" ou menu ⋮ > "Installer"
3. L'app s'ajoute à l'écran d'accueil

## 🧪 Tests

```bash
# Backend tests
cd backend
pytest

# Frontend (à implémenter)
cd frontend
npm test
```

## 📚 Documentation complète

Voir [QUICK_START.md](QUICK_START.md) pour un guide détaillé.

## 🤝 Support

Pour toute question ou problème :
- Email: admin@salesmanagement.local
- WhatsApp: +242064000000

## 📄 Licence

Propriétaire - Tous droits réservés

---

Développé avec ❤️ pour la gestion de ventes en Afrique