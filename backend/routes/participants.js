
const express = require("express");
const router = express.Router();

const db = require("../config/database");

async function calculerScore(tentativeId, quizId) {
    const resultat = await db.query(
        `SELECT COUNT(*)::INTEGER AS score
         FROM questions q
         WHERE q.quiz_id = $1
         AND (
             SELECT COUNT(*)
             FROM options o
             WHERE o.question_id = q.id
             AND o.est_correcte = TRUE
         ) = (
             SELECT COUNT(*)
             FROM reponses r
             JOIN options o ON o.id = r.option_id
             WHERE r.tentative_id = $2
             AND r.question_id = q.id
             AND o.est_correcte = TRUE
         )
         AND (
             SELECT COUNT(*)
             FROM reponses r
             WHERE r.tentative_id = $2
             AND r.question_id = q.id
         ) = (
             SELECT COUNT(*)
             FROM options o
             WHERE o.question_id = q.id
             AND o.est_correcte = TRUE
         )
         AND EXISTS (
             SELECT 1
             FROM options o
             WHERE o.question_id = q.id
             AND o.est_correcte = TRUE
         )`,
        [quizId, tentativeId]
    );

    return resultat.rows[0].score;
}


// Inscription d'un participant
router.post("/", async (req, res) => {
    try {
        const { nom, prenom, cycle } = req.body;

        if (
            typeof nom !== "string" ||
            typeof prenom !== "string" ||
            typeof cycle !== "string" ||
            !nom.trim() ||
            !prenom.trim() ||
            !cycle.trim()
        ) {
            return res.status(400).json({
                message: "Tous les champs sont obligatoires."
            });
        }

        const cyclesAutorises = ["Licence", "Master", "Docteur"];

        if (!cyclesAutorises.includes(cycle)) {
            return res.status(400).json({
                message: "Cycle invalide."
            });
        }

        const resultat = await db.query(
            `INSERT INTO participants (nom, prenom, cycle)
             VALUES ($1, $2, $3)
             RETURNING id, nom, prenom, cycle`,
            [nom.trim(), prenom.trim(), cycle]
        );

        res.status(201).json({
            message: "Inscription réussie !",
            participant: resultat.rows[0]
        });

    } catch (error) {
        console.error("Erreur inscription :", error.message);

        res.status(500).json({
            message: "Une erreur est survenue lors de l'inscription."
        });
    }
});

// Démarrer une tentative de QCM
router.post("/:participantId/tentative", async (req, res) => {
    const participantId = Number(req.params.participantId);

    if (!Number.isInteger(participantId) || participantId <= 0) {
        return res.status(400).json({
            message: "Identifiant du participant invalide."
        });
    }

    const client = await db.connect();
    let transactionCommencee = false;

    try {
        await client.query("BEGIN");
        transactionCommencee = true;

        // Vérifier et verrouiller le QCM actif
        const quizResultat = await client.query(
            `SELECT id, titre, duree_minutes, nombre_questions
             FROM quiz
             WHERE actif = TRUE
             FOR UPDATE`
        );

        if (quizResultat.rowCount === 0) {
            await client.query("ROLLBACK");
            transactionCommencee = false;

            return res.status(404).json({
                message: "Aucun QCM actif actuellement."
            });
        }

        const quiz = quizResultat.rows[0];

        // Vérifier que le participant existe
        const participantResultat = await client.query(
            `SELECT id FROM participants WHERE id = $1`,
            [participantId]
        );

        if (participantResultat.rowCount === 0) {
            await client.query("ROLLBACK");
            transactionCommencee = false;

            return res.status(404).json({
                message: "Participant introuvable."
            });
        }

        // Créer la tentative
        const tentativeResultat = await client.query(
            `INSERT INTO tentatives (participant_id, quiz_id)
             VALUES ($1, $2)
             RETURNING id, participant_id, quiz_id,
                       score, date_debut, statut`,
            [participantId, quiz.id]
        );

        await client.query("COMMIT");
        transactionCommencee = false;

        res.status(201).json({
            message: "Tentative démarrée avec succès.",
            tentative: tentativeResultat.rows[0],
            quiz: {
                id: quiz.id,
                titre: quiz.titre,
                duree_minutes: quiz.duree_minutes,
                nombre_questions: quiz.nombre_questions
            }
        });

    } catch (error) {
        if (transactionCommencee) {
            await client.query("ROLLBACK");
        }

        // Une tentative existe déjà pour ce participant et ce QCM
        if (error.code === "23505") {
            return res.status(409).json({
                message: "Ce participant a déjà effectué ou commencé ce QCM."
            });
        }

        console.error("Erreur démarrage tentative :", error.message);

        res.status(500).json({
            message: "Erreur lors du démarrage de la tentative."
        });

    } finally {
        client.release();
    }
});

