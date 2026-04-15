const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./config");

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      roleCode: user.roleCode,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    username: user.username,
    position: user.position,
    departmentId: user.departmentId,
    roleCode: user.roleCode,
    status: user.status,
    createdAt: user.createdAt,
    approvedAt: user.approvedAt || null,
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  signToken,
  sanitizeUser,
};
