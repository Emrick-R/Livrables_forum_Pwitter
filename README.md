# Pwitter

Forum de discussion entre utilisateurs développé en Node.js / Express / MySQL.

## Fonctionnalités

**Utilisateurs** — inscription, connexion par email ou username, authentification via JWT.

**Topics** — création, modification, suppression, changement d'état (ouvert, fermé, archivé), système de tags, score de popularité (like/dislike).

**Messages** — réponses dans les topics, modification, suppression, score de popularité (like/dislike).

**Administration** — dashboard admin avec gestion des topics (état, suppression), des messages (suppression), et des utilisateurs (bannissement, débannissement).

**Sécurité** — hashage bcrypt des mots de passe, tokens JWT signés et expirants, requêtes SQL préparées contre les injections, rate limiting sur les routes sensibles, middlewares de vérification des droits.

## Stack technique

| Rôle | Technologie |
|------|-------------|
| Langage | JavaScript (Node.js) |
| Framework | Express |
| Base de données | MySQL |
| Requêtes SQL | mysql2 |
| Authentification | jsonwebtoken (JWT) |
| Hashage | bcrypt |
| Protection | express-rate-limit, cors |
| Environnement local | MAMP |

## Structure du projet

```
app/
├── app.js                        ← Point d'entrée du serveur
├── .env                          ← Variables d'environnement
├── package.json
│
├── backend/
│   ├── controller/
│   │   ├── utilisateur.js        ← Inscription, connexion, profil
│   │   ├── topic.js              ← CRUD topics, likes, tags
│   │   ├── message.js            ← CRUD messages, likes
│   │   ├── tag.js                ← Gestion des tags
│   │   └── admin.js              ← Dashboard admin
│   ├── router/
│   │   ├── utilisateur.js
│   │   ├── topic.js
│   │   ├── message.js
│   │   ├── tag.js
│   │   └── admin.js
│   ├── middleware/
│   │   └── auth.js               ← verifierJWT, isAdmin, verifierJWTOptionnel
│   └── database/
│       └── connexiondb.js        ← Pool de connexion MySQL
│
└── frontend/
    ├── page/
    │   ├── index.html
    │   ├── connexion.html
    │   ├── inscription.html
    │   ├── topic.html
    │   ├── admin.html
    │   ├── create-topic.html
    │   ├── edit-topic.html
    │   └── erreur.html
    └── static/
        ├── js/
        │   ├── api.js
        │   ├── auth.js
        │   ├── theme.js
        │   ├── index.js
        │   ├── login.js
        │   ├── register.js
        │   ├── topic.js
        │   ├── admin.js
        │   ├── create-topic.js
        │   └── edit-topic.js
        ├── css/
        │   └── style.css
        └── assets/
```

## Installation

### Prérequis

- Node.js (LTS)
- MAMP (ou tout environnement MySQL local)

### Étapes

1. Cloner le projet et se placer dans le dossier :
```bash
cd app
```

2. Installer les dépendances :
```bash
npm install
```

3. Créer le fichier `.env` à la racine de `app/` :
```env
DB_HOST=localhost
DB_PORT=8889
DB_USER=root
DB_PASSWORD=root
DB_NAME=pwitter
CLEJWT=votre_cle_secrete_generee
```

Pour générer la clé JWT :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

4. Lancer MAMP et créer la base de données `pwitter` dans phpMyAdmin.

5. Exécuter le script SQL de création des tables puis le script d'insertion des données de test.

6. Lancer le serveur :
```bash
npm run dev
```

7. Ouvrir `http://localhost:8080` dans le navigateur.

## Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@pwitter.com | Admin1234 |
| Utilisateur | u1@mail.com | User1234 |
| Utilisateur | u2@mail.com | User1234 |
| Utilisateur (banni) | u3@mail.com | User1234 |

## Routes API

### Utilisateur

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | /api/inscription | Non | Créer un compte |
| POST | /api/connexion | Non | Se connecter |
| GET | /api/utilisateur/topics | JWT | Mes topics |
| GET | /api/utilisateur/:id | Non | Profil d'un utilisateur |
| GET | /api/utilisateur/:id/topics | Non | Topics d'un utilisateur |

### Topics

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | /api/topics | Non | Liste des topics |
| GET | /api/topic/:id | Optionnel | Détail d'un topic |
| GET | /api/topic/:id/tags | Non | Tags d'un topic |
| GET | /api/topic/:id/messages | Optionnel | Messages d'un topic |
| POST | /api/topic | JWT | Créer un topic |
| POST | /api/topic/:id/like | JWT | Liker/disliker un topic |
| DELETE | /api/topic/:id/like | JWT | Annuler son vote |
| PUT | /api/topic/:id | JWT | Modifier un topic |
| PATCH | /api/topic/:id/status | JWT | Modifier le statut |
| DELETE | /api/topic/:id | JWT | Supprimer un topic |

### Messages

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | /api/message | JWT | Créer un message |
| POST | /api/message/:id/like | JWT | Liker/disliker un message |
| DELETE | /api/message/:id/like | JWT | Annuler son vote |
| PUT | /api/message/:id | JWT | Modifier un message |
| DELETE | /api/message/:id | JWT | Supprimer un message |

### Tags

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | /api/tags | Non | Liste des tags |
| POST | /api/tags | JWT | Créer un tag |
| DELETE | /api/tags/:id | Admin | Supprimer un tag |

### Admin

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | /api/admin/topics | Admin | Tous les topics |
| PATCH | /api/admin/topic/:id/status | Admin | Modifier le statut |
| DELETE | /api/admin/topic/:id | Admin | Supprimer un topic |
| DELETE | /api/admin/message/:id | Admin | Supprimer un message |
| GET | /api/admin/users | Admin | Liste des utilisateurs |
| POST | /api/admin/user/:id/ban | Admin | Bannir un utilisateur |
| DELETE | /api/admin/user/:id/ban | Admin | Débannir un utilisateur |

## Flux d'une requête

```
Navigateur → fetch('/api/topics')
    → app.js → app.use('/api', topicRouter)
        → router/topic.js → middleware verifierJWT (si nécessaire)
            → controller/topic.js → db.query(SQL)
                → MySQL → retourne les résultats
            ← res.status(200).json({ topics })
        ← Navigateur reçoit le JSON
```

## Choix techniques

**JavaScript plutôt que Go** — cohérence front/back, écosystème npm riche, maîtrise de l'équipe, suffisant pour l'échelle du projet.

**MySQL** — imposé par le cahier des charges. Nos données sont relationnelles (users → topics → messages → likes), MySQL gère nativement les clés étrangères et les contraintes d'intégrité.

**mysql2 plutôt que Prisma** — maîtrise existante via un projet précédent, contrôle total sur les requêtes SQL, requêtes préparées sécurisées. Prisma aurait apporté le typage automatique et les migrations, identifié comme axe d'amélioration.

**bcrypt plutôt que SHA-256** — bcrypt est conçu pour le hashage de mots de passe (volontairement lent, salt intégré, configurable). SHA-256 est trop rapide et vulnérable au brute-force.

## Équipe

| Membre | Rôle |
|--------|------|
| Emrick | Backend (API, base de données, sécurité) |
| Binôme | Frontend (HTML, CSS, JavaScript client) |