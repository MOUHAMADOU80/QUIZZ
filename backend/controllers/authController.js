
const db = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Connexion de l'administrateur
const connexionAdmin = async (req, res) => {
    try {
        const { nom_utilisateur, mot_de_passe } = req.body;

        // Vérification des champs
        if (
            typeof nom_utilisateur !== "string" ||
            typeof mot_de_passe !== "string" ||
            !nom_utilisateur.trim() ||
            !mot_de_passe
        ) {
            return res.status(400).json({
                message: "Identifiant et mot de passe obligatoires."
            });
        }

        // Recherche de l'administrateur
        const resultat = await db.query(
            `SELECT id, nom_utilisateur, mot_de_passe
             FROM administrateurs
             WHERE nom_utilisateur = $1`,
            [nom_utilisateur.trim()]
        );

        if (resultat.rows.length === 0) {
            return res.status(401).json({
                message: "Identifiants incorrects."
            });
        }

        const admin = resultat.rows[0];

        // Vérification du mot de passe
        const motDePasseValide = await bcrypt.compare(
            mot_de_passe,
            admin.mot_de_passe
        );

        if (!motDePasseValide) {
            return res.status(401).json({
                message: "Identifiants incorrects."
            });
        }

        // Création du jeton JWT
        const token = jwt.sign(
            {
                id: admin.id,
                nom_utilisateur: admin.nom_utilisateur
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "2h"
            }
        );

        res.json({
            message: "Connexion réussie.",
            token: token,
            administrateur: {
                id: admin.id,
                nom_utilisateur: admin.nom_utilisateur
            }
        });

    } catch (error) {
        console.error("Erreur connexion admin :", error.message);

        res.status(500).json({
            message: "Erreur interne du serveur."
        });
    }
};

module.exports = {
    connexionAdmin
};
