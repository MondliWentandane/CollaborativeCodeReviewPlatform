import { Response } from 'express';
import { AuthRequest } from '../types/express';
import { query } from '../config/database';

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const ownerId = req.user.id;

    const result = await query(
      `INSERT INTO projects (name, description, owner_id) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, description, owner_id, created_at`,
      [name, description, ownerId]
    );

    // Add owner as project member
    await query(
      'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)',
      [result.rows[0].id, ownerId]
    );

    res.status(201).json({
      message: 'Project created successfully',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT DISTINCT p.*, u.name as owner_name 
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN users u ON p.owner_id = u.id
       WHERE p.owner_id = $1 OR pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );

    res.json({
      projects: result.rows
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addProjectMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user.id;

    // Verify current user is project owner
    const projectResult = await query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (projectResult.rows[0].owner_id !== currentUserId) {
      res.status(403).json({ error: 'Only project owner can add members' });
      return;
    }

    // Add member
    await query(
      'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [projectId, userId]
    );

    res.json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};