
const express = require("express");
const router = express.Router();

const verifierAdmin = require("../middlewares/authMiddleware");
const {
    ajouterQuestion,
    listerQuestions,
    modifierQuestion,
    supprimerQuestion
} = require("../controllers/questionController");
// Consulter les questions d'un QCM
router.get("/:quizId", verifierAdmin, listerQuestions);
// Ajouter une question à un QCM
router.post("/:quizId", verifierAdmin, ajouterQuestion);
// Modifier une question
router.put("/:questionId", verifierAdmin, modifierQuestion);
// Supprimer une question
router.delete("/:questionId", verifierAdmin, supprimerQuestion);

module.exports = router;
