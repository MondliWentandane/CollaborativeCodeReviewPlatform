import { Request, Response } from 'express';
import { query } from '../config/database';

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Validate id parameter
    if (!id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const userId = parseInt(id);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    // Users can only access their own profile
    if (req.user.id !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const result = await query(
      'SELECT id, email, name, role, display_picture, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, display_picture } = req.body;
    
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Validate id parameter
    if (!id) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const userId = parseInt(id);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    // Users can only update their own profile
    if (req.user.id !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const result = await query(
      'UPDATE users SET name = $1, display_picture = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, email, name, role, display_picture, created_at',
      [name, display_picture, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};