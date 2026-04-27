/*
 * On définit ici toutes les routes liées aux utilisateurs.
 * On fait le lien entre les URLs et les fonctions du controller utilisateur.
 * On n'écrit pas de logique ici — on se contente de brancher les routes.
 */

const express = require('express')
const router = express.Router()

// On importe le controller qui contient toute la logique métier
const utilisateur = require('../controller/utilisateur')

// On branche POST /api/inscription → inscrit un nouveau client
router.post('/inscription', utilisateur.inscrireClient)

// On branche POST /api/connexion → connecte un client existant
router.post('/connexion', utilisateur.connecterClient)

module.exports = router