import { Router } from 'express';
import { operations } from '../controllers/operational.controller.js';
import { asyncHandler } from '../lib/async-handler.js';

const operationalRoutes = Router();

operationalRoutes.get('/operations', asyncHandler(operations));

export default operationalRoutes;
