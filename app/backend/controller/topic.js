/*
 * On gère ici toute la logique métier liée aux topics.
 * Chaque fonction correspond à une route définie dans le router topic.
 * C'est ici qu'on écrit la logique — vérifications, requêtes DB, réponses.
 */

// On importe la connexion à la base de données
const db = require('../database/connexiondb.js')
// On importe jsonwebtoken pour créer et signer les jetons d'authentification

// ===== GET /api/topics =====
// Récupère tous les topics visibles
// Un topic archivé n'est visible que par son créateur — on ne l'affiche pas ici
// Accessible publiquement — pas besoin de JWT
exports.getTopics = async (req, res) => {

    // On récupère les query params envoyés par le front
    // Exemple d'URL : /api/topics?page=2&limite=10&tri=score&tag=1&recherche=film
    // parseInt convertit la string en nombre, || fournit une valeur par défaut si absent
    const page = parseInt(req.query.page) || 1
    const limite = parseInt(req.query.limite) || 10
    const tri = req.query.tri || 'date'
    const tagId = req.query.tag || null
    const recherche = req.query.recherche || ''

    // offset = combien de lignes on saute avant de commencer à lire
    // page 1 → offset 0 (on saute rien), page 2 → offset 10 (on saute les 10 premiers)
    const offset = (page - 1) * limite

    try {
        // On construit le WHERE dynamiquement selon les filtres actifs
        // On part avec la condition de base : pas de topics archivés
        let conditions = [`t.status != 'archivé'`]
        let params = []

        // Si le front envoie une recherche, on ajoute un filtre sur le titre
        // LIKE '%film%' → cherche "film" n'importe où dans le titre
        if (recherche) {
            conditions.push(`t.title LIKE ?`)
            params.push(`%${recherche}%`)
        }

        // Si le front envoie un tag, on filtre les topics qui ont ce tag
        // On utilise une sous-requête sur Classifie pour trouver les topics liés à ce tag
        if (tagId) {
            conditions.push(`t.id_Topics IN (SELECT id_Topics FROM Classifie WHERE id_Tags = ?)`)
            params.push(tagId)
        }

        // On assemble les conditions avec AND
        // Résultat possible : "t.status != 'archivé' AND t.title LIKE '%film%' AND t.id_Topics IN (...)"
        // Si aucun filtre actif : juste "t.status != 'archivé'"
        const where = conditions.join(' AND ')

        // On choisit l'ordre de tri selon ce que le front demande
        // 'score' → les plus populaires en premier
        // 'date' (par défaut) → les plus récents en premier
        const orderBy = tri === 'score'
            ? 'score DESC, t.created_at DESC'
            : 't.created_at DESC'

        // On compte le total de topics qui correspondent aux filtres
        // Ce total est envoyé au front pour calculer le nombre de pages
        // Exemple de retour : total = { count: 12 }
        const [[total]] = await db.query(
            `
                SELECT COUNT(DISTINCT t.id_Topics) AS count
                FROM topics t
                WHERE ${where}
            `,
            params
        )

        // On récupère les topics de la page demandée
        // LEFT JOIN topiclikes → pour calculer le score (likes - dislikes)
        // LEFT JOIN messages → pour compter le nombre de réponses
        // COALESCE(..., 0) → retourne 0 au lieu de null si aucun vote
        // COUNT(DISTINCT ...) → compte les messages uniques, pas les doublons créés par les JOIN
        // LIMIT 10 OFFSET 10 → prend 10 résultats en sautant les 10 premiers (page 2)
        // Exemple de retour :
        // topics = [
        //     { id_Topics: 1, title: 'Topic Film', status: 'ouvert', username: 'user1', tags: 'Film,Meme', score: 1, nb_messages: 3 }
        // ]
        const [topics] = await db.query(
            `
                SELECT t.id_Topics, t.title, t.status, t.created_at,
                       u.username,
                       GROUP_CONCAT(DISTINCT tg.name) AS tags,
                       COALESCE(SUM(CASE
                           WHEN tl.type = 'like' THEN 1
                           WHEN tl.type = 'dislike' THEN -1
                           ELSE 0
                       END), 0) AS score,
                       COUNT(DISTINCT m.id_Messages) AS nb_messages
                FROM topics t
                JOIN users u ON t.id_Users = u.id_Users
                LEFT JOIN Classifie c ON t.id_Topics = c.id_Topics
                LEFT JOIN Tags tg ON c.id_Tags = tg.id_Tags
                LEFT JOIN topiclikes tl ON t.id_Topics = tl.id_Topics
                LEFT JOIN messages m ON t.id_Topics = m.id_Topics
                WHERE ${where}
                GROUP BY t.id_Topics
                ORDER BY ${orderBy}
                LIMIT ? OFFSET ?
            `,
            [...params, limite, offset]
        )

        // GROUP_CONCAT retourne "Film,Meme" → on transforme en tableau ['Film', 'Meme']
        const topicsAvecTags = topics.map(topic => ({
            ...topic,
            tags: topic.tags ? topic.tags.split(',') : []
        }))

        // On renvoie les topics ET le total
        // Le front utilise le total pour afficher "Page 1 sur 3"
        // Exemple de réponse JSON :
        // { "topics": [...], "total": 12 }
        res.status(200).json({ topics: topicsAvecTags, total: total.count })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== GET /api/topic/:id =====
// Récupère le détail d'un topic par son ID
// Les règles d'accès selon le statut sont gérées ici :
// - ouvert    → accessible par tout le monde
// - fermé     → accessible uniquement par les utilisateurs authentifiés
// - archivé   → accessible uniquement par le créateur du topic ou un admin
exports.getTopicById = async (req, res) => {

    // On récupère l'id passé dans l'URL (/api/topic/1 → req.params.id = 1)
    const idTopic = req.params.id

    // On récupère l'utilisateur connecté si présent — peut être null si non connecté
    const utilisateurConnecte = req.user || null

    try {
        // On récupère le topic avec le username de l'auteur, ses tags et son score
        // Le score est calculé via une sous-requête indépendante sur topiclikes :
        //   → La sous-requête parcourt topiclikes pour ce topic uniquement
        //   → CASE transforme chaque vote : 'like' → +1, 'dislike' → -1
        //   → SUM additionne tous les votes pour obtenir le score total
        //   → COALESCE remplace null par 0 si le topic n'a aucun vote
        //   → Le tout est isolé des autres JOIN, ce qui évite de compter les votes en double
        // Exemple de retour si trouvé :
        // topic = { id_Topics: 1, title: 'Topic Film', body: '...', status: 'ouvert',
        //           created_at: '2026-01-01T10:00:00.000Z', id_Users: 2,
        //           username: 'user1', tags: 'Film,Meme', score: 1 }
        const [[topic]] = await db.query(
            `
                SELECT t.id_Topics, t.title, t.body, t.status, t.created_at,
                       t.id_Users, u.username,
                       GROUP_CONCAT(DISTINCT tg.name) AS tags,
                       (SELECT COALESCE(SUM(CASE
                                                WHEN tl.type = 'like' THEN 1
                                                WHEN tl.type = 'dislike' THEN -1
                                                ELSE 0
                           END), 0) FROM topiclikes tl WHERE tl.id_Topics = t.id_Topics) AS score
                FROM topics t
                         JOIN users u ON t.id_Users = u.id_Users
                         LEFT JOIN Classifie c ON t.id_Topics = c.id_Topics
                         LEFT JOIN Tags tg ON c.id_Tags = tg.id_Tags
                WHERE t.id_Topics = ?
                GROUP BY t.id_Topics
            `,
            [idTopic]
        )

        // Si le topic n'existe pas on renvoie une erreur 404
        if (!topic) {
            return res.status(404).json({message: 'Topic introuvable'})
        }

        // Fermé → accessible uniquement par les utilisateurs authentifiés ou admin
        if (topic.status === 'fermé' && !utilisateurConnecte) {
            return res.status(401).json({message: 'Vous devez être connecté pour consulter ce topic'})
        }

        // Archivé → accessible uniquement par le créateur ou un admin

        // Le && garantit qu'on n'accède pas à utilisateurConnecte.id si utilisateurConnecte est null
        // → si non connecté : estCreateur = null (falsy)
        // → si connecté mais pas créateur : estCreateur = false
        // → si connecté et créateur : estCreateur = true
        const estCreateur = utilisateurConnecte && utilisateurConnecte.id === topic.id_Users

        // On vérifie si l'utilisateur connecté est un administrateur
        // Même logique de court-circuit avec &&
        // → si non connecté : estAdmin = null (falsy)
        // → si connecté mais pas admin : estAdmin = 0 (falsy)
        // → si connecté et admin : estAdmin = 1 (truthy)
        const estAdmin = utilisateurConnecte && utilisateurConnecte.is_admin

        if (topic.status === 'archivé' && !estCreateur && !estAdmin) {
            return res.status(403).json({message: 'Accès interdit'})
        }

        // On transforme les tags en tableau
        // Exemple : 'Film,Meme' → ['Film', 'Meme']
        const topicFormate = {
            ...topic,
            tags: topic.tags ? topic.tags.split(',') : []
        }

        // On renvoie le topic formaté
        // Exemple de réponse JSON :
        // {
        //     "topic": {
        //         "id_Topics": 1,
        //         "title": "Topic Film",
        //         "body": "Discussion type autour des films",
        //         "status": "ouvert",
        //         "created_at": "2026-01-01T10:00:00.000Z",
        //         "id_Users": 2,
        //         "username": "user1",
        //         "tags": ["Film", "Meme"]
        //     }
        // }
        res.status(200).json({topic: topicFormate})

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({message: 'Erreur serveur'})
    }
}

// ===== GET /api/topic/:id/tags =====
// Récupère tous les tags associés à un topic spécifique
// Accessible publiquement — pas besoin de JWT
exports.getTopicTags = async (req, res) => {

    // On récupère l'id passé dans l'URL (/api/topic/1/tags → req.params.id = 1)
    const idTopic = req.params.id

    try {
        // On vérifie d'abord que le topic existe
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
            return res.status(404).json({message: 'Topic introuvable'})
        }

        // On récupère tous les tags associés à ce topic
        // JOIN Classifie pour faire le lien entre le topic et ses tags
        // JOIN Tags pour récupérer le nom et l'id de chaque tag
        // Exemple de retour :
        // tags = [
        //     { id_Tags: 1, name: 'Film' },
        //     { id_Tags: 4, name: 'Meme' }
        // ]
        // Si aucun tag : tags = []
        const [tags] = await db.query(
            `
                SELECT tg.id_Tags, tg.name
                FROM Tags tg
                         JOIN Classifie c ON tg.id_Tags = c.id_Tags
                WHERE c.id_Topics = ?
            `,
            [idTopic]
        )

        // On renvoie les tags trouvés
        // Exemple de réponse JSON :
        // {
        //     "tags": [
        //         { "id_Tags": 1, "name": "Film" },
        //         { "id_Tags": 4, "name": "Meme" }
        //     ]
        // }
        res.status(200).json({tags})

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({message: 'Erreur serveur'})
    }
}

// ===== GET /api/topic/:id/messages =====
// Récupère tous les messages d'un topic spécifique
// Accessible publiquement pour les topics ouverts
// Nécessite d'être authentifié pour les topics fermés
exports.getTopicMessages = async (req, res) => {

    // On récupère l'id passé dans l'URL (/api/topic/1/messages → req.params.id = 1)
    const idTopic = req.params.id

    // On récupère l'utilisateur connecté si présent — peut être null si non connecté
    const utilisateurConnecte = req.user || null

    try {
        // On vérifie d'abord que le topic existe et on récupère son statut
        // Exemple de retour si trouvé :
        // topic = { id_Topics: 1, status: 'ouvert', id_Users: 2 }
        const [[topic]] = await db.query(
            `
                SELECT id_Topics, status, id_Users
                FROM topics
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // Si le topic n'existe pas on renvoie une erreur 404
        if (!topic) {
            return res.status(404).json({ message: 'Topic introuvable' })
        }

        // Fermé → accessible uniquement par les utilisateurs authentifiés
        if (topic.status === 'fermé' && !utilisateurConnecte) {
            return res.status(401).json({ message: 'Vous devez être connecté pour consulter ce topic' })
        }

        // Archivé → accessible uniquement par le créateur ou un admin
        const estCreateur = utilisateurConnecte && utilisateurConnecte.id === topic.id_Users
        const estAdmin    = utilisateurConnecte && utilisateurConnecte.is_admin

        if (topic.status === 'archivé' && !estCreateur && !estAdmin) {
            return res.status(403).json({ message: 'Accès interdit' })
        }

        // On récupère les query params envoyés par le front
        // Exemple d'URL : /api/topic/1/messages?page=2&limite=10&tri=score
        // parseInt convertit la string en nombre, || fournit une valeur par défaut si absent
        const pageMsgs = parseInt(req.query.page) || 1
        const limiteMsgs = parseInt(req.query.limite) || 10
        const triMsgs = req.query.tri || 'date'

        // offset = combien de messages on saute avant de commencer à lire
        // page 1 → offset 0 (on saute rien), page 2 → offset 10 (on saute les 10 premiers)
        const offsetMsgs = (pageMsgs - 1) * limiteMsgs

        // On compte le total de messages dans ce topic
        // Ce total est envoyé au front pour calculer le nombre de pages
        // Exemple de retour : totalMsgs = { count: 27 }
        const [[totalMsgs]] = await db.query(
            `
                SELECT COUNT(*) AS count
                FROM messages
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // On choisit l'ordre de tri selon ce que le front demande
        // 'score' → les messages les plus likés en premier
        // 'date' (par défaut) → les messages les plus récents en premier
        const orderByMsgs = triMsgs === 'score'
            ? 'score DESC, m.created_at DESC'
            : 'm.created_at DESC'

        // On récupère les messages de la page demandée
        // LEFT JOIN messagelikes → pour calculer le score (likes - dislikes)
        // COALESCE(..., 0) → retourne 0 au lieu de null si aucun vote sur le message
        // LIMIT 10 OFFSET 10 → prend 10 résultats en sautant les 10 premiers (page 2)
        // Exemple de retour :
        // messages = [
        //     { id_Messages: 1, body: 'Super film !', created_at: '...', username: 'user1', id_Users: 3, score: 1 },
        //     { id_Messages: 2, body: 'Pas convaincu', created_at: '...', username: 'user2', id_Users: 4, score: -1 }
        // ]
        // Si aucun message : messages = []
        const [messages] = await db.query(
            `
                SELECT m.id_Messages, m.body, m.created_at,
                       u.username, u.id_Users,
                       COALESCE(SUM(CASE
                           WHEN l.type = 'like'    THEN 1
                           WHEN l.type = 'dislike' THEN -1
                           ELSE 0
                       END), 0) AS score
                FROM messages m
                JOIN users u ON m.id_Users = u.id_Users
                LEFT JOIN messagelikes l ON m.id_Messages = l.id_Messages
                WHERE m.id_Topics = ?
                GROUP BY m.id_Messages
                ORDER BY ${orderByMsgs}
                LIMIT ? OFFSET ?
            `,
            [idTopic, limiteMsgs, offsetMsgs]
        )

        // On renvoie les messages ET le total
        // Le front utilise le total pour afficher "27 réponses" et calculer le nombre de pages
        // Exemple de réponse JSON :
        // { "messages": [...], "total": 27 }
        res.status(200).json({ messages, total: totalMsgs.count })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== POST /api/topics =====
// Créer un nouveau topic
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
exports.postTopic = async (req, res) => {

    // On récupère les données envoyées dans le body de la requête
    const {title, body, tags} = req.body
    // tags est un tableau d'ids de tags existants — ex: [1, 4]

    // On récupère l'id de l'utilisateur connecté depuis le JWT
    const idUtilisateur = req.user.id

    try {
        // On vérifie que les champs obligatoires sont présents
        if (!title || !body) {
            return res.status(400).json({message: 'Le titre et le corps sont obligatoires'})
        }

        // On insère le topic en base
        // created_at est géré automatiquement par MySQL avec NOW()
        // status est 'ouvert' par défaut à la création
        const [result] = await db.query(
            `
                INSERT INTO topics (title, body, status, created_at, id_Users)
                VALUES (?, ?, 'ouvert', NOW(), ?)
            `,
            [title, body, idUtilisateur]
        )

        // On récupère l'id du topic fraîchement créé
        const idTopic = result.insertId

        // Si des tags sont fournis on les associe au topic
        // On insère une ligne dans Classifie pour chaque tag
        if (tags && tags.length > 0) {

            // On construit les valeurs à insérer pour chaque tag
            // tags = [1, 4] → values = [[4, 1], [4, 4]]
            const values = tags.map(idTag => [idTopic, idTag])

            // On insère toutes les associations en une seule requête
            // ? avec un tableau => VALUES (4, 1), (4, 4)
            await db.query(
                `
                    INSERT INTO Classifie (id_Topics, id_Tags)
                    VALUES ?
                `,
                [values]
            )
        }

        // On renvoie le topic créé avec son id
        // Exemple de réponse JSON :
        // {
        //     "message": "Topic créé avec succès",
        //     "idTopic": 4
        // }
        res.status(201).json({message: 'Topic créé avec succès', idTopic})

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({message: 'Erreur serveur'})
    }
}

// ===== POST /api/topic/:id/like =====
// Liker ou disliker un topic
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
exports.postTopicLikeDislike = async (req, res) => {

    // On récupère l'id du topic passé dans l'URL (/api/topic/1/like → req.params.id = 1)
    const idTopic = req.params.id

    // On récupère le type de vote envoyé dans le body — 'like' ou 'dislike'
    const {type} = req.body

    // On récupère l'id de l'utilisateur connecté depuis le JWT
    const idUtilisateur = req.user.id

    try {
        // On vérifie que le type est bien 'like' ou 'dislike'
        if (type !== 'like' && type !== 'dislike') {
            return res.status(400).json({message: 'Le type doit être "like" ou "dislike"'})
        }

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
            return res.status(404).json({message: 'Topic introuvable'})
        }

        // On vérifie si l'utilisateur a déjà voté sur ce topic
        // Exemple de retour si déjà voté :
        // voteExistant = { id_TopicLikes: 1, type: 'like' }
        // Exemple de retour si pas encore voté :
        // voteExistant = undefined
        const [[voteExistant]] = await db.query(
            `
                SELECT id_TopicLikes, type
                FROM topiclikes
                WHERE id_Topics = ?
                  AND id_Users = ?
            `,
            [idTopic, idUtilisateur]
        )

        // Si l'utilisateur a déjà voté avec le même type on refuse
        // Il doit d'abord annuler son vote via DELETE /api/topic/:id/like
        if (voteExistant && voteExistant.type === type) {
            return res.status(409).json({message: `Vous avez déjà mis un ${type} sur ce topic`})
        }

        // Si l'utilisateur a déjà voté mais avec un type différent on met à jour
        // ex: il avait liké et veut maintenant disliker
        if (voteExistant) {
            await db.query(
                `
                    UPDATE topiclikes
                    SET type = ?
                    WHERE id_Topics = ?
                      AND id_Users = ?
                `,
                [type, idTopic, idUtilisateur]
            )

            return res.status(200).json({message: `Vote modifié en ${type}`})
        }

        // Sinon on insère un nouveau vote
        await db.query(
            `
                INSERT INTO topiclikes (type, id_Topics, id_Users)
                VALUES (?, ?, ?)
            `,
            [type, idTopic, idUtilisateur]
        )

        // On renvoie une confirmation
        // Exemple de réponse JSON :
        // { "message": "like ajouté avec succès" }
        res.status(201).json({message: `${type} ajouté avec succès`})

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({message: 'Erreur serveur'})
    }
}

// ===== DELETE /api/topic/:id/like =====
// Annuler son like ou dislike sur un topic
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
exports.deleteTopicLikeDislike = async (req, res) => {

    // On récupère l'id du topic passé dans l'URL (/api/topic/1/like → req.params.id = 1)
    const idTopic = req.params.id

    // On récupère l'id de l'utilisateur connecté depuis le JWT
    const idUtilisateur = req.user.id

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

        // On vérifie que l'utilisateur a bien un vote sur ce topic
        // Exemple de retour si trouvé :
        // vote = { id_TopicLikes: 1, type: 'like' }
        // Exemple de retour si non trouvé :
        // vote = undefined
        const [[vote]] = await db.query(
            `
                SELECT id_TopicLikes, type
                FROM topiclikes
                WHERE id_Topics = ? AND id_Users = ?
            `,
            [idTopic, idUtilisateur]
        )

        // Si aucun vote trouvé, l'utilisateur n'a pas encore voté
        if (!vote) {
            return res.status(404).json({ message: 'Aucun vote à annuler' })
        }

        // On supprime le vote
        await db.query(
            `
                DELETE FROM topiclikes
                WHERE id_Topics = ? AND id_Users = ?
            `,
            [idTopic, idUtilisateur]
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

// ===== PUT /api/topic/:id =====
// Modifier le titre, le corps et les tags d'un topic
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
// Accessible uniquement par le propriétaire du topic ou un admin
exports.putTopicById = async (req, res) => {

    // On récupère l'id du topic passé dans l'URL (/api/topic/1 → req.params.id = 1)
    const idTopic = req.params.id

    // On récupère les données envoyées dans le body de la requête
    const { title, body, tags } = req.body
    // tags est un tableau d'ids de tags existants — ex: [1, 4]

    // On récupère l'utilisateur connecté depuis le JWT
    const idUtilisateur = req.user.id
    const estAdmin      = req.user.is_admin

    try {
        // On vérifie que les champs obligatoires sont présents
        if (!title || !body) {
            return res.status(400).json({ message: 'Le titre et le corps sont obligatoires' })
        }

        // On vérifie que le topic existe
        // Exemple de retour si trouvé :
        // topic = { id_Topics: 1, id_Users: 2 }
        const [[topic]] = await db.query(
            `
                SELECT id_Topics, id_Users
                FROM topics
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // Si le topic n'existe pas on renvoie une erreur 404
        if (!topic) {
            return res.status(404).json({ message: 'Topic introuvable' })
        }

        // On vérifie que l'utilisateur est le propriétaire ou un admin
        // Un utilisateur qui n'est ni l'un ni l'autre ne peut pas modifier le topic
        const estProprietaire = idUtilisateur === topic.id_Users

        if (!estProprietaire && !estAdmin) {
            return res.status(403).json({ message: 'Accès interdit' })
        }

        // On met à jour le titre et le corps du topic
        await db.query(
            `
                UPDATE topics
                SET title = ?, body = ?
                WHERE id_Topics = ?
            `,
            [title, body, idTopic]
        )

        // On met à jour les tags — on supprime d'abord tous les tags existants
        // puis on réinsère les nouveaux
        // C'est plus simple que de comparer les anciens et nouveaux tags
        await db.query(
            `
                DELETE FROM Classifie
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // Si des tags sont fournis on les réinsère
        if (tags && tags.length > 0) {

            // On construit les valeurs à insérer pour chaque tag
            // tags = [1, 4] → values = [[1, 1], [1, 4]]
            const values = tags.map(idTag => [idTopic, idTag])

            await db.query(
                `
                    INSERT INTO Classifie (id_Topics, id_Tags)
                    VALUES ?
                `,
                [values]
            )
        }

        // On renvoie une confirmation
        // Exemple de réponse JSON :
        // { "message": "Topic modifié avec succès" }
        res.status(200).json({ message: 'Topic modifié avec succès' })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== PATCH /api/topic/:id/status =====
// Modifier uniquement le statut d'un topic
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
// Accessible uniquement par le propriétaire du topic ou un admin
exports.patchTopicStatus = async (req, res) => {

    // On récupère l'id du topic passé dans l'URL (/api/topic/1/status → req.params.id = 1)
    const idTopic = req.params.id

    // On récupère le nouveau statut envoyé dans le body
    const { status } = req.body

    // On récupère l'utilisateur connecté depuis le JWT
    const idUtilisateur = req.user.id
    const estAdmin      = req.user.is_admin

    try {
        // On vérifie que le statut est bien une valeur autorisée
        const statutsAutorises = ['ouvert', 'fermé', 'archivé']
        if (!statutsAutorises.includes(status)) {
            return res.status(400).json({ message: 'Statut invalide — valeurs acceptées : ouvert, fermé, archivé' })
        }

        // On vérifie que le topic existe
        // Exemple de retour si trouvé :
        // topic = { id_Topics: 1, id_Users: 2, status: 'ouvert' }
        const [[topic]] = await db.query(
            `
                SELECT id_Topics, id_Users, status
                FROM topics
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // Si le topic n'existe pas on renvoie une erreur 404
        if (!topic) {
            return res.status(404).json({ message: 'Topic introuvable' })
        }

        // On vérifie que l'utilisateur est le propriétaire ou un admin
        const estProprietaire = idUtilisateur === topic.id_Users

        if (!estProprietaire && !estAdmin) {
            return res.status(403).json({ message: 'Accès interdit' })
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

// ===== DELETE /api/topic/:id =====
// Supprimer un topic et tout ce qui y est associé
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
// Accessible uniquement par le propriétaire du topic ou un admin
exports.deleteTopicById = async (req, res) => {

    // On récupère l'id du topic passé dans l'URL (/api/topic/1 → req.params.id = 1)
    const idTopic = req.params.id

    // On récupère l'utilisateur connecté depuis le JWT
    const idUtilisateur = req.user.id
    const estAdmin      = req.user.is_admin

    try {
        // On vérifie que le topic existe
        // Exemple de retour si trouvé :
        // topic = { id_Topics: 1, id_Users: 2 }
        const [[topic]] = await db.query(
            `
                SELECT id_Topics, id_Users
                FROM topics
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // Si le topic n'existe pas on renvoie une erreur 404
        if (!topic) {
            return res.status(404).json({ message: 'Topic introuvable' })
        }

        // On vérifie que l'utilisateur est le propriétaire ou un admin
        const estProprietaire = idUtilisateur === topic.id_Users

        if (!estProprietaire && !estAdmin) {
            return res.status(403).json({ message: 'Accès interdit' })
        }

        // On supprime dans l'ordre pour respecter les contraintes de clés étrangères
        // 1. Les likes sur les messages du topic
        await db.query(
            `
                DELETE l FROM messagelikes l
                JOIN messages m ON l.id_Messages = m.id_Messages
                WHERE m.id_Topics = ?
            `,
            [idTopic]
        )

        // 2. Les likes sur le topic lui-même
        await db.query(
            `
                DELETE FROM topiclikes
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // 3. Les messages du topic
        await db.query(
            `
                DELETE FROM messages
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // 4. Les tags associés au topic
        await db.query(
            `
                DELETE FROM Classifie
                WHERE id_Topics = ?
            `,
            [idTopic]
        )

        // 5. Le topic lui-même en dernier
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