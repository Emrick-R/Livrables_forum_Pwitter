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

// ===== Inscription =====
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
            'SELECT id_Users FROM users WHERE email = ?', [mail]
        )

        // Si on trouve un résultat, on refuse l'inscription avec un code 409 (conflit)
        if (existant.length > 0) {
            return res.status(409).json({ message: 'Cet email est déjà utilisé.' })
        }

        // On hache le mot de passe avant de le stocker
        // Le 10 correspond au nombre de tours de hachage — jamais stocker un mdp en clair.
        const motDePasseHache = await bcrypt.hash(motDePasse, 10)

        // On prépare la requête d'insertion
        // On utilise des ? pour éviter les injections SQL
        const sql = `
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?, ?, ?)
        `

        // On envoie la requête à la base de données avec les valeurs dans le bon ordre
        await db.query(sql, [username, mail, motDePasseHache])

        // On confirme que l'inscription s'est bien passée avec un code 201 (créé)
        res.status(201).json({ message: 'Inscription réussie !' })

    } catch (erreur) {
        // On affiche l'erreur dans le terminal pour déboguer
        console.error(erreur)
        // On informe le client qu'une erreur s'est produite côté serveur
        res.status(500).json({ message: "Erreur lors de l'inscription." })
    }
}

// ===== Connexion =====
exports.connecterClient = async (req, res) => {

    // On récupère les données envoyées par le formulaire de connexion
    const mail = req.body.email
    const motDePasse = req.body.mdp

    try {
        // On cherche un client dans la base de données avec cet email
        // Récupération directe des résultats de la requête (les données) via la déstructuration [existant].
        // Cela permet d'ignorer le deuxième élément renvoyé par db.query (les métadonnées techniques).
        const [resultats] = await db.query(
            'SELECT * FROM Users WHERE email = ?', [mail]
        )

        // Si on ne trouve personne, on renvoie une erreur générique
        // On ne précise pas si c'est l'email ou le mot de passe qui est faux pour ne pas donner d'informations à un attaquant.
        if (resultats.length === 0) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect.' })
        }

        // On prend le premier résultat — un email est unique donc il ne peut y en avoir qu'un
        const utilisateur = resultats[0]

        // On compare le mot de passe tapé avec le hash stocké en base
        // bcrypt.compare retourne true si les deux correspondent, false sinon.
        const mdpCorrect = await bcrypt.compare(motDePasse, utilisateur.password_hash)

        // Si le mot de passe ne correspond pas, on renvoie la même erreur générique
        if (!mdpCorrect) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect.' })
        }

        // On crée un jeton JWT signé avec les infos de l'utilisateur
        // Ce jeton sera stocké côté client pour identifier l'utilisateur sur les prochaines requêtes.
        const jeton = jwt.sign(
            { id: utilisateur.id_Users, username: utilisateur.username }, // on embarque l'id et l'username
            process.env.CLEJWT,  // on utilise la clé secrète du .env — jamais en dur dans le code
            { expiresIn: '24h' } // on expire le jeton après 24h pour la sécurité
        )

        // On renvoie le jeton et le prénom pour personnaliser l'interface côté front
        res.status(200).json({
            message: 'Connexion réussie !',
            username: utilisateur.username,
            token: jeton
        })

    } catch (erreur) {
        console.error(erreur)
        res.status(500).json({ message: 'Erreur serveur' })
    }
}

// ===== Récupérer un utilisateur par son ID =====
exports.getUtilisateurById = async (req, res) => {
    try {
        const [result] = await db.query(
            'SELECT id_Users, username, email FROM Users WHERE id_Users = ?',
            [req.params.id]
        )

        if (!result[0]) {
            return res.status(404).json({ code: 404, message: 'Utilisateur introuvable' })
        }

        res.status(200).json({ code: 200, message: 'Succès', utilisateur: result[0] })

    } catch (err) {
        console.error(err)
        res.status(500).json({ code: 500, message: 'Erreur serveur' })
    }
}

// ===== Récupérer les topics d'un utilisateur=====

// ===== Récupérer les messages d'un utilisateur=====




