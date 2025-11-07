import { Router } from 'express';
import { getUserNotifications, markNotificationAsRead } from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/user/:userId', getUserNotifications);
router.put('/:notificationId/read', markNotificationAsRead);

export default router;