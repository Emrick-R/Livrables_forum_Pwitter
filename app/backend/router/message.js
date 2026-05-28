/*
 * On définit ici toutes les routes liées aux messages.
 * On fait le lien entre les URLs et les fonctions du controller message.
 * On n'écrit pas de logique ici — on se contente de brancher les routes.
 */

// On importe Express pour pouvoir créer un router
const express = require('express')
const router = express.Router()

// express.Router() — crée un mini Express dédié uniquement aux routes utilisateur
// Permet de séparer les routes dans des fichiers distincts plutôt que tout mettre dans app.js
const topic = require('../controller/message')

// On branche POST /api/message → créer un message
router.post('/api/message', topic.postMessage)

// On branche POST /api/message/:id/like → liker ou disliker un message
router.post('/api/message/:id/like', topic.postLike)

// On branche DELETE /api/message/:id/like → annuler son like/dislike
router.delete('/api/message/:id/like', topic.deleteLike)

// On branche PUT /api/message/:id → modifier le corps (propriétaire ou admin)
router.put('/api/message/:id', topic.putMessageById)

// On branche DELETE /api/message/:id → supprimer un message
router.delete('/api/message/:id', topic.deleteMessageById)

// On exporte le router avec toutes ses routes
// app.js l'importe via require et le branche sur /api via app.use('/api', utilisateurRouter)
module.exports = router