
const express = require("express");
const router = express.Router();

const { connexionAdmin } = require("../controllers/authController");

// Route de connexion administrateur
router.post("/connexion", connexionAdmin);

module.exports = router;

const verifierAdmin = require("../middlewares/authMiddleware");

// Vérifier l'identité de l'administrateur connecté
router.get("/profil", verifierAdmin, (req, res) => {
    res.json({
        message: "Accès autorisé !",
        administrateur: req.admin
    });
});