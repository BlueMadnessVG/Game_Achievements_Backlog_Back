import type { NextFunction, Request, Response } from "express";
import { SteamAPIError } from "../utils/SteamErrors";
import { ResponseBuilder } from "../models/responses/builder";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error caught by handler:", {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  if (error instanceof SteamAPIError) {
    return res.status(error.statusCode || 500).json(
      ResponseBuilder.error("STEAM_API_ERROR", error.message, {
        steamErrorCode: error.steamErrorCode,
      })
    );
  }

  if (error.name === "ValibotError") {
    return res
      .status(400)
      .json(ResponseBuilder.error("VALIDATION_ERROR", "Invalid data format"));
  }

  const statusCode = (error as any).statusCode || 500;
  res
    .status(statusCode)
    .json(
      ResponseBuilder.error(
        "INTERNAL_ERROR",
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message
      )
    );
};
