const { pool } = require("./connection");

async function waitForDatabase(options = {}) {
  const maxAttempts = options.maxAttempts ?? 20;
  const delayMs = options.delayMs ?? 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = { waitForDatabase };
