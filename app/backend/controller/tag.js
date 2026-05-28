/*
 * On gère ici toute la logique métier liée aux topics et aux tags.
 *
 */

// On importe la connexion à la base de données
const db = require('../database/connexiondb.js')
// On importe jsonwebtoken pour créer et signer les jetons d'authentification
const jwt = require('jsonwebtoken')

// ===== GET /api/tags =====
// liste tous les tags
exports.getTags = async (req, res) => {

}

// ===== POST /api/tags =====
// créer un tag
exports.postTag = async (req, res) => {

}

// ===== DELETE /api/tags/:id =====
// supprimer un tag (admin uniquement)
exports.deleteTagById = async (req, res) => {

}
