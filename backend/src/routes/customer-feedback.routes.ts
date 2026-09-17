import { Router } from 'express';
import { UserRole } from '@prisma/client';
import multer from 'multer';
import * as feedback from '../controllers/customer-feedback.controller.js';
import { asyncHandler } from '../lib/async-handler.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router.get('/overview', asyncHandler(feedback.overview));
router.get('/imports', asyncHandler(feedback.imports));
router.post('/validate', requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER), upload.single('feedback'), asyncHandler(feedback.validate));
router.post('/import', requireRole(UserRole.ADMINISTRATOR, UserRole.MANAGER), upload.single('feedback'), asyncHandler(feedback.upload));
router.delete('/imports/:id', requireRole(UserRole.ADMINISTRATOR), asyncHandler(feedback.remove));
export default router;
