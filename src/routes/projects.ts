import { Router } from 'express';
import { createProject, getProjects, addProjectMember } from '../controllers/projectController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createProject);
router.get('/', getProjects);
router.post('/:projectId/members', authorize(['reviewer']), addProjectMember);

export default router;