/*
 * On gère ici toute la logique métier liée aux topics.
 * Chaque fonction correspond à une route définie dans le router topic.
 * C'est ici qu'on écrit la logique — vérifications, requêtes DB, réponses.
 */

// On importe la connexion à la base de données
const db = require('../database/connexiondb.js')

// ===== GET /api/tags =====
// Récupère tous les tags disponibles sur la plateforme
// Accessible publiquement — pas besoin de JWT
exports.getTags = async (req, res) => {

    try {
        // On récupère tous les tags
        // Exemple de retour :
        // tags = [
        //     { id_Tags: 1, name: 'Film' },
        //     { id_Tags: 2, name: 'Jeux-video' },
        //     { id_Tags: 3, name: 'Musique' },
        //     { id_Tags: 4, name: 'Meme' }
        // ]
        // Si aucun tag : tags = []
        const [tags] = await db.query(
            `
                SELECT id_Tags, name
                FROM Tags
                ORDER BY name ASC
            `,
            []
        )

        // On renvoie les tags trouvés
        // Exemple de réponse JSON :
        // {
        //     "tags": [
        //         { "id_Tags": 1, "name": "Film" },
        //         { "id_Tags": 2, "name": "Jeux-video" },
        //         { "id_Tags": 3, "name": "Musique" },
        //         { "id_Tags": 4, "name": "Meme" }
        //     ]
        // }
        res.status(200).json({ tags })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== POST /api/tags =====
// Créer un nouveau tag
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
exports.postTag = async (req, res) => {

    // On récupère le nom du tag envoyé dans le body
    const { name } = req.body

    try {
        // On vérifie que le nom est présent
        if (!name) {
            return res.status(400).json({ message: 'Le nom du tag est obligatoire' })
        }

        // On vérifie qu'un tag avec ce nom n'existe pas déjà
        // Exemple de retour si trouvé :
        // tag = { id_Tags: 1, name: 'Film' }
        // Exemple de retour si non trouvé :
        // tag = undefined
        const [[tagExistant]] = await db.query(
            `
                SELECT id_Tags
                FROM Tags
                WHERE name = ?
            `,
            [name]
        )

        // Si le tag existe déjà on renvoie une erreur 409 (conflit)
        if (tagExistant) {
            return res.status(409).json({ message: 'Ce tag existe déjà' })
        }

        // On insère le nouveau tag en base
        const [result] = await db.query(
            `
                INSERT INTO Tags (name)
                VALUES (?)
            `,
            [name]
        )

        // On renvoie une confirmation avec l'id du tag créé
        // Exemple de réponse JSON :
        // { "message": "Tag créé avec succès", "idTag": 5 }
        res.status(201).json({ message: 'Tag créé avec succès', idTag: result.insertId })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== DELETE /api/tags/:id =====
// Supprimer un tag et toutes ses associations aux topics
// Nécessite d'être authentifié et admin — vérifié via les middlewares verifierJWT et isAdmin
exports.deleteTagById = async (req, res) => {

    // On récupère l'id du tag passé dans l'URL (/api/tags/1 → req.params.id = 1)
    const idTag = req.params.id

    try {
        // On vérifie que le tag existe
        // Exemple de retour si trouvé :
        // tag = { id_Tags: 1, name: 'Film' }
        const [[tag]] = await db.query(
            `
                SELECT id_Tags, name
                FROM Tags
                WHERE id_Tags = ?
            `,
            [idTag]
        )

        // Si le tag n'existe pas on renvoie une erreur 404
        if (!tag) {
            return res.status(404).json({ message: 'Tag introuvable' })
        }

        // On supprime d'abord toutes les associations dans Classifie
        // Sans ça MySQL refuserait la suppression à cause de la clé étrangère
        await db.query(
            `
                DELETE FROM Classifie
                WHERE id_Tags = ?
            `,
            [idTag]
        )

        // On supprime ensuite le tag lui-même
        await db.query(
            `
                DELETE FROM Tags
                WHERE id_Tags = ?
            `,
            [idTag]
        )

        // On renvoie une confirmation
        // Exemple de réponse JSON :
        // { "message": "Tag \"Film\" supprimé avec succès" }
        res.status(200).json({ message: `Tag "${tag.name}" supprimé avec succès` })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}
