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
const topic = require('../controller/admin')
const { verifierJWT, isAdmin } = require('../middleware/auth')

// On branche GET /api/admin/topics → liste tous les topics (tous états confondus)
router.get('/api/admin/topics', verifierJWT, isAdmin, topic.getAdmTopics)

// On branche PATCH /api/admin/topic/:id/status → modifier l'état d'un topic
router.post('/api/admin/topic/:id/status', verifierJWT, isAdmin, topic.patchAdmTopicStatus)

// On branche DELETE /api/admin/topic/:id → supprimer un topic
router.delete('/api/admin/topic/:id', verifierJWT, isAdmin, topic.deleteAdmTopicById)

// On branche DELETE /api/admin/message/:id → supprimer un message
router.delete('/api/admin/message/:id', verifierJWT, isAdmin, topic.deleteAdmMessageById)

// On branche GET /api/admin/users → liste tous les utilisateurs
router.get('/api/admin/users', verifierJWT, isAdmin, topic.getAdmUsers)

// On branche POST /api/admin/user/:id/ban → bannir un utilisateur
router.post('/api/admin/users/:id/ban', verifierJWT, isAdmin, topic.postBanUser)

// On branche DELETE /api/admin/user/:id/ban → débannir un utilisateur
router.delete('/api/admin/user/:id/ban', verifierJWT, isAdmin, topic.deleteBanUser)

// On exporte le router avec toutes ses routes
// app.js l'importe via require et le branche sur /api via app.use('/api', utilisateurRouter)
module.exports = router