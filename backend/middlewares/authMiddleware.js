const jwt = require("jsonwebtoken");

// Vérifier que l'utilisateur est bien administrateur
const verifierAdmin = (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Accès refusé. Authentification requise."
        });
    }

    const token = authorization.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.admin = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Token invalide ou expiré."
        });
    }
};

module.exports = verifierAdmin;