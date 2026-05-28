/*
 * On définit ici toutes les routes liées aux tags.
 * On fait le lien entre les URLs et les fonctions du controller tag.
 * On n'écrit pas de logique ici — on se contente de brancher les routes.
 */

// On importe Express pour pouvoir créer un router
const express = require('express')
const router = express.Router()

// express.Router() — crée un mini Express dédié uniquement aux routes utilisateur
// Permet de séparer les routes dans des fichiers distincts plutôt que tout mettre dans app.js
const topic = require('../controller/tag')

// On branche GET /api/tags → retourne la liste tous les tags
router.get('/api/tags', topic.getTags)

// On branche POST /api/tags → créer un tag
router.post('/api/tags', topic.postTag)

// On branche DELETE /api/tags/:id → supprimer un tag (admin uniquement)
router.delete('/api/tags/:id', topic.deleteTagById)

// On exporte le router avec toutes ses routes
// app.js l'importe via require et le branche sur /api via app.use('/api', utilisateurRouter)
module.exports = router