import { Router } from 'express';
import { metadata } from '../controllers/reports.controller.js';
import { asyncHandler } from '../lib/async-handler.js';

const reportsRoutes = Router();
reportsRoutes.get('/metadata', asyncHandler(metadata));

export default reportsRoutes;
