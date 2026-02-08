import { Request, Response } from 'express';
import { pool } from '../config/database';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

export const upload = multer({ storage });

// Get all files for the current tenant
export const getFiles = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';
    const relatedEntityType = req.query.relatedEntityType as string || '';
    const relatedEntityId = req.query.relatedEntityId as string || '';

    // Build query conditions
    let conditions = 'WHERE f.tenant_id = $1';
    let params: any[] = [tenantId];
    let paramIndex = 2;

    if (search) {
      conditions += ` AND (f.original_filename ILIKE $${paramIndex} OR f.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (relatedEntityType) {
      conditions += ` AND f.related_entity_type = $${paramIndex}`;
      params.push(relatedEntityType);
      paramIndex++;
    }

    if (relatedEntityId) {
      conditions += ` AND f.related_entity_id = $${paramIndex}`;
      params.push(relatedEntityId);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tenant_data.files f
       LEFT JOIN public.users u ON f.uploaded_by = u.id
       ${conditions}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get files with pagination
    const result = await pool.query(
      `SELECT f.*, 
              u.first_name as uploaded_by_first_name,
              u.last_name as uploaded_by_last_name
       FROM tenant_data.files f
       LEFT JOIN public.users u ON f.uploaded_by = u.id
       ${conditions}
       ORDER BY f.created_at DESC
       LIMIT $${paramIndex-1} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalRecords: totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
};

// Upload a file for the current tenant
export const uploadFile = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const userId = (req as any).user.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, filename, path: filePath, mimetype, size } = req.file;
    const { relatedEntityType, relatedEntityId, description } = req.body;

    // Save file record to database
    const result = await pool.query(
      `INSERT INTO tenant_data.files (
         tenant_id, uploaded_by, original_filename, stored_filename, file_path, 
         mime_type, file_size, related_entity_type, related_entity_id, description
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        tenantId, userId, originalname, filename, filePath,
        mimetype, size, relatedEntityType, relatedEntityId, description
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

// Download a file
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const fileId = req.params.id;
    const userId = (req as any).user.id;

    // Get file record
    const result = await pool.query(
      `SELECT * FROM tenant_data.files
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    // Check if file exists on disk
    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Set headers for file download
    res.download(file.file_path, file.original_filename);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
};

// Get a specific file info
export const getFile = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const fileId = req.params.id;

    const result = await pool.query(
      `SELECT f.*, 
              u.first_name as uploaded_by_first_name,
              u.last_name as uploaded_by_last_name
       FROM tenant_data.files f
       LEFT JOIN public.users u ON f.uploaded_by = u.id
       WHERE f.tenant_id = $1 AND f.id = $2`,
      [tenantId, fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
};

// Delete a file
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const fileId = req.params.id;

    // Get file record
    const result = await pool.query(
      `SELECT * FROM tenant_data.files
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    // Delete file from disk
    if (fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path);
    }

    // Delete record from database
    await pool.query(
      'DELETE FROM tenant_data.files WHERE id = $1',
      [fileId]
    );

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

// Get files for a specific entity
export const getFilesByEntity = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant.id;
    const entityType = req.params.entityType;
    const entityId = req.params.entityId;

    const result = await pool.query(
      `SELECT f.*, 
              u.first_name as uploaded_by_first_name,
              u.last_name as uploaded_by_last_name
       FROM tenant_data.files f
       LEFT JOIN public.users u ON f.uploaded_by = u.id
       WHERE f.tenant_id = $1 AND f.related_entity_type = $2 AND f.related_entity_id = $3
       ORDER BY f.created_at DESC`,
      [tenantId, entityType, entityId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching files by entity:', error);
    res.status(500).json({ error: 'Failed to fetch files by entity' });
  }
};