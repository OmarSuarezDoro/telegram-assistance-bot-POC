/**
 * Creates and exports the PostgreSQL connection pool.
 * @author noexdev
 * @version 1.0.0
 */
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'telegrambot',
  user: process.env.DB_USER || 'telegrambot',
  password: process.env.DB_PASSWORD || 'telegrambot',
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error', err);
});
