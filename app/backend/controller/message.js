/*
 * On gère ici toute la logique métier liée aux messages des topics.
 *
 */

// On importe la connexion à la base de données
const db = require('../database/connexiondb.js')
// On importe jsonwebtoken pour créer et signer les jetons d'authentification
const jwt = require('jsonwebtoken')

// ===== POST /api/message =====
// créer un message
exports.postMessage = async (req, res) => {

}

// ===== POST /api/message/:id/like =====
// liker ou disliker un message
exports.postLike = async (req, res) => {

}

// ===== DELETE /api/message/:id/like =====
// annuler son like/dislike
exports.deleteLike = async (req, res) => {

}

// ===== PUT /api/message/:id =====
// modifier le corps (propriétaire ou admin)
exports.putMessageById = async (req, res) => {

}

// ===== DELETE /api/message/:id =====
// supprimer un message
exports.deleteMessageById = async (req, res) => {

}
