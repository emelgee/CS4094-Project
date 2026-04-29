const { signToken } = require("../../auth/middleware");

// Returns a Bearer header value for a fake user. Tests that need
// per-test user ids can pass an override.
function authHeader(userId = 1, username = "tester") {
  const token = signToken({ sub: userId, username });
  return `Bearer ${token}`;
}

module.exports = { authHeader };
