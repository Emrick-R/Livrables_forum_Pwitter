/*
 * On gère ici toute la logique métier liée aux messages des topics.
 * Chaque fonction correspond à une route définie dans le router message.
 * C'est ici qu'on écrit la logique — vérifications, requêtes DB, réponses.
 */

// On importe la connexion à la base de données
const db = require('../database/connexiondb.js')

// ===== POST /api/message =====
// Créer un nouveau message dans un topic
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
exports.postMessage = async (req, res) => {

    // On récupère les données envoyées dans le body de la requête
    const { body, idTopic } = req.body

    // On récupère l'id de l'utilisateur connecté depuis le JWT
    const idUtilisateur = req.user.id

    try {
        // On vérifie que le corps du message est présent
        if (!body) {
            return res.status(400).json({ message: 'Le corps du message est obligatoire' })
        }

        // On vérifie que le topic existe et on récupère son statut
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

        // On vérifie que le topic est ouvert — impossible de répondre sur un topic fermé ou archivé
        if (topic.status !== 'ouvert') {
            return res.status(403).json({ message: 'Impossible de répondre sur un topic fermé ou archivé' })
        }

        // On insère le message en base
        // created_at est géré automatiquement par MySQL avec NOW()
        const [result] = await db.query(
            `
                INSERT INTO messages (body, created_at, id_Topics, id_Users)
                VALUES (?, NOW(), ?, ?)
            `,
            [body, idTopic, idUtilisateur]
        )

        // On renvoie une confirmation avec l'id du message créé
        // Exemple de réponse JSON :
        // { "message": "Message créé avec succès", "idMessage": 10 }
        res.status(201).json({ message: 'Message créé avec succès', idMessage: result.insertId })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== POST /api/message/:id/like =====
// Liker ou disliker un message
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
exports.postLike = async (req, res) => {

    // On récupère l'id du message passé dans l'URL (/api/message/1/like → req.params.id = 1)
    const idMessage = req.params.id

    // On récupère le type de vote envoyé dans le body — 'like' ou 'dislike'
    const { type } = req.body

    // On récupère l'id de l'utilisateur connecté depuis le JWT
    const idUtilisateur = req.user.id

    try {
        // On vérifie que le type est bien 'like' ou 'dislike'
        if (type !== 'like' && type !== 'dislike') {
            return res.status(400).json({ message: 'Le type doit être "like" ou "dislike"' })
        }

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

        // On vérifie si l'utilisateur a déjà voté sur ce message
        // Exemple de retour si déjà voté :
        // voteExistant = { id_Likes: 1, type: 'like' }
        // Exemple de retour si pas encore voté :
        // voteExistant = undefined
        const [[voteExistant]] = await db.query(
            `
                SELECT id_Likes, type
                FROM Likes
                WHERE id_Messages = ? AND id_Users = ?
            `,
            [idMessage, idUtilisateur]
        )

        // Si l'utilisateur a déjà voté avec le même type on refuse
        if (voteExistant && voteExistant.type === type) {
            return res.status(409).json({ message: `Vous avez déjà mis un ${type} sur ce message` })
        }

        // Si l'utilisateur a déjà voté mais avec un type différent on met à jour
        // ex: il avait liké et veut maintenant disliker
        if (voteExistant) {
            await db.query(
                `
                    UPDATE Likes
                    SET type = ?
                    WHERE id_Messages = ? AND id_Users = ?
                `,
                [type, idMessage, idUtilisateur]
            )

            return res.status(200).json({ message: `Vote modifié en ${type}` })
        }

        // Sinon on insère un nouveau vote
        await db.query(
            `
                INSERT INTO Likes (type, id_Messages, id_Users)
                VALUES (?, ?, ?)
            `,
            [type, idMessage, idUtilisateur]
        )

        // On renvoie une confirmation
        // Exemple de réponse JSON :
        // { "message": "like ajouté avec succès" }
        res.status(201).json({ message: `${type} ajouté avec succès` })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== DELETE /api/message/:id/like =====
// Annuler son like ou dislike sur un message
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
exports.deleteLike = async (req, res) => {

    // On récupère l'id du message passé dans l'URL (/api/message/1/like → req.params.id = 1)
    const idMessage = req.params.id

    // On récupère l'id de l'utilisateur connecté depuis le JWT
    const idUtilisateur = req.user.id

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

        // On vérifie que l'utilisateur a bien un vote sur ce message
        // Exemple de retour si trouvé :
        // vote = { id_Likes: 1, type: 'like' }
        // Exemple de retour si non trouvé :
        // vote = undefined
        const [[vote]] = await db.query(
            `
                SELECT id_Likes, type
                FROM Likes
                WHERE id_Messages = ? AND id_Users = ?
            `,
            [idMessage, idUtilisateur]
        )

        // Si aucun vote trouvé, l'utilisateur n'a pas encore voté
        if (!vote) {
            return res.status(404).json({ message: 'Aucun vote à annuler' })
        }

        // On supprime le vote
        await db.query(
            `
                DELETE FROM Likes
                WHERE id_Messages = ? AND id_Users = ?
            `,
            [idMessage, idUtilisateur]
        )

        // On renvoie une confirmation
        // Exemple de réponse JSON :
        // { "message": "Vote annulé avec succès" }
        res.status(200).json({ message: 'Vote annulé avec succès' })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== PUT /api/message/:id =====
// Modifier le corps d'un message
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
// Accessible uniquement par le propriétaire du message ou un admin
exports.putMessageById = async (req, res) => {

    // On récupère l'id du message passé dans l'URL (/api/message/1 → req.params.id = 1)
    const idMessage = req.params.id

    // On récupère le nouveau corps envoyé dans le body
    const { body } = req.body

    // On récupère l'utilisateur connecté depuis le JWT
    const idUtilisateur = req.user.id
    const estAdmin      = req.user.is_admin

    try {
        // On vérifie que le corps est présent
        if (!body) {
            return res.status(400).json({ message: 'Le corps du message est obligatoire' })
        }

        // On vérifie que le message existe
        // Exemple de retour si trouvé :
        // message = { id_Messages: 1, id_Users: 3 }
        const [[message]] = await db.query(
            `
                SELECT id_Messages, id_Users
                FROM messages
                WHERE id_Messages = ?
            `,
            [idMessage]
        )

        // Si le message n'existe pas on renvoie une erreur 404
        if (!message) {
            return res.status(404).json({ message: 'Message introuvable' })
        }

        // On vérifie que l'utilisateur est le propriétaire ou un admin
        const estProprietaire = idUtilisateur === message.id_Users

        if (!estProprietaire && !estAdmin) {
            return res.status(403).json({ message: 'Accès interdit' })
        }

        // On met à jour uniquement le corps du message
        await db.query(
            `
                UPDATE messages
                SET body = ?
                WHERE id_Messages = ?
            `,
            [body, idMessage]
        )

        // On renvoie une confirmation
        // Exemple de réponse JSON :
        // { "message": "Message modifié avec succès" }
        res.status(200).json({ message: 'Message modifié avec succès' })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== DELETE /api/message/:id =====
// Supprimer un message et tous ses likes associés
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
// Accessible par le propriétaire du message, le propriétaire du topic ou un admin
exports.deleteMessageById = async (req, res) => {

    // On récupère l'id du message passé dans l'URL (/api/message/1 → req.params.id = 1)
    const idMessage = req.params.id

    // On récupère l'utilisateur connecté depuis le JWT
    const idUtilisateur = req.user.id
    const estAdmin      = req.user.is_admin

    try {
        // On vérifie que le message existe et on récupère l'auteur du message ET du topic
        // On a besoin de l'auteur du topic car le propriétaire d'un topic peut supprimer
        // les messages dans son topic même s'il n'en est pas l'auteur
        // Exemple de retour si trouvé :
        // message = { id_Messages: 1, id_Users: 3, topic_owner: 2 }
        const [[message]] = await db.query(
            `
                SELECT m.id_Messages, m.id_Users,
                       t.id_Users AS topic_owner
                FROM messages m
                JOIN topics t ON m.id_Topics = t.id_Topics
                WHERE m.id_Messages = ?
            `,
            [idMessage]
        )

        // Si le message n'existe pas on renvoie une erreur 404
        if (!message) {
            return res.status(404).json({ message: 'Message introuvable' })
        }

        // On vérifie que l'utilisateur a le droit de supprimer
        // 3 cas autorisés : auteur du message, propriétaire du topic, admin
        const estAuteurMessage = idUtilisateur === message.id_Users
        const estAuteurTopic   = idUtilisateur === message.topic_owner

        if (!estAuteurMessage && !estAuteurTopic && !estAdmin) {
            return res.status(403).json({ message: 'Accès interdit' })
        }

        // On supprime d'abord les likes associés au message
        // Sans ça MySQL refuserait la suppression à cause de la clé étrangère
        await db.query(
            `
                DELETE FROM Likes
                WHERE id_Messages = ?
            `,
            [idMessage]
        )

        // On supprime ensuite le message lui-même
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
