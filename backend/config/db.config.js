import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { logger } from '../utils/logger.util.js'

dotenv.config({ path: path.resolve(process.cwd(), '../.env') })
dotenv.config()

const { Pool } = pg

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'casaatools',
  user: process.env.DB_USER || 'casaatools_user',
  password: process.env.DB_PASSWORD || 'casaatools_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
}

logger.info(`Database config initialized. Connecting to host=${dbConfig.host}:${dbConfig.port}, user=${dbConfig.user}, db=${dbConfig.database}`)

export const pool = new Pool(dbConfig)

// Auto-initialize DB tables on startup with retry logic
export const initDb = async () => {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `
  
  let retries = 5
  while (retries > 0) {
    try {
      const client = await pool.connect()
      logger.info('Connected to PostgreSQL successfully.')
      await client.query(createUsersTableQuery)
      logger.info('Database tables initialized/verified.')
      client.release()
      break
    } catch (error) {
      retries--
      logger.warn(`Failed to connect/initialize PostgreSQL. Retries remaining: ${retries}. Error: ${error.message}`)
      if (retries === 0) {
        logger.error('Failed to initialize PostgreSQL database after all retries:', error)
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
  }
}
