import { Request, Response } from 'express';
import { query } from '../config/database';

export const approveSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const { feedback } = req.body;
    
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const reviewerId = req.user.id;

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

    // Verify reviewer has access
    const submissionAccess = await query(
      `SELECT s.* FROM submissions s
       LEFT JOIN projects p ON s.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE s.id = $1 AND pm.user_id = $2 AND pm.user_id IN (
         SELECT user_id FROM project_members WHERE project_id = p.id AND user_id = $2
       )`,
      [parsedSubmissionId, reviewerId]
    );

    if (submissionAccess.rows.length === 0) {
      res.status(403).json({ error: 'No access to this submission' });
      return;
    }

    const submission = submissionAccess.rows[0];

    // Record review history
    await query(
      `INSERT INTO review_history (submission_id, reviewer_id, old_status, new_status, feedback)
       VALUES ($1, $2, $3, $4, $5)`,
      [parsedSubmissionId, reviewerId, submission.status, 'approved', feedback]
    );

    // Update submission status
    await query(
      'UPDATE submissions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['approved', parsedSubmissionId]
    );

    // Notify submitter
    await query(
      `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
       VALUES ($1, 'Submission Approved', $2, 'review', 'submission', $3)`,
      [submission.submitter_id, `Your submission "${submission.title}" has been approved`, parsedSubmissionId]
    );

    res.json({ message: 'Submission approved successfully' });
  } catch (error) {
    console.error('Approve submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const requestChanges = async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const { feedback } = req.body;
    
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    const reviewerId = req.user.id;

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

    // Similar verification as approveSubmission
    const submissionAccess = await query(
      `SELECT s.* FROM submissions s
       LEFT JOIN projects p ON s.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE s.id = $1 AND pm.user_id = $2`,
      [parsedSubmissionId, reviewerId]
    );

    if (submissionAccess.rows.length === 0) {
      res.status(403).json({ error: 'No access to this submission' });
      return;
    }

    const submission = submissionAccess.rows[0];

    await query(
      `INSERT INTO review_history (submission_id, reviewer_id, old_status, new_status, feedback)
       VALUES ($1, $2, $3, $4, $5)`,
      [parsedSubmissionId, reviewerId, submission.status, 'changes_requested', feedback]
    );

    await query(
      'UPDATE submissions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['changes_requested', parsedSubmissionId]
    );

    await query(
      `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id)
       VALUES ($1, 'Changes Requested', $2, 'review', 'submission', $3)`,
      [submission.submitter_id, `Changes requested for submission "${submission.title}"`, parsedSubmissionId]
    );

    res.json({ message: 'Changes requested successfully' });
  } catch (error) {
    console.error('Request changes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};