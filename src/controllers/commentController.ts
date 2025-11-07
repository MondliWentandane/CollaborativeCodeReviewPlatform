import { Request, Response } from 'express';
import { query } from '../config/database';

export const addComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const { content, lineNumber, parentCommentId } = req.body;
    
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const authorId = req.user.id;

    // Validate submissionId parameter
    if (!submissionId) {
      res.status(400).json({ error: 'Submission ID is required' });
      return;
    }

    const parsedSubmissionId = parseInt(submissionId);
    if (isNaN(parsedSubmissionId)) {
      res.status(400).json({ error: 'Invalid submission ID' });
      return;
    }

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
      [parsedSubmissionId, authorId]
    );

    if (submissionAccess.rows.length === 0) {
      res.status(403).json({ error: 'No access to this submission' });
      return;
    }

    const result = await query(
      `INSERT INTO comments (content, line_number, submission_id, author_id, parent_comment_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [content, lineNumber, parsedSubmissionId, authorId, parentCommentId]
    );

    // Create notification for submitter
    const submissionResult = await query(
      'SELECT title, submitter_id FROM submissions WHERE id = $1',
      [parsedSubmissionId]
    );

    if (submissionResult.rows.length > 0) {
      const submission = submissionResult.rows[0];
      await query(
        `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
         VALUES ($1, 'New Comment', $2, 'comment', 'submission', $3)`,
        [submission.submitter_id, `New comment on submission "${submission.title}"`, parsedSubmissionId]
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

export const getSubmissionComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;

    // Validate submissionId parameter
    if (!submissionId) {
      res.status(400).json({ error: 'Submission ID is required' });
      return;
    }

    const parsedSubmissionId = parseInt(submissionId);
    if (isNaN(parsedSubmissionId)) {
      res.status(400).json({ error: 'Invalid submission ID' });
      return;
    }

    const result = await query(
      `SELECT c.*, u.name as author_name, u.role as author_role
       FROM comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.submission_id = $1
       ORDER BY c.line_number ASC, c.created_at ASC`,
      [parsedSubmissionId]
    );

    res.json({
      comments: result.rows
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};