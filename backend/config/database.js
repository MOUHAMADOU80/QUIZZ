
const { Pool } = require("pg");
require("dotenv").config();

// Configuration de la connexion à PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

// Vérification de la connexion
pool.connect()
    .then(client => {
        console.log("Connexion à PostgreSQL réussie !");
        client.release();
    })
    .catch(error => {
        console.error("Erreur de connexion à PostgreSQL :", error.message);
    });

module.exports = pool;
