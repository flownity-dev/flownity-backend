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

    // Create flwnty_task table if it doesn't exist
    const createTaskTableQuery = `
      CREATE TABLE IF NOT EXISTS flwnty_task (
        id BIGSERIAL PRIMARY KEY,
        task_group_id BIGINT REFERENCES flwnty_task_group(id) ON DELETE SET NULL,
        project_id BIGINT REFERENCES flwnty_project(id) ON DELETE SET NULL,
        task_title VARCHAR(255) NOT NULL,
        description TEXT,
        due_from TIMESTAMP,
        due_to TIMESTAMP,
        assignee BIGINT REFERENCES flwnty_users(id) ON DELETE SET NULL,
        approver BIGINT REFERENCES flwnty_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
    `;

    await DatabaseConnection.query(createTaskTableQuery);
    console.log('Database schema initialized successfully');

    // Create indexes for faster lookups
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_flwnty_users_provider_id ON flwnty_users(provider_id);
      CREATE INDEX IF NOT EXISTS idx_flwnty_users_provider ON flwnty_users(provider);
      CREATE INDEX IF NOT EXISTS idx_flwnty_users_email ON flwnty_users(email);
      CREATE INDEX IF NOT EXISTS idx_flwnty_task_assignee ON flwnty_task(assignee);
      CREATE INDEX IF NOT EXISTS idx_flwnty_task_approver ON flwnty_task(approver);
      CREATE INDEX IF NOT EXISTS idx_flwnty_task_task_group_id ON flwnty_task(task_group_id);
      CREATE INDEX IF NOT EXISTS idx_flwnty_task_project_id ON flwnty_task(project_id);
      CREATE INDEX IF NOT EXISTS idx_flwnty_task_deleted_at ON flwnty_task(deleted_at);
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
      
      DROP TRIGGER IF EXISTS update_flwnty_task_updated_at ON flwnty_task;
      CREATE TRIGGER update_flwnty_task_updated_at
        BEFORE UPDATE ON flwnty_task
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