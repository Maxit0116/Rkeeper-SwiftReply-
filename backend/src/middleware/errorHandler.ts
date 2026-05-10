import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({ path: e.path, message: e.message })),
    });
  }

  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
}
