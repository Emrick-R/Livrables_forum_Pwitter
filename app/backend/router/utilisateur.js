/*
 * On définit ici toutes les routes liées aux utilisateurs.
 * On fait le lien entre les URLs et les fonctions du controller utilisateur.
 * On n'écrit pas de logique ici — on se contente de brancher les routes.
 */

// On importe Express pour pouvoir créer un router
const express = require('express')
const router = express.Router()

// express.Router() — crée un mini Express dédié uniquement aux routes utilisateur
// Permet de séparer les routes dans des fichiers distincts plutôt que tout mettre dans app.js
const utilisateur = require('../controller/utilisateur')
const { verifierJWT} = require('../middleware/auth')

// On branche POST /api/inscription → crée un nouveau compte client
// On passe la référence de la fonction — Express l'appellera au bon moment
// utilisateur.inscrireClient   | référence — s'exécute quand la route est appelée
// utilisateur.inscrireClient() | résultat  — s'exécuterait au démarrage du serveur.
router.post('/inscription', utilisateur.inscrireClient)

// On branche POST /api/connexion → vérifie les credentials et retourne un token JWT
router.post('/connexion', utilisateur.connecterClient)

// On branche GET /api/utilisateur/topics → retourne les topics de l'user connecté selon le token JWT
router.get('/utilisateur/topics', verifierJWT, utilisateur.getMesTopics)

// On branche GET /api/utilisateur/:id/ → retourne un utilisateur par son ID
router.get('/api/utilisateur/:id/', utilisateur.getUtilisateurById)

// On branche GET /api/utilisateur/:id/topics → retourne les topics d'un autre utilisateur
router.get('/api/utilisateur/:id/topics', utilisateur.getUtilisateurTopics)


// On exporte le router avec toutes ses routes
// app.js l'importe via require et le branche sur /api via app.use('/api', utilisateurRouter)
module.exports = router