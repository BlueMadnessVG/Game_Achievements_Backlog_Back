import type { Request, Response, NextFunction } from "express";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour default

export const cacheMiddleware = (duration?: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") {
      return next();
    }

    const key = `${req.originalUrl}:${JSON.stringify(req.query)}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      console.log("Cache hit for:", key);
      return res.json(cachedResponse);
    }

    const originalJson = res.json;
    res.json = function (body: any) {
      const ttl = duration !== undefined ? duration : cache.options.stdTTL;
      cache.set(key, body, ttl as number);
      return originalJson.call(this, body);
    };

    next();
  };
};
