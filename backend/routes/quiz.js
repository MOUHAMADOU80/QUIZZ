
const verifierAdmin = require("../middlewares/authMiddleware");
const express = require("express");
const router = express.Router();

const db = require("../config/database");

// Récupérer le QCM actif
router.get("/actif", async (req, res) => {
    try {
        const resultat = await db.query(`
            SELECT id, titre, description, duree_minutes,
                   nombre_questions
            FROM quiz
            WHERE actif = TRUE
            LIMIT 1
        `);

        if (resultat.rows.length === 0) {
            return res.status(404).json({
                message: "Aucun QCM n'est actuellement disponible."
            });
        }

        res.json({
            quiz: resultat.rows[0]
        });

    } catch (error) {
        console.error("Erreur récupération QCM :", error.message);

        res.status(500).json({
            message: "Erreur lors de la récupération du QCM."
        });
    }
}
);
// Récupérer les informations d'un QCM (administrateur)
router.get("/:quizId", verifierAdmin, async (req, res) => {
    try {
        const { quizId } = req.params;

        const resultat = await db.query(
            `SELECT id, titre, description, actif,
                    duree_minutes, nombre_questions
             FROM quiz
             WHERE id = $1`,
            [quizId]
        );

        if (resultat.rows.length === 0) {
            return res.status(404).json({
                message: "QCM introuvable."
            });
        }

        res.json({ quiz: resultat.rows[0] });

    } catch (erreur) {
        console.error(erreur);

        res.status(500).json({
            message: "Erreur lors de la récupération du QCM."
        });
    }
});
// Créer un nouveau QCM
router.post("/", verifierAdmin, async (req, res) => {
    try {
        const { titre, description } = req.body;

        if (
            typeof titre !== "string" ||
            !titre.trim() ||
            (description !== undefined && typeof description !== "string")
        ) {
            return res.status(400).json({
                message: "Le titre est obligatoire et la description doit être valide."
            });
        }

        const resultat = await db.query(
            `INSERT INTO quiz
             (titre, description, duree_minutes, nombre_questions, actif)
             VALUES ($1, $2, $3, $4, FALSE)
             RETURNING id, titre, description, duree_minutes,
                       nombre_questions, actif`,
            [titre.trim(), description?.trim() || null, 30, 50]
        );

        res.status(201).json({
            message: "QCM créé avec succès !",
            quiz: resultat.rows[0]
        });

    } catch (error) {
        console.error("Erreur création QCM :", error.message);

        res.status(500).json({
            message: "Erreur lors de la création du QCM."
        });
    }
});


 // Activer un QCM après vérification
router.patch("/:quizId/activer", verifierAdmin, async (req, res) => {
    const client = await db.connect();

    try {
        const { quizId } = req.params;

        if (!/^\d+$/.test(quizId)) {
            return res.status(400).json({
                message: "Identifiant du QCM invalide."
            });
        }

        await client.query("BEGIN");

        // Vérifier que le QCM existe
        const resultat = await client.query(
            `SELECT id, titre, actif, nombre_questions
             FROM quiz
             WHERE id = $1
             FOR UPDATE`,
            [Number(quizId)]
        );

        if (resultat.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "QCM introuvable."
            });
        }

        const quiz = resultat.rows[0];

        if (quiz.actif) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Ce QCM est déjà actif."
            });
        }

        // Vérifier qu'aucun autre QCM n'est actif
        const autreQuiz = await client.query(
            `SELECT id FROM quiz
             WHERE actif = TRUE
             LIMIT 1`
        );

        if (autreQuiz.rows.length > 0) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                message: "Un autre QCM est déjà actif."
            });
        }

        // Vérifier le nombre de questions et de propositions
        const verification = await client.query(
            `SELECT
                COUNT(*) AS total_questions,
                COUNT(*) FILTER (
                    WHERE nombre_options <> 4
                    OR bonnes_reponses = 0
                ) AS questions_invalides
             FROM (
                SELECT
                    q.id,
                    COUNT(o.id) AS nombre_options,
                    COUNT(o.id) FILTER (
                        WHERE o.est_correcte = TRUE
                    ) AS bonnes_reponses
                FROM questions q
                LEFT JOIN options o ON o.question_id = q.id
                WHERE q.quiz_id = $1
                GROUP BY q.id
             ) AS controle`,
            [Number(quizId)]
        );

        const total = Number(
            verification.rows[0].total_questions
        );

        const invalides = Number(
            verification.rows[0].questions_invalides
        );

        if (total !== 50 || invalides > 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Le QCM ne peut pas être activé.",
                nombre_questions: total,
                questions_invalides: invalides,
                conditions: [
                    "Le QCM doit contenir exactement 50 questions.",
                    "Chaque question doit avoir exactement 4 propositions.",
                    "Chaque question doit avoir au moins une bonne réponse."
                ]
            });
        }

        // Activer le QCM
        await client.query(
            `UPDATE quiz
             SET actif = TRUE
             WHERE id = $1`,
            [Number(quizId)]
        );

        await client.query("COMMIT");

        res.json({
            message: "QCM activé avec succès !",
            titre: quiz.titre
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Erreur activation QCM :", error.message);

        res.status(500).json({
            message: "Erreur lors de l'activation du QCM."
        });

    } finally {
        client.release();
    }
});
// Désactiver un QCM et interrompre les tentatives en cours
router.patch("/:quizId/desactiver", verifierAdmin, async (req, res) => {
    const { quizId } = req.params;

    const client = await db.connect();

    try {
        await client.query("BEGIN");

        // Vérifier que le QCM existe et le désactiver
        const resultat = await client.query(
            `UPDATE quiz
             SET actif = FALSE
             WHERE id = $1 AND actif = TRUE
             RETURNING id`,
            [quizId]
        );

        if (resultat.rowCount === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "QCM introuvable ou déjà désactivé."
            });
        }

        // Interrompre toutes les tentatives en cours
        await client.query(
            `UPDATE tentatives
             SET statut = 'Interrompue',
                 date_fin = CURRENT_TIMESTAMP
             WHERE quiz_id = $1
             AND statut = 'En cours'`,
            [quizId]
        );

        await client.query("COMMIT");

        res.json({
            message: "QCM désactivé. Toutes les tentatives en cours ont été interrompues."
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(error.message);

        res.status(500).json({
            message: "Erreur lors de la désactivation du QCM."
        });

    } finally {
        client.release();
    }
});
// Récupérer les questions du QCM actif pour les participants
router.get("/actif/questions", async (req, res) => {
    try {
        const resultat = await db.query(
            `SELECT
                z.id,
                z.titre,
                z.description,
                z.duree_minutes,
                z.nombre_questions,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', q.id,
                            'contenu', q.contenu,
                            'ordre', q.ordre,
                            'options', (
                                SELECT COALESCE(
                                    json_agg(
                                        json_build_object(
                                            'id', o.id,
                                            'contenu', o.contenu
                                        ) ORDER BY o.id
                                    ),
                                    '[]'::json
                                )
                                FROM options o
                                WHERE o.question_id = q.id
                            )
                        ) ORDER BY q.ordre
                    ) FILTER (WHERE q.id IS NOT NULL),
                    '[]'::json
                ) AS questions
             FROM quiz z
             LEFT JOIN questions q ON q.quiz_id = z.id
             WHERE z.actif = TRUE
             GROUP BY z.id`
        );

        if (resultat.rowCount === 0) {
            return res.status(404).json({
                message: "Aucun QCM actif actuellement."
            });
        }

        res.json(resultat.rows[0]);

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            message: "Erreur lors de la récupération des questions."
        });
    }
});
module.exports = router;
