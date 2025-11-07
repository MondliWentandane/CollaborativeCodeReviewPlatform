import { Router } from 'express';
import { createSubmission, getSubmissionsByProject } from '../controllers/submissionController';
import { authenticate } from '../middleware/auth';

const submissionRoutes = Router();

submissionRoutes.use(authenticate);

submissionRoutes.post('/', createSubmission);
submissionRoutes.get('/project/:projectId', getSubmissionsByProject);

export default submissionRoutes;