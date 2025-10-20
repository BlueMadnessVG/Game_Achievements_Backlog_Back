import type { NextFunction, Request, Response } from "express";
import { ResponseBuilder } from "../models/responses/builder";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

const requestStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (config: RateLimitConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress;

    if (!key) {
      return next();
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;

    for (const [ip, data] of requestStore.entries()) {
      if (data.resetTime < windowStart) {
        requestStore.delete(ip);
      }
    }

    const clientData = requestStore.get(key) || { count: 0, resetTime: now };
    if (clientData.resetTime < windowStart) {
      clientData.count = 0;
      clientData.resetTime = now;
    }

    clientData.count++;

    if (clientData.count > config.maxRequests) {
      return res.status(429).json(
        ResponseBuilder.error(
          "RATE_LIMIT_EXCEEDED",
          config.message || "Too many request",
          {
            retryAfter: Math.ceil(
              (clientData.resetTime + config.windowMs - now) / 1000
            ),
          }
        )
      );
    }

    requestStore.set(key, clientData);

    res.set({
      "X-RateLimit-Limit": config.maxRequests.toString(),
      "X-RateLimit-Remaining": (
        config.maxRequests - clientData.count
      ).toString(),
      "X-RateLimit-Reset": Math.ceil(
        (clientData.resetTime + config.windowMs) / 1000
      ).toString(),
    });

    next();
  };
};
