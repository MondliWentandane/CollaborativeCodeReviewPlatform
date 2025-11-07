import { Request, Response } from 'express';
import { query } from '../config/database';

export const createSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, codeContent, fileName, projectId } = req.body;
    
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const submitterId = req.user.id;

    // Verify user has access to project
    const projectAccess = await query(
      `SELECT 1 FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id 
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2)`,
      [projectId, submitterId]
    );

    if (projectAccess.rows.length === 0) {
      res.status(403).json({ error: 'No access to this project' });
      return;
    }

    const result = await query(
      `INSERT INTO submissions (title, description, code_content, file_name, project_id, submitter_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [title, description, codeContent, fileName, projectId, submitterId]
    );

    // Create notification for project members
    await query(
      `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
       SELECT user_id, 'New Submission', $1, 'submission', 'submission', $2
       FROM project_members 
       WHERE project_id = $3 AND user_id != $4`,
      [`New submission "${title}" created`, result.rows[0].id, projectId, submitterId]
    );

    res.status(201).json({
      message: 'Submission created successfully',
      submission: result.rows[0]
    });
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubmissionsByProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const userId = req.user.id;

    // Verify access to project
    const projectAccess = await query(
      `SELECT 1 FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id 
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2)`,
      [projectId, userId]
    );

    if (projectAccess.rows.length === 0) {
      res.status(403).json({ error: 'No access to this project' });
      return;
    }

    const result = await query(
      `SELECT s.*, u.name as submitter_name 
       FROM submissions s
       LEFT JOIN users u ON s.submitter_id = u.id
       WHERE s.project_id = $1
       ORDER BY s.created_at DESC`,
      [projectId]
    );

    res.json({
      submissions: result.rows
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};