
const express = require("express");
const cors = require("cors");
const quizRoutes = require("./routes/quiz");
const authRoutes = require("./routes/auth");
const db = require("./config/database");
const participantsRoutes = require("./routes/participants");
const questionsRoutes = require("./routes/questions");
require("dotenv").config();



const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/api/participants", participantsRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionsRoutes);
// Routes
app.get("/", (req, res) => {
    res.send("Bienvenue sur l'API de notre plateforme QCM !");
});

app.get("/api/test-db", async (req, res) => {
    try {
        const resultat = await db.query(
            "SELECT current_database() AS nom_base"
        );

        res.json({
            message: "Connexion à la base réussie !",
            base: resultat.rows[0].nom_base
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Erreur lors de la requête SQL"
        });
    }
});


// Démarrage du serveur
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