// Vérifier le temps restant d'une tentative
router.get("/:participantId/tentative/:tentativeId/temps", async (req, res) => {
    const participantId = Number(req.params.participantId);
    const tentativeId = Number(req.params.tentativeId);

    if (
        !Number.isInteger(participantId) ||
        participantId <= 0 ||
        !Number.isInteger(tentativeId) ||
        tentativeId <= 0
    ) {
        return res.status(400).json({
            message: "Identifiant invalide."
        });
    }

    try {
        const resultat = await db.query(
            `SELECT
                t.id,
                t.quiz_id,
                t.statut,
                t.date_debut,
                z.duree_minutes,
                GREATEST(
                    0,
                    CEIL(EXTRACT(EPOCH FROM (
                        t.date_debut
                        + (z.duree_minutes * INTERVAL '1 minute')
                        - CURRENT_TIMESTAMP
                    )))
                )::INTEGER AS secondes_restantes
             FROM tentatives t
             JOIN quiz z ON z.id = t.quiz_id
             WHERE t.id = $1
             AND t.participant_id = $2`,
            [tentativeId, participantId]
        );

        if (resultat.rowCount === 0) {
            return res.status(404).json({
                message: "Tentative introuvable."
            });
        }

        const tentative = resultat.rows[0];

        // Si le temps est écoulé, expirer la tentative
        if (
    tentative.statut === "En cours" &&
    tentative.secondes_restantes <= 0
) {
    // Calculer le score des réponses déjà enregistrées
    const score = await calculerScore(
        tentativeId,
        tentative.quiz_id
    );

    // Enregistrer le score et expirer la tentative
    const miseAJour = await db.query(
        `UPDATE tentatives
         SET score = $1,
             statut = 'Expirée',
             date_fin = CURRENT_TIMESTAMP
         WHERE id = $2
         AND statut = 'En cours'`,
        [score, tentativeId]
    );

    if (miseAJour.rowCount === 0) {
        return res.status(403).json({
            message: "Cette tentative a déjà été interrompue ou terminée."
        });
    }

    return res.json({
        statut: "Expirée",
        score: score,
        secondes_restantes: 0,
        message: "Le temps est écoulé. Votre QCM a été corrigé."
    });
    }

        res.json({
            statut: tentative.statut,
            secondes_restantes:
                tentative.statut === "En cours"
                    ? tentative.secondes_restantes
                    : 0,
            duree_minutes: tentative.duree_minutes
        });

    } catch (error) {
        console.error("Erreur vérification du temps :", error.message);

        res.status(500).json({
            message: "Erreur lors de la vérification du temps."
        });
    }
});


