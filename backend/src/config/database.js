const { Pool, types } = require('pg');
const environment = require('./environment');

// By default pg returns BIGINT and NUMERIC columns as strings. Convert them to numbers.
types.setTypeParser(20, (value) => parseInt(value, 10));
types.setTypeParser(1700, (value) => parseFloat(value));

const pool = new Pool({ connectionString: environment.databaseUrl, max: 20 });

// Column names like stock_quantity become stockQuantity in JavaScript.
function toCamelCase(text) {
  return text.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

function camelizeRow(row) {
  const converted = {};
  for (const column of Object.keys(row)) {
    converted[toCamelCase(column)] = row[column];
  }
  return converted;
}

async function runQuery(executor, sql, params) {
  const result = await executor.query(sql, params);
  return { rows: result.rows.map(camelizeRow), rowCount: result.rowCount };
}

function query(sql, params) {
  return runQuery(pool, sql, params);
}

// PostgreSQL reports these two codes when a transaction lost a lock fight or deadlocked.
// The whole transaction is safe to run again.
const RETRYABLE_ERROR_CODES = ['40001', '40P01'];

// Runs work(tx) inside BEGIN ... COMMIT. Any error causes ROLLBACK.
async function runInTransaction(work, maxAttempts = 3) {
  for (let attempt = 1; ; attempt++) {
    const client = await pool.connect();
    const tx = { query: (sql, params) => runQuery(client, sql, params) };
    try {
      await client.query('BEGIN');
      const result = await work(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      const canRetry = RETRYABLE_ERROR_CODES.includes(error.code) && attempt < maxAttempts;
      if (!canRetry) throw error;
    } finally {
      client.release();
    }
  }
}

function closePool() {
  return pool.end();
}

module.exports = { query, runInTransaction, closePool };
