import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as deletion from '../controllers/pos-data-deletion.controller.js';
import { asyncHandler } from '../lib/async-handler.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { posDataDeletionExecuteSchema, posDataDeletionPreviewSchema } from '../validation/schemas.js';

const router = Router();

router.post('/preview', requireRole(UserRole.ADMINISTRATOR), validate(posDataDeletionPreviewSchema), asyncHandler(deletion.preview));
router.post('/execute', requireRole(UserRole.ADMINISTRATOR), validate(posDataDeletionExecuteSchema), asyncHandler(deletion.execute));

export default router;
