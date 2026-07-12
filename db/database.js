const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

const DB_NAME = process.env.DB_NAME || 'shelfspace';

async function init() {
  const rootConn = await mysql.createConnection(config);

  const [dbs] = await rootConn.query(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    [DB_NAME]
  );
  const dbExists = dbs.length > 0;

  if (!dbExists) {
    console.log(`[db] Database "${DB_NAME}" not found — creating schema...`);
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await rootConn.query(schemaSql);
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await rootConn.query(seedSql);
    console.log('[db] Schema created and sample data seeded.');
  }
  await rootConn.end();

  const pool = mysql.createPool({
    ...config,
    database: DB_NAME,
    multipleStatements: false,
    waitForConnections: true,
    connectionLimit: 10,
  });

  return pool;
}

module.exports = { init };
