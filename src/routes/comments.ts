import { Router } from 'express';
import { addComment, getSubmissionComments } from '../controllers/commentController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/submission/:submissionId', authorize(['reviewer']), addComment);
router.get('/submission/:submissionId', getSubmissionComments);

export default router;