// Enregistrer les réponses d'une question
router.post("/:participantId/tentative/:tentativeId/reponses", async (req, res) => {
    const participantId = Number(req.params.participantId);
    const tentativeId = Number(req.params.tentativeId);
    const { questionId, optionsIds } = req.body;

    if (
        !Number.isInteger(participantId) || participantId <= 0 ||
        !Number.isInteger(tentativeId) || tentativeId <= 0 ||
        !Number.isInteger(questionId) || questionId <= 0 ||
        !Array.isArray(optionsIds) ||
        optionsIds.length < 1 ||
        optionsIds.length > 4 ||
        !optionsIds.every(id => Number.isInteger(id) && id > 0) ||
        new Set(optionsIds).size !== optionsIds.length
    ) {
        return res.status(400).json({
            message: "Données de réponse invalides."
        });
    }

    const client = await db.connect();
    let transactionCommencee = false;

    try {
        await client.query("BEGIN");
        transactionCommencee = true;

        // Vérifier et verrouiller la tentative
        const tentativeResultat = await client.query(
            `SELECT
                t.id,
                t.quiz_id,
                t.statut,
                z.duree_minutes,
                (
                    t.date_debut
                    + (z.duree_minutes * INTERVAL '1 minute')
                    <= CURRENT_TIMESTAMP
                ) AS temps_ecoule
             FROM tentatives t
             JOIN quiz z ON z.id = t.quiz_id
             WHERE t.id = $1
             AND t.participant_id = $2
             FOR UPDATE OF t`,
            [tentativeId, participantId]
        );

        if (tentativeResultat.rowCount === 0) {
            await client.query("ROLLBACK");
            transactionCommencee = false;

            return res.status(404).json({
                message: "Tentative introuvable."
            });
        }

        const tentative = tentativeResultat.rows[0];

        if (tentative.statut !== "En cours") {
            await client.query("ROLLBACK");
            transactionCommencee = false;

            return res.status(403).json({
                message: "Cette tentative n'est plus en cours."
            });
        }

        // Vérifier l'expiration
        if (tentative.temps_ecoule) {
            // Calculer le score des réponses déjà enregistrées
            const score = await calculerScore(
                tentativeId,
                tentative.quiz_id
            );

            // Enregistrer le score et expirer la tentative
            await client.query(
                `UPDATE tentatives
                SET score = $1,
                    statut = 'Expirée',
                    date_fin = CURRENT_TIMESTAMP
                WHERE id = $2`,
                [score, tentativeId]
            );

            await client.query("COMMIT");
            transactionCommencee = false;

            return res.status(403).json({
                message: "Le temps est écoulé. Votre QCM a été corrigé.",
                score: score,
                statut: "Expirée"
            });
        }

        // Vérifier que la question appartient au QCM de la tentative
        const questionResultat = await client.query(
            `SELECT id
             FROM questions
             WHERE id = $1
             AND quiz_id = $2`,
            [questionId, tentative.quiz_id]
        );

        if (questionResultat.rowCount === 0) {
            await client.query("ROLLBACK");
            transactionCommencee = false;

            return res.status(400).json({
                message: "Cette question n'appartient pas à ce QCM."
            });
        }

        // Vérifier que toutes les options appartiennent à cette question
        const optionsResultat = await client.query(
            `SELECT id
             FROM options
             WHERE question_id = $1
             AND id = ANY($2::INTEGER[])`,
            [questionId, optionsIds]
        );

        if (optionsResultat.rowCount !== optionsIds.length) {
            await client.query("ROLLBACK");
            transactionCommencee = false;

            return res.status(400).json({
                message: "Une ou plusieurs options sont invalides."
            });
        }

        // Remplacer les anciennes réponses à cette question
        await client.query(
            `DELETE FROM reponses
             WHERE tentative_id = $1
             AND question_id = $2`,
            [tentativeId, questionId]
        );

        // Enregistrer les nouvelles sélections
        for (const optionId of optionsIds) {
            await client.query(
                `INSERT INTO reponses
                    (tentative_id, question_id, option_id)
                 VALUES ($1, $2, $3)`,
                [tentativeId, questionId, optionId]
            );
        }

        await client.query("COMMIT");
        transactionCommencee = false;

        res.status(200).json({
            message: "Réponse enregistrée avec succès."
        });

    } catch (error) {
        if (transactionCommencee) {
            await client.query("ROLLBACK");
        }

        console.error("Erreur enregistrement réponse :", error.message);

        res.status(500).json({
            message: "Erreur lors de l'enregistrement de la réponse."
        });

    } finally {
        client.release();
    }
});

