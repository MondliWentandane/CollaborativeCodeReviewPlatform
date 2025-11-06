import { Response } from 'express';
import { AuthRequest } from '../types/express';
import { query } from '../config/database';

export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const { content, lineNumber, parentCommentId } = req.body;
    const authorId = req.user.id;

    // Only reviewers can comment
    if (req.user.role !== 'reviewer') {
      res.status(403).json({ error: 'Only reviewers can add comments' });
      return;
    }

    // Verify reviewer has access to submission
    const submissionAccess = await query(
      `SELECT 1 FROM submissions s
       LEFT JOIN projects p ON s.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE s.id = $1 AND pm.user_id = $2`,
      [submissionId, authorId]
    );

    if (submissionAccess.rows.length === 0) {
      res.status(403).json({ error: 'No access to this submission' });
      return;
    }

    const result = await query(
      `INSERT INTO comments (content, line_number, submission_id, author_id, parent_comment_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [content, lineNumber, submissionId, authorId, parentCommentId]
    );

    // Create notification for submitter
    const submissionResult = await query(
      'SELECT title, submitter_id FROM submissions WHERE id = $1',
      [submissionId]
    );

    if (submissionResult.rows.length > 0) {
      const submission = submissionResult.rows[0];
      await query(
        `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
         VALUES ($1, 'New Comment', $2, 'comment', 'submission', $3)`,
        [submission.submitter_id, `New comment on submission "${submission.title}"`, submissionId]
      );
    }

    res.status(201).json({
      message: 'Comment added successfully',
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubmissionComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;

    const result = await query(
      `SELECT c.*, u.name as author_name, u.role as author_role
       FROM comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.submission_id = $1
       ORDER BY c.line_number ASC, c.created_at ASC`,
      [submissionId]
    );

    res.json({
      comments: result.rows
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};