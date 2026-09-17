import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { analytics } from '../controllers/customer-feedback.controller.js';
const router = Router();
router.get('/satisfaction', asyncHandler(analytics));
export default router;
