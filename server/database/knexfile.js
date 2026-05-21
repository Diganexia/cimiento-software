const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const IS_SQLITE = process.env.CIMIENTO_DB === 'sqlite';

if (IS_SQLITE) {
  module.exports = {
    development: {
      client: 'better-sqlite3',
      connection: { filename: process.env.DB_PATH || path.resolve(__dirname, '../../cimiento-dev.db') },
      useNullAsDefault: true,
      migrations: { directory: path.join(__dirname, 'migrations-sqlite') },
      seeds: { directory: path.join(__dirname, 'seeds') }
    },
    production: {
      client: 'better-sqlite3',
      connection: { filename: process.env.DB_PATH },
      useNullAsDefault: true,
      migrations: { directory: path.join(__dirname, 'migrations-sqlite') },
      seeds: { directory: path.join(__dirname, 'seeds') }
    }
  };
} else {
  module.exports = {
    development: {
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'ferreteria_dev',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || ''
      },
      migrations: { directory: path.join(__dirname, 'migrations') },
      seeds: { directory: path.join(__dirname, 'seeds') }
    },
    production: {
      client: 'pg',
      connection: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      },
      migrations: { directory: path.join(__dirname, 'migrations') },
      seeds: { directory: path.join(__dirname, 'seeds') }
    }
  };
}
