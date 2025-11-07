import { Request, Response } from 'express';
import { query } from '../config/database';

export const getUserNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Validate userId parameter
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    // Users can only access their own notifications
    if (req.user.id !== parsedUserId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const result = await query(
      `SELECT id, title, message, type, read, related_entity_type, related_entity_id, created_at 
       FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [parsedUserId]
    );

    res.json({
      notifications: result.rows
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { notificationId } = req.params;
    
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Validate notificationId parameter
    if (!notificationId) {
      res.status(400).json({ error: 'Notification ID is required' });
      return;
    }

    const parsedNotificationId = parseInt(notificationId);
    if (isNaN(parsedNotificationId)) {
      res.status(400).json({ error: 'Invalid notification ID' });
      return;
    }

    // Verify the notification belongs to the user
    const notificationResult = await query(
      'SELECT user_id FROM notifications WHERE id = $1',
      [parsedNotificationId]
    );

    if (notificationResult.rows.length === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    if (notificationResult.rows[0].user_id !== req.user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await query(
      'UPDATE notifications SET read = true WHERE id = $1',
      [parsedNotificationId]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};