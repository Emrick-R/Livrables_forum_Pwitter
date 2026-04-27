const mysql = require('mysql2/promise');// permet à node de comprendre le SQL
require('dotenv').config(); // permet d'utiliser les variables du .env

// on initialise les credentials via dotenv
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT 
});

module.exports = db; // on exporte l'objet de connexion pour qu'app.js puisse l'utiliser