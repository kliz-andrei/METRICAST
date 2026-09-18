/// <reference path="../src/types/express.d.ts" />
import { app } from '../src/app.js';

// Thin Vercel adapter: the existing Express application remains the API source.
export default app;
