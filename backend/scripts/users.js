const { pool, closePool } = require("../db/connection");

const INSERT_USER_SQL = `
  INSERT INTO users (username, email, password_hash)
  VALUES (?, ?, ?)
  `;

async function insertUser(username, email, password_hash) {

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(INSERT_USER_SQL, [
    username,
    email,
    password_hash
      ]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function runDirectInsert(username, email, password_hash) {
  try {
    await insertUser(username, email, password_hash);
    console.log(`Inserted/updated user.`);
  } catch (error) {
    console.error("Failed to insert user:", error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

if (require.main === module) {
  runDirectInsert();
}

module.exports = { insertUser, runDirectInsert };