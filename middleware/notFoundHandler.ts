import type { Request, Response, NextFunction } from 'express';
import { ResponseBuilder } from '../models/responses/builder';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const errorResponse = ResponseBuilder.error(
    'NOT_FOUND',
    `Route ${req.method} ${req.url} not found`
  );

  res.status(404).json(errorResponse);
};