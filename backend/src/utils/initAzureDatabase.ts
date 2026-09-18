import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from workspace root or backend root
const workspaceRoot = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(workspaceRoot, '.env') });
dotenv.config();

const { Client } = pg;

async function run(): Promise<void> {
  const host = process.env['DB_HOST'] ?? 'localhost';
  const port = Number(process.env['DB_PORT'] ?? 5432);
  const user = process.env['DB_USER'] ?? 'clinicadmin';
  const password = process.env['DB_PASSWORD'] ?? 'ClinicWorks#2026!';
  const targetDb = process.env['DB_NAME'] ?? 'clinicworks';
  const ssl = process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : false;

  console.log('================================================================');
  console.log(' ClinicWorks - Azure PostgreSQL Database Initialization Script');
  console.log('================================================================');
  console.log(`[Config] Host: ${host}:${port}`);
  console.log(`[Config] User: ${user}`);
  console.log(`[Config] Target Database: ${targetDb}`);
  console.log(`[Config] SSL: ${ssl ? 'Enabled (Azure SSL)' : 'Disabled'}`);
  console.log('----------------------------------------------------------------');

  // Step 1: Connect to maintenance database 'postgres' to check/create target database
  console.log(`[Step 1/3] Connecting to Azure PostgreSQL maintenance database 'postgres'...`);
  const adminClient = new Client({
    host,
    port,
    database: 'postgres',
    user,
    password,
    ssl,
    connectionTimeoutMillis: 10000,
  });

  try {
    await adminClient.connect();
    console.log(' Connected to Azure PostgreSQL server successfully.');

    // Check if target database exists
    const checkDbRes = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDb]
    );

    if (checkDbRes.rowCount === 0) {
      console.log(` Creating database '${targetDb}'...`);
      await adminClient.query(`CREATE DATABASE "${targetDb}";`);
      console.log(` Database '${targetDb}' created successfully.`);
    } else {
      console.log(` Database '${targetDb}' already exists.`);
    }
  } catch (err) {
    console.error(' [Error in Step 1]:', err);
    throw err;
  } finally {
    await adminClient.end();
  }

  // Step 2: Connect to the newly created target database and apply schema
  console.log(`----------------------------------------------------------------`);
  console.log(`[Step 2/3] Connecting to '${targetDb}' and executing schema.sql...`);
  const dbClient = new Client({
    host,
    port,
    database: targetDb,
    user,
    password,
    ssl,
    connectionTimeoutMillis: 10000,
  });

  try {
    await dbClient.connect();
    console.log(` Connected to '${targetDb}' database.`);

    const possibleSchemaPaths = [
      path.join(workspaceRoot, 'database', 'schema.sql'),
      path.join(process.cwd(), 'database', 'schema.sql'),
      path.join(__dirname, '../../../database/schema.sql'),
    ];
    const schemaFile = possibleSchemaPaths.find((p) => fs.existsSync(p));
    if (!schemaFile) {
      throw new Error(`schema.sql not found in expected paths: ${possibleSchemaPaths.join(', ')}`);
    }

    const schemaSql = fs.readFileSync(schemaFile, 'utf8');
    console.log(` Executing schema definitions from: ${schemaFile}`);
    await dbClient.query(schemaSql);
    console.log(' Table `clinical_documents` and indexes created successfully.');

    // Step 3: Seed initial benchmark data
    console.log(`----------------------------------------------------------------`);
    console.log(`[Step 3/3] Executing seed.sql to populate initial records...`);
    const possibleSeedPaths = [
      path.join(workspaceRoot, 'database', 'seed.sql'),
      path.join(process.cwd(), 'database', 'seed.sql'),
      path.join(__dirname, '../../../database/seed.sql'),
    ];
    const seedFile = possibleSeedPaths.find((p) => fs.existsSync(p));
    if (!seedFile) {
      throw new Error(`seed.sql not found in expected paths: ${possibleSeedPaths.join(', ')}`);
    }

    const seedSql = fs.readFileSync(seedFile, 'utf8');
    console.log(` Executing initial seed data from: ${seedFile}`);
    await dbClient.query(seedSql);
    console.log(' Seed records inserted successfully.');

    // Verify row count
    const countRes = await dbClient.query(`SELECT COUNT(*) FROM clinical_documents;`);
    const count = countRes.rows[0]?.['count'];
    console.log(` Verification: ${count} documents currently stored in Azure PostgreSQL.`);

    console.log('================================================================');
    console.log(' Azure PostgreSQL Setup Completed with 100% Success!');
    console.log('================================================================');
  } catch (err) {
    console.error(' [Error in Step 2/3]:', err);
    throw err;
  } finally {
    await dbClient.end();
  }
}

run().catch((err) => {
  console.error('[Fatal Error]:', err.message);
  process.exit(1);
});
