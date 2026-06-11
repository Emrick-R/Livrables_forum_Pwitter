/*
 * On gère ici toute la logique métier liée aux utilisateurs.
 * On traite l'inscription, la connexion et la récupération des données d'un client.
 * On utilise bcrypt pour sécuriser les mots de passe et JWT pour l'authentification.
 */

// On importe la connexion à la base de données
const db = require('../database/connexiondb.js')
// On importe bcrypt pour hacher et comparer les mots de passe
const bcrypt = require('bcrypt')
// On importe jsonwebtoken pour créer et signer les jetons d'authentification
const jwt = require('jsonwebtoken')

// ===== POST /api/inscription =====
// Inscription
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
exports.inscrireClient = async (req, res) => {

    // On récupère les données envoyées par le formulaire d'inscription
    // Les noms correspondent aux id des inputs dans inscription.html
    const username = req.body.username
    const mail = req.body.email
    const motDePasse = req.body.password_hash

    try {
        // On vérifie si un compte existe déjà avec cet email
        // pour éviter les doublons en base de données
        // On utilise la destructuration ici pour ne prendre uniquement le résultat intéressant et non les métadonnées renvoyées par la db
        const [existant] = await db.query(
            `
            SELECT id_Users
            FROM users
            WHERE email = ? OR username = ?
            `,
            [mail, username] //mail = 1er ? et username = 2e ?
        )

        // Si on trouve un résultat sur existant, on refuse l'inscription avec un code 409 (conflit)
        if (existant.length > 0) {
            return res.status(409).json({message: 'Cet email est déjà utilisé.'})
        }

        // On hache le mot de passe avant de le stocker
        // Le 10 correspond au nombre de tours de hachage — jamais stocker un mdp en clair.
        const motDePasseHache = await bcrypt.hash(motDePasse, 10)

        // On prépare la requête d'insertion
        // On utilise des ? pour éviter les injections SQL
        const sql =
            `
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
            `

        // On envoie la requête à la base de données avec les valeurs dans le bon ordre
        await db.query(sql, [username, mail, motDePasseHache])

        // On confirme que l'inscription s'est bien passée avec un code 201 (créé)
        res.status(201).json({message: 'Inscription réussie !'})

    } catch (erreur) {
        // On affiche l'erreur dans le terminal pour déboguer
        console.error(erreur)
        // On informe le client qu'une erreur s'est produite côté serveur
        res.status(500).json({message: "Erreur lors de l'inscription."})
    }
}

// ===== POST /api/connexion =====
// Connexion
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
exports.connecterClient = async (req, res) => {

    // On récupère les données envoyées par le formulaire de connexion
    const identifiant = req.body.email
    const motDePasse = req.body.mdp

    try {
        // On cherche un client dans la base de données avec cet email
        // Récupération directe des résultats de la requête (les données) via la déstructuration [existant].
        // Cela permet d'ignorer le deuxième élément renvoyé par db.query (les métadonnées techniques).
        // Retourne : resultats = [ { id_Users: 2, username: 'user1', email: '...' } ]
        const [resultats] = await db.query(
            `
            SELECT * FROM Users
            WHERE email = ? OR username = ? 
            `,
            [identifiant, identifiant]
        )

        // Si on ne trouve personne, on renvoie une erreur générique
        // On ne précise pas si c'est l'email ou le mot de passe qui est faux pour ne pas donner d'informations à un attaquant.
        if (resultats.length === 0) {
            return res.status(401).json({message: 'Email ou mot de passe incorrect.'})
        }

        // On prend le premier résultat — un email est unique donc il ne peut y en avoir qu'un
        const utilisateur = resultats[0]

        // On compare le mot de passe tapé avec le hash stocké en base
        // bcrypt.compare retourne true si les deux correspondent, false sinon.
        const mdpCorrect = await bcrypt.compare(motDePasse, utilisateur.password_hash)

        // Si le mot de passe ne correspond pas, on renvoie la même erreur générique
        if (!mdpCorrect) {
            return res.status(401).json({message: 'Email ou mot de passe incorrect.'})
        }

        // On crée un jeton JWT signé avec les infos de l'utilisateur
        // Ce jeton sera stocké côté client pour identifier l'utilisateur sur les prochaines requêtes.
        const jeton = jwt.sign(
            {id: utilisateur.id_Users, username: utilisateur.username, is_admin: utilisateur.is_admin}, // on embarque l'id, l'username et s'il est admin
            process.env.CLEJWT,  // on utilise la clé secrète du .env — jamais en dur dans le code
            {expiresIn: '24h'} // on expire le jeton après 24h pour la sécurité
        )

        // On renvoie le jeton et le prénom pour personnaliser l'interface côté front
        res.status(200).json({
            message: 'Connexion réussie !',
            username: utilisateur.username,
            token: jeton
        })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({message: 'Erreur serveur'})
    }
}

