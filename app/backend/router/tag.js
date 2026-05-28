/*
 * On définit ici toutes les routes liées aux tags.
 * On fait le lien entre les URLs et les fonctions du controller tag.
 * On n'écrit pas de logique ici — on se contente de brancher les routes.
 */

// On importe Express pour pouvoir créer un router
const express = require('express')
const router = express.Router()

// express.Router() — crée un mini Express dédié uniquement aux routes tag
// Permet de séparer les routes dans des fichiers distincts plutôt que tout mettre dans app.js
const tag = require('../controller/tag')
const {verifierJWT, isAdmin} = require('../middleware/auth')

// On branche GET /api/tags → retourne la liste tous les tags
router.get('/tags', tag.getTags)

// On branche POST /api/tags → créer un tag
router.post('/tags', verifierJWT, tag.postTag)

// On branche DELETE /api/tags/:id → supprimer un tag (admin uniquement)
router.delete('/tags/:id', verifierJWT, isAdmin, tag.deleteTagById)

// On exporte le router avec toutes ses routes
// app.js l'importe via require et le branche sur /api via app.use('/api', tagRouter)
module.exports = router