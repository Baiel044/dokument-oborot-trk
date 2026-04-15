const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../utils/config");
const { readDb } = require("../data/store");

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Авторизация талап кылынат." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = readDb();
    const user = db.users.find((item) => item.id === payload.sub);

    if (!user || user.status !== "active") {
      return res.status(401).json({ message: "Колдонуучу жеткиликсиз." });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Токен жараксыз." });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.roleCode)) {
      return res.status(403).json({ message: "Укук жетишсиз." });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  authorize,
};
