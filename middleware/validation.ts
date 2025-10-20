import type { Request, Response, NextFunction } from "express";
import { safeParse, type BaseSchema } from "valibot";
import { ResponseBuilder } from "../models/responses/builder";

declare global {
  namespace Express {
    interface Request {
      validatedData?: any;
    }
  }
}

export const validateRequest = (schema: BaseSchema<any, any, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = {
      body: req.body,
      query: req.query,
      params: req.params,
    };

    const result = safeParse(schema, data);
    if (!result.success) {
      const errors = result.issues.map((issue) => ({
        path: issue.path
          ? issue.path
              .map((p: { key: string | number }) => String(p.key))
              .join(".")
          : undefined,
        message: issue.message,
      }));

      const errorResponse = ResponseBuilder.error(
        "VALIDATION_ERROR",
        "Request validation failed",
        { errors }
      );

      return res.status(400).json(errorResponse);
    }

    req.validatedData = result.output;
    next();
  };
};
