import { Pool } from 'pg';
import { pool } from '../config/database';

async function createWorkflowsTable() {
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Create workflows table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_data.workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES public.tenants(id),
        created_by UUID REFERENCES public.users(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        trigger_entity VARCHAR(50) NOT NULL, -- 'lead', 'deal', 'customer', 'task', 'invoice'
        trigger_event VARCHAR(50) NOT NULL,  -- 'created', 'updated', 'status_changed', etc.
        conditions JSONB, -- Conditions that must be met to trigger the workflow
        actions JSONB,    -- Actions to perform when workflow is triggered
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create workflow_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_data.workflow_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES public.tenants(id),
        workflow_id UUID REFERENCES tenant_data.workflows(id),
        entity_type VARCHAR(50), -- Type of entity that triggered the workflow
        entity_id UUID,          -- ID of the entity that triggered the workflow
        executed_by UUID REFERENCES public.users(id),
        execution_result JSONB,  -- Result of workflow execution
        status VARCHAR(20) DEFAULT 'success', -- 'success', 'failed', 'skipped'
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Enable row-level security for new tables
    await client.query('ALTER TABLE tenant_data.workflows ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE tenant_data.workflow_history ENABLE ROW LEVEL SECURITY;');
    
    // Create row-level security policies for new tables
    await client.query(`
      CREATE POLICY tenant_isolation_policy_workflows ON tenant_data.workflows
        FOR ALL TO authenticated_user
        USING (tenant_id = current_setting('app.current_tenant')::UUID);
    `);
    
    await client.query(`
      CREATE POLICY tenant_isolation_policy_workflow_history ON tenant_data.workflow_history
        FOR ALL TO authenticated_user
        USING (tenant_id = current_setting('app.current_tenant')::UUID);
    `);
    
    // Create indexes for better performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflows_tenant_id ON tenant_data.workflows(tenant_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflows_active ON tenant_data.workflows(is_active);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_history_tenant_id ON tenant_data.workflow_history(tenant_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_history_workflow_id ON tenant_data.workflow_history(workflow_id);');
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Workflows tables created successfully');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error creating workflows tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
createWorkflowsTable()
  .then(() => {
    console.log('Workflows migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Workflows migration failed:', error);
    process.exit(1);
  });