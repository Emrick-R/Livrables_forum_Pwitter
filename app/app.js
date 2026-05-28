/*
 * On configure ici le serveur Express principal.
 * On définit les middlewares, les routes HTML et les routes API.
 * On lance le serveur sur le port défini.
 */
// On charge les variables d'environnement du fichier .env
// Sans ça, process.env.CLEJWT serait undefined et l'authentification serait cassée
require('dotenv').config()

// On importe Express et on crée l'application
const express = require('express')
const app = express()
// Port sur lequel l'application se connecte
const port = 8080

// On importe path pour construire les chemins de fichiers
// node: est le préfixe moderne pour les modules natifs Node.js
const path = require('node:path')

// On importe cors pour autoriser les requêtes depuis d'autres origines
const cors = require('cors')

// On importe express-rate-limit pour protéger l'API contre les abus
const rateLimit = require('express-rate-limit')

// ===== RATE LIMIT =====
// On configure un limiteur de requêtes pour protéger toutes les routes /api
const limiteurAPI = rateLimit({
    // On définit une fenêtre de 10 minutes (en millisecondes)
    windowMs: 10 * 60 * 1000,
    // On autorise 50 requêtes maximum par fenêtre de 10 minutes par IP
    max: 50,
    // On renvoie ce message si la limite est dépassée
    message: 'Oups ! Trop de requêtes envoyées depuis cette adresse IP. Veuillez réessayer dans 10 minutes.',
    // On envoie le nombre de requêtes restantes dans les headers HTTP modernes
    standardHeaders: true,
    // On désactive les anciens headers — obsolètes et inutiles
    legacyHeaders: false,
})

// ===== MIDDLEWARES =====
// On applique le limiteur sur les routes de la connexion et de l'inscription
app.use('/api/connexion', limiteurAPI)
app.use('/api/inscription', limiteurAPI)

// On autorise toutes les origines — à restreindre en production
app.use(cors({ origin: '*' }))

// On permet à Express de lire le JSON envoyé dans le body des requêtes POST
app.use(express.json())

// On sert tous les fichiers statiques (CSS, JS, images) depuis frontend/static
// Express les rend accessibles via leur chemin depuis la racine ex: /css/main.css
// Exemple: app.use(express.static(path.join(__dirname, 'frontend/static')))

// ===== ROUTES HTML =====
// On écoute les GET sur chaque URL et on renvoie le fichier HTML correspondant
// path.join gère les différences de séparateurs entre Windows (\) et Mac/Linux (/)

// On sert la page d'accueil
// Exemple: app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'frontend/views/index.html')))

// ===== ROUTES API =====
// On importe et branche le router des utilisateurs sur /api
// Toutes les routes d'utilisateurRouter seront préfixées par /api
const utilisateurRouter = require('./backend/router/utilisateur')
app.use('/api', utilisateurRouter)

// On importe et branche le router des topics sur /api
// Toutes les routes de topicRouter seront préfixées par /api
const topicRouter = require('./backend/router/topic')
app.use('/api', topicRouter)

// On importe et branche le router des messages sur /api
// Toutes les routes de messageRouter seront préfixées par /api
const messageRouter = require('./backend/router/message')
app.use('/api', messageRouter)

// On importe et branche le router des tags sur /api
// Toutes les routes de tagRouter seront préfixées par /api
const tagRouter = require('./backend/router/tag')
app.use('/api', tagRouter)

// On importe et branche le router des admins sur /api
// Toutes les routes d'adminRouter' seront préfixées par /api
const adminRouter = require('./backend/router/admin')
app.use('/api', adminRouter)

// ===== GESTIONNAIRE 404 =====
// On place ce gestionnaire en dernier — Express parcourt toutes les routes dans l'ordre
// Si aucune route ne correspond à l'URL demandée, on renvoie la page d'erreur
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/pages/erreur.html'))
})

// ===== LANCEMENT DU SERVEUR =====
// On démarre le serveur et on affiche l'URL dans le terminal
app.listen(port, () => {
    console.log(`Serveur lancé sur le port : http://localhost:${port}`)
})