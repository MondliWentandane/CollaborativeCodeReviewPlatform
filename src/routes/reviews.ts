import { Router } from 'express';
import { approveSubmission, requestChanges } from '../controllers/reviewController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize(['reviewer']));

router.post('/:submissionId/approve', approveSubmission);
router.post('/:submissionId/request-changes', requestChanges);

export default router;