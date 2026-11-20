
const db = require("../config/database");

// Ajouter une question et ses quatre propositions
const ajouterQuestion = async (req, res) => {
    const client = await db.connect();

    try {
        const { quizId } = req.params;
        const { contenu, options } = req.body;

        // Vérifier les données reçues
        if (
            !Number.isInteger(Number(quizId)) ||
            typeof contenu !== "string" ||
            !contenu.trim() ||
            !Array.isArray(options) ||
            options.length !== 4
        ) {
            return res.status(400).json({
                message: "Une question et exactement quatre propositions sont requises."
            });
        }

        // Vérifier les propositions
        const propositionsValides = options.every(option =>
            option &&
            typeof option.contenu === "string" &&
            option.contenu.trim() &&
            typeof option.est_correcte === "boolean"
        );

        if (!propositionsValides) {
            return res.status(400).json({
                message: "Chaque proposition doit avoir un contenu et un statut de correction valide."
            });
        }

        // Il faut au moins une bonne réponse
        if (!options.some(option => option.est_correcte)) {
            return res.status(400).json({
                message: "La question doit avoir au moins une bonne réponse."
            });
        }

        await client.query("BEGIN");

        // Vérifier que le QCM existe et qu'il est inactif
        const quiz = await client.query(
            "SELECT id, actif FROM quiz WHERE id = $1 FOR UPDATE",
            [Number(quizId)]
        );

        if (quiz.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "QCM introuvable."
            });
        }

        if (quiz.rows[0].actif) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                message: "Impossible de modifier un QCM actif."
            });
        }

        // Vérifier le nombre de questions existantes
        const compteur = await client.query(
            "SELECT COUNT(*) FROM questions WHERE quiz_id = $1",
            [Number(quizId)]
        );

        const nombreQuestions = Number(compteur.rows[0].count);

        if (nombreQuestions >= 50) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Ce QCM contient déjà 50 questions."
            });
        }

        // Ajouter la question
        const resultatQuestion = await client.query(
            `INSERT INTO questions (quiz_id, contenu, ordre)
             VALUES ($1, $2, $3)
             RETURNING id, contenu, ordre`,
            [Number(quizId), contenu.trim(), nombreQuestions + 1]
        );

        const question = resultatQuestion.rows[0];
        const propositions = [];

        // Ajouter les quatre propositions
        for (const option of options) {
            const resultatOption = await client.query(
                `INSERT INTO options (question_id, contenu, est_correcte)
                 VALUES ($1, $2, $3)
                 RETURNING id, contenu`,
                [question.id, option.contenu.trim(), option.est_correcte]
            );

            propositions.push(resultatOption.rows[0]);
        }

        await client.query("COMMIT");

        res.status(201).json({
            message: "Question ajoutée avec succès !",
            question,
            propositions
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Erreur ajout question :", error.message);

        res.status(500).json({
            message: "Erreur lors de l'ajout de la question."
        });

    } finally {
        client.release();
    }
};
// Consulter toutes les questions d'un QCM
const listerQuestions = async (req, res) => {
    try {
        const { quizId } = req.params;

        const resultat = await db.query(
            `SELECT
                q.id AS question_id,
                q.contenu AS question,
                q.ordre,
                o.id AS option_id,
                o.contenu AS proposition,
                o.est_correcte
             FROM questions q
             LEFT JOIN options o ON o.question_id = q.id
             WHERE q.quiz_id = $1
             ORDER BY q.ordre, o.id`,
            [quizId]
        );

        res.json({
            questions: resultat.rows
        });

    } catch (error) {
        console.error("Erreur consultation questions :", error.message);

        res.status(500).json({
            message: "Erreur lors de la consultation des questions."
        });
    }
};

