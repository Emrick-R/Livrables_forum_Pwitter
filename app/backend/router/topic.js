/*
 * On définit ici toutes les routes liées aux topics.
 * On fait le lien entre les URLs et les fonctions du controller topic.
 * On n'écrit pas de logique ici — on se contente de brancher les routes.
 */

// On importe Express pour pouvoir créer un router
const express = require('express')
const router = express.Router()

// express.Router() — crée un mini Express dédié uniquement aux routes utilisateur
// Permet de séparer les routes dans des fichiers distincts plutôt que tout mettre dans app.js
const topic = require('../controller/topic')

// On branche GET /api/topics → retourne la liste de tous les topics
router.get('/api/topics', topic.getTopics)

// On branche GET /api/topic/:id → retourne le détail d'un topic
router.get('/api/topic/:id', topic.getTopicById)

// On branche GET /api/topic/:id/tags → retourne les tags d'un topic spécifique
router.get('/api/topic/:id/tags', topic.getTopicTags)

// On branche GET /api/topic/:id/message → retourne la liste des messages d'un topic spécifique
router.get('/api/topic/:id/message', topic.getTopicMessages)

// On branche POST /api/topic → créer un topic
router.post('/api/topic', topic.postTopic)

// On branche POST /api/topic/:id/like → liker ou disliker un topic
router.post('/api/topic/:id/like', topic.postLikeDislike)

// On branche DELETE /api/topic/:id/like → annuler son like/dislike
router.delete('/api/topic/:id/like', topic.deleteLikeDislike)

// On branche PUT /api/topic/:id → modifier titre, corps, tags d'un topic (propriétaire ou admin)
router.put('/api/topic/:id', topic.putTopicById)

// On branche PATCH /api/topic/:id/status → modifier uniquement le statut d'un topic (propriétaire ou admin)
router.patch('/api/topic/:id/status', topic.patchTopicStatus)

// On branche DELETE /api/topic/:id → supprimer un topic
router.delete('/api/topic/:id', topic.deleteTopicById)

// On exporte le router avec toutes ses routes
// app.js l'importe via require et le branche sur /api via app.use('/api', utilisateurRouter)
module.exports = router