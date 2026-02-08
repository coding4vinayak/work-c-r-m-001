import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigrations() {
  console.log('Starting data preservation migrations...');

  try {
    // Connect to the database
    const client = await pool.connect();

    // Create audit log table
    console.log('Creating audit log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        user_id UUID,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for audit log
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_action 
      ON audit_log(tenant_id, action, created_at);
    `);

    // Add preservation columns to all tenant data tables
    const tenantTables = [
      'tenant_data.customers',
      'tenant_data.leads', 
      'tenant_data.deals',
      'tenant_data.tasks',
      'tenant_data.quotes',
      'tenant_data.invoices',
      'tenant_data.payments',
      'tenant_data.files',
      'tenant_data.tags'
    ];

    for (const table of tenantTables) {
      console.log(`Adding preservation columns to ${table}...`);

      // Add deleted_at and is_deleted columns
      await client.query(`
        ALTER TABLE ${table} 
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
      `);
      
      // Create indexes for soft delete queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${table.replace('.', '_')}_deleted_at 
        ON ${table}(deleted_at) WHERE deleted_at IS NOT NULL;
      `);
      
      // Create index for is_deleted flag
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${table.replace('.', '_')}_is_deleted 
        ON ${table}(is_deleted) WHERE is_deleted = TRUE;
      `);
    }

    // Add preservation columns to public tables as well
    const publicTables = [
      'public.users',
      'public.tenants'
    ];

    for (const table of publicTables) {
      console.log(`Adding preservation columns to ${table}...`);

      await client.query(`
        ALTER TABLE ${table} 
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
      `);
      
      // Create indexes for soft delete queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${table.replace('.', '_')}_deleted_at 
        ON ${table}(deleted_at) WHERE deleted_at IS NOT NULL;
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_${table.replace('.', '_')}_is_deleted 
        ON ${table}(is_deleted) WHERE is_deleted = TRUE;
      `);
    }

    // Create a function to safely delete records
    await client.query(`
      CREATE OR REPLACE FUNCTION soft_delete_record(
        table_name TEXT,
        record_id UUID,
        tenant_id_param UUID DEFAULT NULL
      ) RETURNS BOOLEAN AS $$
      DECLARE
        table_exists BOOLEAN;
        row_count INT;
      BEGIN
        -- Check if the table exists and has the required columns
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = split_part(table_name, '.', 2) 
          AND table_schema = split_part(table_name, '.', 1)
          AND column_name = 'deleted_at'
        ) INTO table_exists;

        IF NOT table_exists THEN
          RAISE EXCEPTION 'Table % does not have preservation columns', table_name;
        END IF;

        -- Perform soft delete based on whether tenant_id is provided
        IF tenant_id_param IS NOT NULL THEN
          EXECUTE format('UPDATE %I.%I SET deleted_at = CURRENT_TIMESTAMP, is_deleted = TRUE WHERE id = $1 AND tenant_id = $2', 
                        split_part(table_name, '.', 1), split_part(table_name, '.', 2))
          USING record_id, tenant_id_param;
          
          GET DIAGNOSTICS row_count = ROW_COUNT;
        ELSE
          EXECUTE format('UPDATE %I.%I SET deleted_at = CURRENT_TIMESTAMP, is_deleted = TRUE WHERE id = $1', 
                        split_part(table_name, '.', 1), split_part(table_name, '.', 2))
          USING record_id;
          
          GET DIAGNOSTICS row_count = ROW_COUNT;
        END IF;

        RETURN row_count > 0;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create a function to restore records
    await client.query(`
      CREATE OR REPLACE FUNCTION restore_record(
        table_name TEXT,
        record_id UUID,
        tenant_id_param UUID DEFAULT NULL
      ) RETURNS BOOLEAN AS $$
      DECLARE
        table_exists BOOLEAN;
        row_count INT;
      BEGIN
        -- Check if the table exists and has the required columns
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = split_part(table_name, '.', 2) 
          AND table_schema = split_part(table_name, '.', 1)
          AND column_name = 'deleted_at'
        ) INTO table_exists;

        IF NOT table_exists THEN
          RAISE EXCEPTION 'Table % does not have preservation columns', table_name;
        END IF;

        -- Perform restore based on whether tenant_id is provided
        IF tenant_id_param IS NOT NULL THEN
          EXECUTE format('UPDATE %I.%I SET deleted_at = NULL, is_deleted = FALSE WHERE id = $1 AND tenant_id = $2 AND is_deleted = TRUE', 
                        split_part(table_name, '.', 1), split_part(table_name, '.', 2))
          USING record_id, tenant_id_param;
          
          GET DIAGNOSTICS row_count = ROW_COUNT;
        ELSE
          EXECUTE format('UPDATE %I.%I SET deleted_at = NULL, is_deleted = FALSE WHERE id = $1 AND is_deleted = TRUE', 
                        split_part(table_name, '.', 1), split_part(table_name, '.', 2))
          USING record_id;
          
          GET DIAGNOSTICS row_count = ROW_COUNT;
        END IF;

        RETURN row_count > 0;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('Data preservation migrations completed successfully!');
    
    // Close the connection
    client.release();
  } catch (error) {
    console.error('Error running data preservation migrations:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default runMigrations;