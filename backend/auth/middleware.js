const jwt = require("jsonwebtoken");

const DEFAULT_SECRET = "dev-only-insecure-secret-change-me";

function getJwtSecret() {
  return process.env.JWT_SECRET || DEFAULT_SECRET;
}

function signToken(payload, options = {}) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || "7d",
  });
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function extractToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== "string") return null;
  const parts = header.split(" ");
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
  return null;
}

// Express middleware: rejects request unless a valid JWT is present.
// On success, attaches `req.user = { id, username }`.
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.sub, username: decoded.username };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = {
  requireAuth,
  signToken,
  verifyToken,
  getJwtSecret,
};