// Soumettre le QCM et calculer le score
router.post("/:participantId/tentative/:tentativeId/soumettre", async (req, res) => {
    const participantId = Number(req.params.participantId);
    const tentativeId = Number(req.params.tentativeId);

    if (
        !Number.isInteger(participantId) || participantId <= 0 ||
        !Number.isInteger(tentativeId) || tentativeId <= 0
    ) {
        return res.status(400).json({
            message: "Identifiant invalide."
        });
    }

    const client = await db.connect();
    let transactionCommencee = false;

    try {
        await client.query("BEGIN");
        transactionCommencee = true;

        // Vérifier et verrouiller la tentative
        const tentativeResultat = await client.query(
            `SELECT
                t.id,
                t.quiz_id,
                t.statut,
                z.nombre_questions,
                (
                    t.date_debut
                    + (z.duree_minutes * INTERVAL '1 minute')
                    <= CURRENT_TIMESTAMP
                ) AS temps_ecoule
             FROM tentatives t
             JOIN quiz z ON z.id = t.quiz_id
             WHERE t.id = $1
             AND t.participant_id = $2
             FOR UPDATE OF t`,
            [tentativeId, participantId]
        );

        if (tentativeResultat.rowCount === 0) {
            await client.query("ROLLBACK");
            transactionCommencee = false;

            return res.status(404).json({
                message: "Tentative introuvable."
            });
        }

        const tentative = tentativeResultat.rows[0];

        if (tentative.statut !== "En cours") {
            await client.query("ROLLBACK");
            transactionCommencee = false;

            return res.status(403).json({
                message: "Cette tentative n'est plus en cours."
            });
        }

        // Compter les questions ayant reçu au moins une réponse
        const reponsesResultat = await client.query(
            `SELECT COUNT(DISTINCT question_id)::INTEGER AS nombre_repondues
             FROM reponses
             WHERE tentative_id = $1`,
            [tentativeId]
        );

        const nombreRepondues = reponsesResultat.rows[0].nombre_repondues;

        // Si le temps n'est pas écoulé, toutes les questions sont obligatoires
        if (
            !tentative.temps_ecoule &&
            nombreRepondues !== tentative.nombre_questions
        ) {
            await client.query("ROLLBACK");
            transactionCommencee = false;

            return res.status(400).json({
                message: "Vous devez répondre à toutes les questions avant de soumettre.",
                nombre_repondues: nombreRepondues,
                nombre_questions: tentative.nombre_questions
            });
        }

        // Calculer le score selon la méthode B
        const scoreResultat = await client.query(
            `SELECT COUNT(*)::INTEGER AS score
             FROM questions q
             WHERE q.quiz_id = $1
             AND
             (
                 -- Toutes les bonnes options ont été sélectionnées
                 (
                     SELECT COUNT(*)
                     FROM options o
                     WHERE o.question_id = q.id
                     AND o.est_correcte = TRUE
                 )
                 =
                 (
                     SELECT COUNT(*)
                     FROM reponses r
                     JOIN options o ON o.id = r.option_id
                     WHERE r.tentative_id = $2
                     AND r.question_id = q.id
                     AND o.est_correcte = TRUE
                 )
             )
             AND
             (
                 -- Aucune mauvaise option n'a été sélectionnée
                 (
                     SELECT COUNT(*)
                     FROM reponses r
                     WHERE r.tentative_id = $2
                     AND r.question_id = q.id
                 )
                 =
                 (
                     SELECT COUNT(*)
                     FROM options o
                     WHERE o.question_id = q.id
                     AND o.est_correcte = TRUE
                 )
             )
             AND EXISTS (
                 SELECT 1
                 FROM options o
                 WHERE o.question_id = q.id
                 AND o.est_correcte = TRUE
             )`,
            [tentative.quiz_id, tentativeId]
        );

        const score = scoreResultat.rows[0].score;

        // Déterminer le statut final
        const statutFinal = tentative.temps_ecoule
            ? "Expirée"
            : "Terminée";

        await client.query(
            `UPDATE tentatives
             SET score = $1,
                 statut = $2,
                 date_fin = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [score, statutFinal, tentativeId]
        );

        await client.query("COMMIT");
        transactionCommencee = false;

        res.json({
            message: tentative.temps_ecoule
                ? "Temps écoulé. Votre QCM a été corrigé."
                : "QCM soumis et corrigé avec succès.",
            score: score,
            score_maximum: tentative.nombre_questions,
            statut: statutFinal
        });

    } catch (error) {
        if (transactionCommencee) {
            await client.query("ROLLBACK");
        }

        console.error("Erreur soumission QCM :", error.message);

        res.status(500).json({
            message: "Erreur lors de la soumission du QCM."
        });

    } finally {
        client.release();
    }
});


// Consulter le résultat et la correction d'une tentative
router.get("/:participantId/tentative/:tentativeId/resultat", async (req, res) => {
    const participantId = Number(req.params.participantId);
    const tentativeId = Number(req.params.tentativeId);

    if (
        !Number.isInteger(participantId) || participantId <= 0 ||
        !Number.isInteger(tentativeId) || tentativeId <= 0
    ) {
        return res.status(400).json({
            message: "Identifiant invalide."
        });
    }

    try {
        // Vérifier que la tentative appartient au participant
        const tentativeResultat = await db.query(
            `SELECT
                t.id,
                t.score,
                t.statut,
                t.date_debut,
                t.date_fin,
                z.nombre_questions
             FROM tentatives t
             JOIN quiz z ON z.id = t.quiz_id
             WHERE t.id = $1
             AND t.participant_id = $2`,
            [tentativeId, participantId]
        );

        if (tentativeResultat.rowCount === 0) {
            return res.status(404).json({
                message: "Tentative introuvable."
            });
        }

        const tentative = tentativeResultat.rows[0];

        // Interdire l'accès à la correction avant la fin du QCM
        if (tentative.statut === "En cours") {
            return res.status(403).json({
                message: "La correction sera disponible après la fin du QCM."
            });
        }

        // Une tentative interrompue par l'administrateur
        // n'est pas encore traitée comme un résultat normal.
        if (tentative.statut === "Interrompue") {
            return res.status(403).json({
                message: "Cette tentative a été interrompue par l'administrateur."
            });
        }

        // Récupérer toutes les questions et leurs options
        const questionsResultat = await db.query(
            `SELECT
                q.id,
                q.contenu,
                q.ordre,
                (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'id', o.id,
                                'contenu', o.contenu,
                                'est_correcte', o.est_correcte,
                                'selectionnee', EXISTS (
                                    SELECT 1
                                    FROM reponses r
                                    WHERE r.tentative_id = $1
                                    AND r.question_id = q.id
                                    AND r.option_id = o.id
                                )
                            )
                            ORDER BY o.id
                        ),
                        '[]'::json
                    )
                    FROM options o
                    WHERE o.question_id = q.id
                ) AS options
             FROM questions q
             WHERE q.quiz_id = (
                 SELECT quiz_id
                 FROM tentatives
                 WHERE id = $1
             )
             ORDER BY q.ordre`,
            [tentativeId]
        );

        res.json({
            message: "Résultat récupéré avec succès.",
            resultat: {
                score: tentative.score,
                score_maximum: tentative.nombre_questions,
                statut: tentative.statut,
                date_debut: tentative.date_debut,
                date_fin: tentative.date_fin,
                questions: questionsResultat.rows
            }
        });

    } catch (error) {
        console.error("Erreur récupération résultat :", error.message);

        res.status(500).json({
            message: "Erreur lors de la récupération du résultat."
        });
    }
});

module.exports = router;
