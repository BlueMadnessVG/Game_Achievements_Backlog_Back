import { Router } from "express";
import { SteamService } from "../services/SteamService";
import { object, optional, pipe, regex, string, transform } from "valibot";
import { rateLimit } from "../middleware/rateLimit";
import { validateRequest } from "../middleware/validation";
import { cacheMiddleware } from "../middleware/cache";
import { ResponseBuilder } from "../models/responses/builder";
import { errorHandler } from "../middleware/errorHandler";

const router = Router();
const steamService = new SteamService(process.env.STEAM_API_KEY!);

const getUserGameSchema = object({
  params: object({
    steamId: pipe(string(), regex(/^\d{17}$/)),
  }),
  query: object({
    includeAchievements: optional(
      pipe(
        string(),
        transform((val) => val === "true")
      )
    ),
  }),
});

const getGameAchievementsSchema = object({
  params: object({
    steamId: pipe(string(), regex(/^\d{17}$/)),
    appId: pipe(
      string(),
      transform((val) => parseInt(val, 10))
    ),
  }),
});

router.get(
  "/user/:steamId/games",
  rateLimit({ windowMs: 60000, maxRequests: 10 }),
  validateRequest(getUserGameSchema),
  cacheMiddleware(300),
  async (req, res, next) => {
    try {
      const { steamId } = req.validatedData.params;
      const { includeAchievements } = req.validatedData.query;

      const games = await steamService.getUserGames(steamId);

      let gameWithAchievements = games;
      if (includeAchievements) {
        gameWithAchievements = await Promise.all(
          games.map(async (game) => {
            const achievements = await steamService.getGameAchievements(
              steamId,
              game.appId
            );
            return { ...game, achievements };
          })
        );
      }

      const totalPlaytime = games.reduce(
        (sum, game) => sum + game.playtime.total,
        0
      );

      const response = new ResponseBuilder({
        games: gameWithAchievements,
        totalCount: games.length,
        totalPlaytime,
      })
        .withMetadata({
          steamId,
          lastUpdated: new Date().toISOString(),
          source: "steam",
        })
        .build();

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/user/:steamId/games/:appId/achievements",
  rateLimit({ windowMs: 60000, maxRequests: 15 }),
  validateRequest(getGameAchievementsSchema),
  cacheMiddleware(600), // 10 minutes
  async (req, res, next) => {
    try {
      const { steamId, appId } = req.validatedData.params;

      const achievements = await steamService.getGameAchievements(
        steamId,
        appId
      );
      const unlockedCount = achievements.filter((a) => a.unlocked).length;

      const response = new ResponseBuilder({
        achievements,
        summary: {
          total: achievements.length,
          unlocked: unlockedCount,
          percentage:
            achievements.length > 0
              ? (unlockedCount / achievements.length) * 100
              : 0,
        },
      })
        .withMetadata({ steamId, appId })
        .build();

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

router.use(errorHandler);

export default router;
