import type { InferOutput } from "valibot";
import type {
  AchievementsSchema,
  GameAchievementsResponseSchema,
  GameSchema,
  UserGamesResponseSchema,
} from "../schemas/steam";

export type Game = InferOutput<typeof GameSchema>;
export type Achievement = InferOutput<typeof AchievementsSchema>;
export type UserGameResponse = InferOutput<typeof UserGamesResponseSchema>;
export type GameAchievementsResponse = InferOutput<
  typeof GameAchievementsResponseSchema
>;

export interface GetUserGameParams {
    steamId: string;
    includeAchievements?: boolean;
}

export interface GetGameAchievementsParams {
    steamId: string;
    appId: number;
}