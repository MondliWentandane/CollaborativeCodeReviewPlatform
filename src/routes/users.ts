import { Router } from 'express';
import { getUserProfile, updateUserProfile } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/:id', getUserProfile);
router.put('/:id', updateUserProfile);

export default router;