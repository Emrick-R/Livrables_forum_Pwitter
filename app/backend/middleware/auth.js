/*
 * On définit ici les middlewares liés à l'authentification et aux autorisations.
 * verifierJWT s'assure que l'utilisateur est bien connecté via son token JWT.
 * isAdmin s'assure que l'utilisateur connecté possède les droits administrateur.
 * Ces middlewares sont branchés dans les routers, jamais de logique métier ici.
 */

const jwt = require('jsonwebtoken')

// ===== MIDDLEWARE : Vérification du JWT =====
// Ce middleware vérifie que l'utilisateur est bien connecté.
// Il est branché sur toutes les routes qui nécessitent d'être authentifié
const verifierJWT = (req, res, next) => {

    // On récupère le token dans le header Authorization
    // Le header ressemble à : "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    // On split sur l'espace pour ne récupérer que la partie après "Bearer "
    const token = req.headers.authorization?.split(' ')[1]

    // Si aucun token n'est présent, l'utilisateur n'est pas connecté
    if (!token) {
        return res.status(401).json({ message: 'Token manquant' })
    }

    try {
        // On vérifie que le token est valide et qu'il a été signé avec notre clé secrète
        // Si le token est expiré ou falsifié, jwt.verify() lève une erreur → on tombe dans le catch
        const decoded = jwt.verify(token, process.env.CLEJWT)

        // On attache les données décodées à req.user
        // Elles seront disponibles dans tous les controllers qui suivent ce middleware
        // req.user contient : { id, username } — ce qu'on a mis dans jwt.sign() lors de la connexion
        req.user = decoded

        // On passe au middleware ou controller suivant
        next()

    } catch {
        // Le token est invalide ou expiré
        res.status(401).json({ message: 'Token invalide' })
    }
}

// ===== MIDDLEWARE : Vérification optionnelle du JWT =====
// Ce middleware tente de décoder le token JWT s'il est présent.
// Contrairement à verifierJWT, il ne bloque PAS la requête si le token est absent ou invalide.
// Il est branché sur les routes accessibles par tout le monde mais qui ont besoin de savoir
// si l'utilisateur est connecté — ex: un topic ouvert est visible par tous mais un topic archivé
// n'est visible que par le créateur ou un admin
const verifierJWTOptionnel = (req, res, next) => {

    // On récupère le token dans le header Authorization
    // Le header ressemble à : "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    // On split sur l'espace pour ne récupérer que la partie après "Bearer "
    const token = req.headers.authorization?.split(' ')[1]

    // Si aucun token n'est présent, on ne bloque pas — on met req.user à null
    // et on continue normalement vers le controller
    if (!token) {
        req.user = null
        return next()
    }

    try {
        // On vérifie que le token est valide et qu'il a été signé avec notre clé secrète
        const decoded = jwt.verify(token, process.env.CLEJWT)

        // On attache les données décodées à req.user
        // req.user contient : { id, username } — ce qu'on a mis dans jwt.sign() lors de la connexion
        req.user = decoded

    } catch {
        // Le token est invalide ou expiré — on ne bloque pas, on met req.user à null
        // Le controller décidera ensuite si l'accès est autorisé ou non
        req.user = null
    }

    // On passe au middleware ou controller suivant dans tous les cas
    next()
}

// ===== MIDDLEWARE : Vérification du rôle admin =====
// Ce middleware vérifie que l'utilisateur connecté est bien un administrateur
// Il doit toujours être branché APRÈS verifierJWT car il a besoin de req.user
const isAdmin = (req, res, next) => {

    // On vérifie le champ is_admin stocké dans le JWT
    // Si is_admin = 0 (false), l'utilisateur n'a pas les droits
    if (!req.user.is_admin) {
        return res.status(403).json({ message: 'Accès interdit' })
    }

    // L'utilisateur est admin, on passe au controller suivant
    next()
}

// On exporte les deux middlewares pour les utiliser dans les routers
module.exports = { verifierJWT, isAdmin, verifierJWTOptionnel }