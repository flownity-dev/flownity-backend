import DatabaseConnection from './connection.js';

export async function initializeDatabase(): Promise<void> {
  try {
    // Ensure database connection is established
    await DatabaseConnection.initialize();

    // Create flwnty_users table if it doesn't exist
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS flwnty_users (
        id SERIAL PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL,
        provider VARCHAR(50) NOT NULL DEFAULT 'github',
        username VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        email VARCHAR(255),
        profile_picture_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider_id, provider)
      );
    `;

    await DatabaseConnection.query(createUsersTableQuery);
    console.log('Database schema initialized successfully');

    // Create indexes for faster lookups
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_flwnty_users_provider_id ON flwnty_users(provider_id);
      CREATE INDEX IF NOT EXISTS idx_flwnty_users_provider ON flwnty_users(provider);
      CREATE INDEX IF NOT EXISTS idx_flwnty_users_email ON flwnty_users(email);
    `;

    await DatabaseConnection.query(createIndexQuery);
    console.log('Database indexes created successfully');

    // Create the update timestamp trigger
    await createUpdateTimestampTrigger();

  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Function to update the updated_at timestamp
export async function createUpdateTimestampTrigger(): Promise<void> {
  try {
    // Create a function to update the updated_at column
    const createFunctionQuery = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;

    await DatabaseConnection.query(createFunctionQuery);

    // Create a trigger to automatically update the updated_at column
    const createTriggerQuery = `
      DROP TRIGGER IF EXISTS update_flwnty_users_updated_at ON flwnty_users;
      CREATE TRIGGER update_flwnty_users_updated_at
        BEFORE UPDATE ON flwnty_users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;

    await DatabaseConnection.query(createTriggerQuery);
    console.log('Database triggers created successfully');

  } catch (error) {
    console.error('Failed to create database triggers:', error);
    throw error;
  }
}