// ===== GET /api/utilisateur/topics =====
// Récupère tous les topics créés par l'utilisateur connecté
// Nécessite d'être authentifié — req.user est alimenté par le middleware verifierJWT
exports.getMesTopics = async (req, res) => {

    // On récupère l'id de l'utilisateur depuis le JWT
    // Pas besoin de le passer dans l'URL — il est déjà dans le token
    const idUtilisateur = req.user.id

    try {
        // On récupère tous les topics de cet utilisateur avec leurs tags associés
        // JOIN Classifie pour faire le lien entre topics et tags
        // JOIN Tags pour récupérer le nom du tag
        // GROUP BY pour regrouper les lignes par topic — sans ça on aurait une ligne par tag
        // GROUP_CONCAT pour fusionner tous les tags d'un topic en une seule chaîne
        // Exemple de retour :
        // topics = [
        //     { id_Topics: 1, title: 'Topic Film', status: 'ouvert', created_at: '2026-01-01T10:00:00.000Z', tags: 'Film,Meme' },
        //     { id_Topics: 2, title: 'Topic Jeux-video', status: 'ouvert', created_at: '2026-01-01T11:00:00.000Z', tags: 'Jeux-video' }
        // ]
        // Si aucun topic : topics = []
        const [topics] = await db.query(
            `
                SELECT t.id_Topics, t.title, t.status, t.created_at,
                       GROUP_CONCAT(tg.name) AS tags
                FROM topics t
                LEFT JOIN Classifie c ON t.id_Topics = c.id_Topics
                LEFT JOIN Tags tg ON c.id_Tags = tg.id_Tags
                WHERE t.id_Users = ?
                GROUP BY t.id_Topics
                ORDER BY t.created_at DESC
            `,
            [idUtilisateur]
        )

        // GROUP_CONCAT retourne une chaîne "Film,Meme" — on la transforme en tableau ['Film', 'Meme']
        // Si aucun tag, tags vaut null — on retourne un tableau vide []
        const topicsAvecTags = topics.map(topic => ({
            ...topic,               // on copie toutes les propriétés existantes dans un nouvel objet
            tags: topic.tags        // on écrase uniquement la propriété tags
                ? topic.tags.split(',')
                : []
        }))

        // On renvoie les topics trouvés avec leurs tags
        // Exemple de réponse JSON :
        // {
        //     "topics": [
        //         {
        //             "id_Topics": 1,
        //             "title": "Topic Film",
        //             "status": "ouvert",
        //             "created_at": "2026-01-01T10:00:00.000Z",
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

/// ===== GET /api/utilisateur/:id =====
// Récupère un utilisateur par son ID
// Accessible publiquement — pas besoin de JWT
exports.getUtilisateurById = async (req, res) => {

    // On récupère l'id passé dans l'URL (/api/utilisateur/2 → req.params.id = 2)
    const idUtilisateur = req.params.id

    try {
        // Double déstructuration — on récupère directement la première ligne
        // sans passer par result[0]
        // Exemple de retour si trouvé :
        // utilisateur = { id_Users: 2, username: 'user1', email: 'u1@mail.com' }
        const [[utilisateur]] = await db.query(
            `
                SELECT id_Users, username, email
                FROM users
                WHERE id_Users = ?
            `,
            [idUtilisateur]
        )

        // Si aucun utilisateur trouvé, on renvoie une erreur 404
        if (!utilisateur) {
            return res.status(404).json({ message: 'Utilisateur introuvable' })
        }

        // On renvoie l'utilisateur trouvé
        // Exemple de réponse JSON :
        // { "utilisateur": { "id_Users": 2, "username": "user1", "email": "u1@mail.com" } }
        res.status(200).json({ utilisateur })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== GET /api/utilisateur/:id/topics =====
// Récupère tous les topics créés par un utilisateur spécifique
// Accessible publiquement — pas besoin de JWT
exports.getUtilisateurTopics = async (req, res) => {

    // On récupère l'id passé dans l'URL (/api/utilisateur/2/topics → req.params.id = 2)
    const idUtilisateur = req.params.id

    try {
        // On vérifie d'abord que l'utilisateur existe
        // Exemple de retour si trouvé :
        // utilisateur = { id_Users: 2, username: 'user1' }
        const [[utilisateur]] = await db.query(
            `
                SELECT id_Users, username
                FROM users
                WHERE id_Users = ?
            `,
            [idUtilisateur]
        )

        // Si l'utilisateur n'existe pas on renvoie une erreur 404
        if (!utilisateur) {
            return res.status(404).json({ message: 'Utilisateur introuvable' })
        }

        // On récupère tous les topics de cet utilisateur avec leurs tags associés
        // JOIN Classifie pour faire le lien entre topics et tags
        // JOIN Tags pour récupérer le nom du tag
        // GROUP BY pour regrouper les lignes par topic — sans ça on aurait une ligne par tag
        // GROUP_CONCAT pour fusionner tous les tags d'un topic en une seule chaîne
        // Exemple de retour :
        // topics = [
        //     { id_Topics: 1, title: 'Topic Film', status: 'ouvert', created_at: '2026-01-01T10:00:00.000Z', tags: 'Film,Meme' },
        //     { id_Topics: 2, title: 'Topic Jeux-video', status: 'ouvert', created_at: '2026-01-01T11:00:00.000Z', tags: 'Jeux-video' }
        // ]
        // Si aucun topic : topics = []
        const [topics] = await db.query(
            `
                SELECT t.id_Topics, t.title, t.status, t.created_at,
                       GROUP_CONCAT(tg.name) AS tags
                FROM topics t
                         LEFT JOIN Classifie c ON t.id_Topics = c.id_Topics
                         LEFT JOIN Tags tg ON c.id_Tags = tg.id_Tags
                WHERE t.id_Users = ?
                GROUP BY t.id_Topics
                ORDER BY t.created_at DESC
            `,
            [idUtilisateur]
        )

        // GROUP_CONCAT retourne une chaîne "Film,Meme" — on la transforme en tableau ['Film', 'Meme']
        // Si aucun tag, tags vaut null — on retourne un tableau vide []
        const topicsAvecTags = topics.map(topic => ({
            ...topic,               // on copie toutes les propriétés existantes dans un nouvel objet
            tags: topic.tags        // on écrase uniquement la propriété tags
                ? topic.tags.split(',')
                : []
        }))

        // On renvoie l'utilisateur et ses topics avec leurs tags
        // Exemple de réponse JSON :
        // {
        //     "utilisateur": { "id_Users": 2, "username": "user1" },
        //     "topics": [
        //         {
        //             "id_Topics": 1,
        //             "title": "Topic Film",
        //             "status": "ouvert",
        //             "created_at": "2026-01-01T10:00:00.000Z",
        //             "tags": ["Film", "Meme"]
        //         }
        //     ]
        // }
        res.status(200).json({ utilisateur, topics: topicsAvecTags })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}