// Modifier une question et ses quatre propositions
const modifierQuestion = async (req, res) => {
    const client = await db.connect();

    try {
        const { questionId } = req.params;
        const { contenu, options } = req.body;

        if (
            !Number.isInteger(Number(questionId)) ||
            typeof contenu !== "string" ||
            !contenu.trim() ||
            !Array.isArray(options) ||
            options.length !== 4
        ) {
            return res.status(400).json({
                message: "Une question et exactement quatre propositions sont requises."
            });
        }

        const propositionsValides = options.every(option =>
            option &&
            Number.isInteger(Number(option.id)) &&
            typeof option.contenu === "string" &&
            option.contenu.trim() &&
            typeof option.est_correcte === "boolean"
        );

        if (!propositionsValides ||
            !options.some(option => option.est_correcte)) {
            return res.status(400).json({
                message: "Les quatre propositions doivent être valides et au moins une doit être correcte."
            });
        }

        await client.query("BEGIN");

        // Vérifier la question et verrouiller son QCM
        const resultat = await client.query(
            `SELECT q.id, q.quiz_id, z.actif
             FROM questions q
             JOIN quiz z ON z.id = q.quiz_id
             WHERE q.id = $1
             FOR UPDATE OF z`,
            [Number(questionId)]
        );

        if (resultat.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Question introuvable."
            });
        }

        if (resultat.rows[0].actif) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                message: "Impossible de modifier une question d'un QCM actif."
            });
        }

        const quizId = resultat.rows[0].quiz_id;

        // Vérifier que les quatre identifiants appartiennent à cette question
        const optionsExistantes = await client.query(
            `SELECT id FROM options WHERE question_id = $1`,
            [Number(questionId)]
        );

        const idsExistants = optionsExistantes.rows.map(o => o.id).sort((a, b) => a - b);
        const idsRecus = options.map(o => Number(o.id)).sort((a, b) => a - b);

        if (
            idsExistants.length !== 4 ||
            new Set(idsRecus).size !== 4 ||
            idsExistants.some((id, i) => id !== idsRecus[i])
        ) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Les identifiants des quatre propositions sont invalides."
            });
        }

        await client.query(
            `UPDATE questions
             SET contenu = $1
             WHERE id = $2`,
            [contenu.trim(), Number(questionId)]
        );

        for (const option of options) {
            await client.query(
                `UPDATE options
                 SET contenu = $1, est_correcte = $2
                 WHERE id = $3 AND question_id = $4`,
                [
                    option.contenu.trim(),
                    option.est_correcte,
                    Number(option.id),
                    Number(questionId)
                ]
            );
        }

        await client.query("COMMIT");

        res.json({
            message: "Question modifiée avec succès !"
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Erreur modification question :", error.message);

        res.status(500).json({
            message: "Erreur lors de la modification de la question."
        });

    } finally {
        client.release();
    }
};

// Supprimer une question
const supprimerQuestion = async (req, res) => {
    const client = await db.connect();

    try {
        const { questionId } = req.params;

        if (!Number.isInteger(Number(questionId))) {
            return res.status(400).json({
                message: "Identifiant de question invalide."
            });
        }

        await client.query("BEGIN");

        // Vérifier la question et verrouiller son QCM
        const resultat = await client.query(
            `SELECT q.id, q.quiz_id, z.actif
             FROM questions q
             JOIN quiz z ON z.id = q.quiz_id
             WHERE q.id = $1
             FOR UPDATE OF z`,
            [Number(questionId)]
        );

        if (resultat.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Question introuvable."
            });
        }

        if (resultat.rows[0].actif) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                message: "Impossible de supprimer une question d'un QCM actif."
            });
        }

        // Supprimer la question
        // Ses propositions seront supprimées automatiquement grâce à ON DELETE CASCADE.
        await client.query(
            "DELETE FROM questions WHERE id = $1",
            [Number(questionId)]
        );

        // Réorganiser les numéros des questions restantes
        await client.query(
            `WITH numeros AS (
                SELECT id,
                       ROW_NUMBER() OVER (ORDER BY ordre, id) AS nouvel_ordre
                FROM questions
                WHERE quiz_id = $1
             )
             UPDATE questions q
             SET ordre = numeros.nouvel_ordre
             FROM numeros
             WHERE q.id = numeros.id`,
            [resultat.rows[0].quiz_id]
        );

        await client.query("COMMIT");

        res.json({
            message: "Question supprimée avec succès !"
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Erreur suppression question :", error.message);

        res.status(500).json({
            message: "Erreur lors de la suppression de la question."
        });

    } finally {
        client.release();
    }
};

module.exports = {
    ajouterQuestion,
    listerQuestions,
    modifierQuestion,
    supprimerQuestion
};