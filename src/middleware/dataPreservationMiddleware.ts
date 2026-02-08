import { Request, Response, NextFunction } from 'express';
import { safelyDeleteRecord, restoreRecord, getSoftDeletedRecords, validateTenantDataIntegrity } from '../utils/dataPreservation';

// Middleware to prevent accidental data deletion
export const dataPreservationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Store original methods to reference later
  const originalResJson = res.json;

  // Override res.json to intercept delete responses
  res.json = function(data: any) {
    // If this is a delete request, log it appropriately
    if (req.method === 'DELETE' && req.originalUrl.includes('/api/')) {
      console.log(`Delete operation attempted: ${req.originalUrl}`, {
        user: (req as any).user?.id,
        tenant: (req as any).tenant?.id,
        ip: req.ip
      });
    }

    return originalResJson.call(this, data);
  };

  next();
};

// Middleware to enforce soft delete instead of hard delete
export const softDeleteMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'DELETE' && req.originalUrl.includes('/api/')) {
    // Parse the resource type and ID from the URL
    const urlParts = req.originalUrl.split('/');
    const resourceType = urlParts[urlParts.indexOf('api') + 2]; // Get resource type after /api/
    const resourceId = urlParts[urlParts.length - 1]; // Get ID from the end of the URL

    // Check if this is a valid resource type for soft deletion
    const validResourceTypes = ['customers', 'leads', 'deals', 'tasks', 'quotes', 'invoices'];
    
    if (validResourceTypes.includes(resourceType) && resourceId) {
      // Instead of proceeding with hard delete, perform soft delete
      const tenantId = (req as any).tenant?.id;
      const userId = (req as any).user?.id;
      
      if (tenantId && userId) {
        // Perform soft delete and return success response
        safelyDeleteRecord(
          `tenant_data.${resourceType}`, 
          resourceId, 
          tenantId, 
          userId, 
          req.ip || 'unknown', 
          req.get('User-Agent') || 'unknown',
          true // Confirm action
        )
        .then(success => {
          if (success) {
            res.status(200).json({ 
              success: true, 
              message: `${resourceType.slice(0, -1)} marked for deletion and will be permanently removed after retention period`,
              action: 'soft_delete_scheduled'
            });
          } else {
            res.status(500).json({ 
              success: false, 
              error: 'Failed to delete record' 
            });
          }
        })
        .catch(error => {
          console.error('Error in soft delete middleware:', error);
          res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
          });
        });
        
        return; // Don't proceed to the next middleware
      }
    }
  }

  next();
};

// Middleware to add query filters for soft-deleted records
export const softDeleteQueryMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Store original query parameters
  (req as any)._originalQuery = { ...req.query };

  // Modify query to exclude soft-deleted records by default
  if (req.method === 'GET' && req.originalUrl.includes('/api/')) {
    // For GET requests, ensure we're not returning soft-deleted records unless explicitly requested
    if (!req.query.includeDeleted) {
      // Add condition to exclude soft-deleted records
      // This will be handled in the actual query construction in the controllers
      (req as any).excludeSoftDeleted = true;
    } else {
      (req as any).excludeSoftDeleted = false;
    }
  }

  next();
};

// Function to handle data restoration requests
export const handleRestoreRequest = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    const { resourceType, resourceId } = req.params;
    const tenantId = (req as any).tenant?.id;
    const userId = (req as any).user?.id;
    
    if (!tenantId || !userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Validate resource type
    const validResourceTypes = ['customers', 'leads', 'deals', 'tasks', 'quotes', 'invoices'];
    if (!validResourceTypes.includes(resourceType)) {
      res.status(400).json({ error: 'Invalid resource type' });
      return;
    }
    
    const success = await restoreRecord(
      `tenant_data.${resourceType}`,
      resourceId,
      tenantId,
      userId,
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    );
    
    if (success) {
      res.status(200).json({ 
        success: true, 
        message: `${resourceType.slice(0, -1)} restored successfully` 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to restore record' 
      });
    }
  } catch (error) {
    console.error('Error handling restore request:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Function to get soft-deleted records
export const getSoftDeletedRecordsHandler = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    const { resourceType } = req.params;
    const tenantId = (req as any).tenant?.id;
    
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Validate resource type
    const validResourceTypes = ['customers', 'leads', 'deals', 'tasks', 'quotes', 'invoices'];
    if (!validResourceTypes.includes(resourceType)) {
      res.status(400).json({ error: 'Invalid resource type' });
      return;
    }
    
    const records = await getSoftDeletedRecords(tenantId, `tenant_data.${resourceType}`);
    
    res.status(200).json({ 
      success: true, 
      records,
      count: records.length
    });
  } catch (error) {
    console.error('Error getting soft-deleted records:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Function to validate data integrity
export const validateDataIntegrityHandler = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    const tenantId = (req as any).tenant?.id;
    
    if (!tenantId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const result = await validateTenantDataIntegrity(tenantId);
    
    res.status(200).json({ 
      success: true, 
      ...result
    });
  } catch (error) {
    console.error('Error validating data integrity:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Middleware to prevent dangerous operations
export const safetyNetMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Block bulk delete operations
  if (req.method === 'DELETE' && req.originalUrl.includes('/api/') && !req.originalUrl.includes('/restore')) {
    // Check if this looks like a bulk delete (no specific ID in URL)
    const urlParts = req.originalUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    
    // If the last part doesn't look like a UUID, it might be a bulk operation
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lastPart);
    
    if (!isUUID) {
      console.warn(`Blocked potential bulk delete operation: ${req.originalUrl}`, {
        user: (req as any).user?.id,
        tenant: (req as any).tenant?.id,
        ip: req.ip
      });
      
      res.status(400).json({
        success: false,
        error: 'Bulk delete operations are not allowed. Please delete records individually.'
      });
      return;
    }
  }
  
  // Block dangerous SQL operations in query parameters
  const queryString = JSON.stringify(req.query).toLowerCase();
  const dangerousPatterns = ['drop', 'truncate', 'delete from', 'update.*set.*where.*1=1'];
  
  for (const pattern of dangerousPatterns) {
    if (queryString.includes(pattern)) {
      console.warn(`Blocked potentially dangerous request: ${req.originalUrl}`, {
        query: req.query,
        user: (req as any).user?.id,
        tenant: (req as any).tenant?.id,
        ip: req.ip
      });
      
      res.status(400).json({
        success: false,
        error: 'Request contains potentially dangerous operations'
      });
      return;
    }
  }
  
  next();
};