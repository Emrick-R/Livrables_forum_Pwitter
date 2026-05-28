/*
 * On gère ici toute la logique métier liée à l'administration du site.
 * Chaque fonction correspond à une route définie dans le router admin.
 * Ces routes sont protégées par les middlewares verifierJWT et isAdmin.
 * C'est ici qu'on écrit la logique — vérifications, requêtes DB, réponses.
 */

// On importe la connexion à la base de données
const db = require('../database/connexiondb.js')

// ===== GET /api/admin/topics =====
// Récupère tous les topics sans restriction d'état (ouvert, fermé, archivé)
// Accessible uniquement par un admin — vérifié via les middlewares verifierJWT et isAdmin
exports.getAdmTopics = async (req, res) => {

    try {
        // On récupère tous les topics avec le username de l'auteur et les tags
        // Contrairement à getTopics, on ne filtre PAS sur le statut
        // L'admin voit tout, y compris les topics archivés
        // Exemple de retour :
        // topics = [
        //     { id_Topics: 1, title: 'Topic Film', status: 'ouvert', created_at: '2026-01-01T10:00:00.000Z', username: 'user1', tags: 'Film,Meme' },
        //     { id_Topics: 2, title: 'Topic Jeux-video', status: 'fermé', created_at: '2026-01-01T11:00:00.000Z', username: 'user2', tags: 'Jeux-video' },
        //     { id_Topics: 3, title: 'Topic Musique', status: 'archivé', created_at: '2026-01-01T12:00:00.000Z', username: 'user3', tags: 'Musique,Meme' }
        // ]
        // Si aucun topic : topics = []
        const [topics] = await db.query(
            `
                SELECT t.id_Topics, t.title, t.status, t.created_at,
                       u.username,
                       GROUP_CONCAT(tg.name) AS tags
                FROM topics t
                JOIN users u ON t.id_Users = u.id_Users
                LEFT JOIN Classifie c ON t.id_Topics = c.id_Topics
                LEFT JOIN Tags tg ON c.id_Tags = tg.id_Tags
                GROUP BY t.id_Topics
                ORDER BY t.created_at DESC
            `,
            []
        )

        // GROUP_CONCAT retourne une chaîne "Film,Meme" — on la transforme en tableau ['Film', 'Meme']
        // Si aucun tag, tags vaut null — on retourne un tableau vide []
        const topicsAvecTags = topics.map(topic => ({
            ...topic,
            tags: topic.tags ? topic.tags.split(',') : []
        }))

        // On renvoie les topics trouvés
        // Exemple de réponse JSON :
        // {
        //     "topics": [
        //         {
        //             "id_Topics": 1,
        //             "title": "Topic Film",
        //             "status": "ouvert",
        //             "created_at": "2026-01-01T10:00:00.000Z",
        //             "username": "user1",
        //             "tags": ["Film", "Meme"]
        //         }
        //     ]
        // }
        res.status(200).json({ topics: topicsAvecTags })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== PATCH /api/admin/topic/:id/status =====
// Modifier l'état d'un topic en tant qu'admin
// Pas de vérification de propriété — l'admin peut modifier n'importe quel topic
// Accessible uniquement par un admin — vérifié via les middlewares verifierJWT et isAdmin
exports.patchAdmTopicStatus = async (req, res) => {

    // On récupère l'id du topic passé dans l'URL (/api/admin/topic/1/status → req.params.id = 1)
    const idTopic = req.params.id

    // On récupère le nouveau statut envoyé dans le body
    const { status } = req.body

    try {
        // On vérifie que le statut est bien une valeur autorisée
        const statutsAutorises = ['ouvert', 'fermé', 'archivé']
        if (!statutsAutorises.includes(status)) {
            return res.status(400).json({ message: 'Statut invalide — valeurs acceptées : ouvert, fermé, archivé' })
        }

        // On vérifie que le topic existe
        // Exemple de retour si trouvé :
        // topic = { id_Topics: 1, status: 'ouvert' }
        const [[topic]] = await db.query(
            `
                SELECT id_Topics, status
                FROM topics
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // Si le topic n'existe pas on renvoie une erreur 404
        if (!topic) {
            return res.status(404).json({ message: 'Topic introuvable' })
        }

        // Si le statut est déjà le même on ne fait rien
        if (topic.status === status) {
            return res.status(400).json({ message: `Le topic est déjà en statut "${status}"` })
        }

        // On met à jour uniquement le statut du topic
        await db.query(
            `
                UPDATE topics
                SET status = ?
                WHERE id_Topics = ?
            `,
            [status, idTopic]
        )

        // On renvoie une confirmation avec le nouveau statut
        // Exemple de réponse JSON :
        // { "message": "Statut modifié avec succès", "status": "fermé" }
        res.status(200).json({ message: 'Statut modifié avec succès', status })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== DELETE /api/admin/topic/:id =====
// Supprimer un topic et tout ce qui y est associé en tant qu'admin
// Pas de vérification de propriété — l'admin peut supprimer n'importe quel topic
// Accessible uniquement par un admin — vérifié via les middlewares verifierJWT et isAdmin
exports.deleteAdmTopicById = async (req, res) => {

    // On récupère l'id du topic passé dans l'URL (/api/admin/topic/1 → req.params.id = 1)
    const idTopic = req.params.id

    try {
        // On vérifie que le topic existe
        // Exemple de retour si trouvé :
        // topic = { id_Topics: 1 }
        const [[topic]] = await db.query(
            `
                SELECT id_Topics
                FROM topics
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // Si le topic n'existe pas on renvoie une erreur 404
        if (!topic) {
            return res.status(404).json({ message: 'Topic introuvable' })
        }

        // On supprime dans l'ordre pour respecter les contraintes de clés étrangères
        // Du plus dépendant au moins dépendant : Likes → TopicLikes → Messages → Classifie → Topic

        // Les likes sur les messages du topic
        await db.query(
            `
                DELETE l FROM Likes l
                JOIN messages m ON l.id_Messages = m.id_Messages
                WHERE m.id_Topics = ?
            `,
            [idTopic]
        )

        // Les likes sur le topic lui-même
        await db.query(
            `
                DELETE FROM TopicLikes
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // Les messages du topic
        await db.query(
            `
                DELETE FROM messages
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // Les tags associés au topic
        await db.query(
            `
                DELETE FROM Classifie
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // Le topic lui-même en dernier
        await db.query(
            `
                DELETE FROM topics
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // On renvoie une confirmation
        // Exemple de réponse JSON :
        // { "message": "Topic supprimé avec succès" }
        res.status(200).json({ message: 'Topic supprimé avec succès' })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== DELETE /api/admin/message/:id =====
// Supprimer un message et tous ses likes associés en tant qu'admin
// Pas de vérification de propriété — l'admin peut supprimer n'importe quel message
// Accessible uniquement par un admin — vérifié via les middlewares verifierJWT et isAdmin
exports.deleteAdmMessageById = async (req, res) => {

    // On récupère l'id du message passé dans l'URL (/api/admin/message/1 → req.params.id = 1)
    const idMessage = req.params.id

    try {
        // On vérifie que le message existe
        // Exemple de retour si trouvé :
        // message = { id_Messages: 1 }
        const [[message]] = await db.query(
            `
                SELECT id_Messages
                FROM messages
                WHERE id_Messages = ?
            `,
            [idMessage]
        )

        // Si le message n'existe pas on renvoie une erreur 404
        if (!message) {
            return res.status(404).json({ message: 'Message introuvable' })
        }

        // On supprime dans l'ordre pour respecter les contraintes de clés étrangères
        // Du plus dépendant au moins dépendant : Likes → Message

        // Les likes associés au message
        await db.query(
            `
                DELETE FROM Likes
                WHERE id_Messages = ?
            `,
            [idMessage]
        )

        // Le message lui-même
        await db.query(
            `
                DELETE FROM messages
                WHERE id_Messages = ?
            `,
            [idMessage]
        )

        // On renvoie une confirmation
        // Exemple de réponse JSON :
        // { "message": "Message supprimé avec succès" }
        res.status(200).json({ message: 'Message supprimé avec succès' })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== GET /api/admin/users =====
// Récupère tous les utilisateurs avec leur statut de bannissement
// Accessible uniquement par un admin — vérifié via les middlewares verifierJWT et isAdmin
exports.getAdmUsers = async (req, res) => {

    try {
        // On récupère tous les utilisateurs avec l'info de bannissement
        // LEFT JOIN Bans pour savoir si l'utilisateur est banni ou non
        // Si banned_at est null → l'utilisateur est actif
        // Si banned_at a une valeur → l'utilisateur est banni
        // Exemple de retour :
        // users = [
        //     { id_Users: 1, username: 'admin', email: 'admin@pwitter.com', is_admin: 1, created_at: '2026-01-01T00:00:00.000Z', banned_at: null },
        //     { id_Users: 2, username: 'user1', email: 'u1@mail.com', is_admin: 0, created_at: '2026-01-01T00:00:00.000Z', banned_at: null },
        //     { id_Users: 4, username: 'user3', email: 'u3@mail.com', is_admin: 0, created_at: '2026-01-01T00:00:00.000Z', banned_at: '2026-01-03T00:00:00.000Z' }
        // ]
        // Si aucun utilisateur : users = []
        const [users] = await db.query(
            `
                SELECT u.id_Users, u.username, u.email, u.is_admin, u.created_at,
                       b.banned_at
                FROM users u
                LEFT JOIN Bans b ON u.id_Bans = b.id_Bans
                ORDER BY u.created_at DESC
            `,
            []
        )

        // On renvoie les utilisateurs trouvés
        // Exemple de réponse JSON :
        // {
        //     "users": [
        //         {
        //             "id_Users": 1,
        //             "username": "admin",
        //             "email": "admin@pwitter.com",
        //             "is_admin": 1,
        //             "created_at": "2026-01-01T00:00:00.000Z",
        //             "banned_at": null
        //         }
        //     ]
        // }
        res.status(200).json({ users })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== POST /api/admin/user/:id/ban =====
// Bannir un utilisateur
// Accessible uniquement par un admin — vérifié via les middlewares verifierJWT et isAdmin
exports.postBanUser = async (req, res) => {

    // On récupère l'id de l'utilisateur passé dans l'URL (/api/admin/user/4/ban → req.params.id = 4)
    const idUtilisateur = req.params.id

    try {
        // On vérifie que l'utilisateur existe et on récupère son statut de ban
        // Exemple de retour si trouvé :
        // user = { id_Users: 4, username: 'user3', is_admin: 0, id_Bans: null }
        const [[user]] = await db.query(
            `
                SELECT id_Users, username, is_admin, id_Bans
                FROM users
                WHERE id_Users = ?
            `,
            [idUtilisateur]
        )

        // Si l'utilisateur n'existe pas on renvoie une erreur 404
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' })
        }

        // On empêche de bannir un admin
        if (user.is_admin) {
            return res.status(403).json({ message: 'Impossible de bannir un administrateur' })
        }

        // On vérifie que l'utilisateur n'est pas déjà banni
        if (user.id_Bans) {
            return res.status(409).json({ message: `${user.username} est déjà banni` })
        }

        // On crée l'entrée dans la table Bans
        const [result] = await db.query(
            `
                INSERT INTO Bans (banned_at)
                VALUES (NOW())
            `,
            []
        )

        // On lie l'utilisateur au ban via LAST_INSERT_ID()
        await db.query(
            `
                UPDATE users
                SET id_Bans = ?
                WHERE id_Users = ?
            `,
            [result.insertId, idUtilisateur]
        )

        // On renvoie une confirmation
        // Exemple de réponse JSON :
        // { "message": "user3 a été banni avec succès" }
        res.status(200).json({ message: `${user.username} a été banni avec succès` })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== DELETE /api/admin/user/:id/ban =====
// Débannir un utilisateur
// Accessible uniquement par un admin — vérifié via les middlewares verifierJWT et isAdmin
exports.deleteBanUser = async (req, res) => {

    // On récupère l'id de l'utilisateur passé dans l'URL (/api/admin/user/4/ban → req.params.id = 4)
    const idUtilisateur = req.params.id

    try {
        // On vérifie que l'utilisateur existe et on récupère son statut de ban
        // Exemple de retour si trouvé :
        // user = { id_Users: 4, username: 'user3', id_Bans: 1 }
        const [[user]] = await db.query(
            `
                SELECT id_Users, username, id_Bans
                FROM users
                WHERE id_Users = ?
            `,
            [idUtilisateur]
        )

        // Si l'utilisateur n'existe pas on renvoie une erreur 404
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' })
        }

        // On vérifie que l'utilisateur est bien banni
        if (!user.id_Bans) {
            return res.status(400).json({ message: `${user.username} n'est pas banni` })
        }

        // On garde l'id du ban avant de le retirer de l'utilisateur
        const idBan = user.id_Bans

        // On retire le lien entre l'utilisateur et le ban
        await db.query(
            `
                UPDATE users
                SET id_Bans = NULL
                WHERE id_Users = ?
            `,
            [idUtilisateur]
        )

        // On supprime l'entrée dans la table Bans
        await db.query(
            `
                DELETE FROM Bans
                WHERE id_Bans = ?
            `,
            [idBan]
        )

        // On renvoie une confirmation
        // Exemple de réponse JSON :
        // { "message": "user3 a été débanni avec succès" }
        res.status(200).json({ message: `${user.username} a été débanni avec succès` })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}
