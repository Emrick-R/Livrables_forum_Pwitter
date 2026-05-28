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
module.exports = { verifierJWT, isAdmin }