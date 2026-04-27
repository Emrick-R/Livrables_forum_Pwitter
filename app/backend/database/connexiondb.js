/*
 * On configure ici la connexion à la base de données MySQL.
 * On utilise mysql2/promise pour pouvoir utiliser async/await dans les controllers.
 * On utilise dotenv pour ne jamais écrire les credentials en dur dans le code.
 */
// On importe mysql2 en mode promise — permet d'utiliser async/await au lieu des callbacks. permet à node de comprendre le SQL
const mysql = require('mysql2/promise');
// dotenv.config() — charge les variables du fichier .env dans process.env
require('dotenv').config(); // permet d'utiliser les variables du .env

// On crée un pool de connexions — gère plusieurs connexions simultanées
// Si 10 utilisateurs font des requêtes en même temps, le pool les distribue sans bloquer.
const db = mysql.createPool({
    // process.env.DB_HOST — adresse du serveur MySQL (localhost pour MAMP)
    host: process.env.DB_HOST,
    // process.env.DB_USER — utilisateur MySQL (root par défaut sur MAMP)
    user: process.env.DB_USER,
    // process.env.DB_PASSWORD — mot de passe MySQL (root par défaut sur MAMP)
    password: process.env.DB_PASSWORD,
    // process.env.DB_NAME — nom de la base de données (Pwitter)
    database: process.env.DB_NAME,
    // process.env.DB_PORT — port MySQL (3306 sur Windows, 8889 sur Mac avec MAMP)
    port: process.env.DB_PORT 
});

// On exporte le pool pour que chaque controller puisse l'importer via require
// Grâce au cache de require, le pool n'est créé qu'une seule fois pour toute l'application.
module.exports = db;