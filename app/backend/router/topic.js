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
const {verifierJWT, verifierJWTOptionnel} = require('../middleware/auth')

// On branche GET /api/topics → retourne la liste de tous les topics
router.get('/topics', topic.getTopics)

// On branche GET /api/topic/:id → retourne le détail d'un topic
router.get('/topic/:id', verifierJWTOptionnel, topic.getTopicById)

// On branche GET /api/topic/:id/tags → retourne les tags d'un topic spécifique
router.get('/topic/:id/tags', topic.getTopicTags)

// On branche GET /api/topic/:id/message → retourne la liste des messages d'un topic spécifique
router.get('/topic/:id/messages', verifierJWTOptionnel, topic.getTopicMessages)

// On branche POST /api/topic → créer un topic
router.post('/topic', verifierJWT, topic.postTopic)

// On branche POST /api/topic/:id/like → liker ou disliker un topic
router.post('/topic/:id/like', verifierJWT, topic.postTopicLikeDislike)

// On branche DELETE /api/topic/:id/like → annuler son like/dislike
router.delete('/topic/:id/like', verifierJWT, topic.deleteTopicLikeDislike)

// On branche PUT /api/topic/:id → modifier titre, corps, tags d'un topic (propriétaire ou admin)
router.put('/topic/:id', verifierJWT, topic.putTopicById)

// On branche PATCH /api/topic/:id/status → modifier uniquement le statut d'un topic (propriétaire ou admin)
router.patch('/topic/:id/status',verifierJWT , topic.patchTopicStatus)

// On branche DELETE /api/topic/:id → supprimer un topic
router.delete('/topic/:id', verifierJWT, topic.deleteTopicById)

// On exporte le router avec toutes ses routes
// app.js l'importe via require et le branche sur /api via app.use('/api', utilisateurRouter)
module.exports = router