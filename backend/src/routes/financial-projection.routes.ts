import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as financialProjection from '../controllers/financial-projection.controller.js';
import { asyncHandler } from '../lib/async-handler.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { financialSettingsSchema, productCostSchema, idParams } from '../validation/schemas.js';

const router = Router();
const readRoles = [UserRole.ADMINISTRATOR, UserRole.MANAGER, UserRole.STAFF];
const writeRoles = [UserRole.ADMINISTRATOR, UserRole.MANAGER];

router.get('/summary', requireRole(...readRoles), asyncHandler(financialProjection.summary));
router.get('/coverage', requireRole(...readRoles), asyncHandler(financialProjection.coverage));
router.get('/settings', requireRole(...readRoles), asyncHandler(financialProjection.settings));
router.put('/settings', requireRole(...writeRoles), validate(financialSettingsSchema), asyncHandler(financialProjection.updateSettings));
router.get('/products', requireRole(...readRoles), asyncHandler(financialProjection.products));
router.patch('/products/:id', requireRole(...writeRoles), validate(idParams, 'params'), validate(productCostSchema), asyncHandler(financialProjection.updateProductCost));

export default router;
