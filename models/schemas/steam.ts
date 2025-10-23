import {
  any,
  array,
  boolean,
  intersect,
  literal,
  number,
  object,
  optional,
  pipe,
  regex,
  string,
  transform,
} from "valibot";
import { BaseResponseSchema } from "./base";

export const SteamIdSchema = pipe(
  string(),
  regex(/^\d{17}$/, "Invalid SteamID format")
);

export const GameSchema = object({
  appId: number(),
  name: string(),
  playtime: object({
    total: number(), // minutes
    twoWeeks: optional(number()),
  }),
  iconUrl: optional(string()),
  coverUrl: optional(string()),
  hasCommunityVisibleStats: boolean(),
  lastPlayed: optional(
    pipe(
      number(),
      transform((val) => new Date(val * 1000))
    )
  ),
  achievements: optional(array(any())),
});

export const AchievementsSchema = object({
  apiName: string(),
  name: string(),
  description: string(),
  icon: object({
    default: string(),
    achieved: string(),
  }),
  globalPercentage: number(),
  unlocked: boolean(),
  unlockTime: optional(number()),
  platform: literal("steam"),
  hidden: optional(boolean()),
});

export const UserGamesResponseSchema = intersect([
  BaseResponseSchema,
  object({
    data: object({
      games: array(GameSchema),
      totalCount: number(),
      totalPlaytime: number(),
    }),
    metadata: object({
      steamId: SteamIdSchema,
      lastUpdated: string(),
    }),
  }),
]);

export const GameAchievementsResponseSchema = intersect([
  BaseResponseSchema,
  object({
    data: object({
      achievements: array(AchievementsSchema),
      summary: object({
        total: number(),
        unlocked: number(),
        percentage: number(),
      }),
    }),
    metadata: object({
      appId: number(),
      steamId: SteamIdSchema,
    }),
  }),
]);