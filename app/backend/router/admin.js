/*
 * On définit ici toutes les routes liées aux messages.
 * On fait le lien entre les URLs et les fonctions du controller message.
 * On n'écrit pas de logique ici — on se contente de brancher les routes.
 */

// On importe Express pour pouvoir créer un router
const express = require('express')
const router = express.Router()

// express.Router() — crée un mini Express dédié uniquement aux routes admin
// Permet de séparer les routes dans des fichiers distincts plutôt que tout mettre dans app.js
const admin = require('../controller/admin')
const { verifierJWT, isAdmin } = require('../middleware/auth')

// On branche GET /api/admin/topics → liste tous les topics (tous états confondus)
router.get('/admin/topics', verifierJWT, isAdmin, admin.getAdmTopics)

// On branche PATCH /api/admin/topic/:id/status → modifier l'état d'un topic
router.patch('/admin/topic/:id/status', verifierJWT, isAdmin, admin.patchAdmTopicStatus)

// On branche DELETE /api/admin/topic/:id → supprimer un topic
router.delete('/admin/topic/:id', verifierJWT, isAdmin, admin.deleteAdmTopicById)

// On branche DELETE /api/admin/message/:id → supprimer un message
router.delete('/admin/message/:id', verifierJWT, isAdmin, admin.deleteAdmMessageById)

// On branche GET /api/admin/users → liste tous les utilisateurs
router.get('/admin/users', verifierJWT, isAdmin, admin.getAdmUsers)

// On branche POST /api/admin/user/:id/ban → bannir un utilisateur
router.post('/admin/user/:id/ban', verifierJWT, isAdmin, admin.postBanUser)

// On branche DELETE /api/admin/user/:id/ban → débannir un utilisateur
router.delete('/admin/user/:id/ban', verifierJWT, isAdmin, admin.deleteBanUser)

// On exporte le router avec toutes ses routes
// app.js l'importe via require et le branche sur /api via app.use('/api', adminRouter)
module.exports = router