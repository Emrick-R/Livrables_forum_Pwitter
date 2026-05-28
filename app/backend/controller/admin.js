// On importe la connexion à la base de données
const db = require('../database/connexiondb.js')
// On importe jsonwebtoken pour créer et signer les jetons d'authentification
const jwt = require('jsonwebtoken')

/* Vérif de l'admin dans sur chaque route
const isAdmin = (req, res, next) => {
    if (!req.user.is_admin) {
        return res.status(403).json({ message: 'Accès interdit' })
    }
    next()
}
 */

// ===== GET /api/admin/topics =====
// liste tous les topics (tous états confondus)
exports.getAdmTopics = async (req, res) => {

}

// ===== PATCH /api/admin/topic/:id/status =====
// modifier l'état d'un topic
exports.patchAdmTopicStatus = async (req, res) => {

}

// ===== DELETE /api/admin/topic/:id =====
// supprimer un topic
exports.deleteAdmTopicById = async (req, res) => {

}

// ===== DELETE /api/admin/message/:id =====
// supprimer un message
exports.deleteAdmMessageById = async (req, res) => {

}

// ===== GET /api/admin/users =====
// liste tous les utilisateurs
exports.getAdmUsers = async (req, res) => {

}

// ===== POST /api/admin/user/:id/ban =====
// bannir un utilisateur
exports.postBanUser = async (req, res) => {

}

// ===== DELETE /api/admin/user/:id/ban =====
// débannir un utilisateur
exports.deleteBanUser = async (req, res) => {

}
