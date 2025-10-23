import type { AxiosInstance, AxiosResponse } from "axios";
import axios from "axios";
import type { Achievement, Game } from "../models/types/steam";
import { array, safeParse } from "valibot";
import { GameSchema, AchievementsSchema } from "../models/schemas/steam";
import { SteamAPIError } from "../utils/SteamErrors";

interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url: string;
  has_community_visible_stats: boolean;
  rtime_last_played?: number;
}

export class SteamService {
  private client: AxiosInstance;
  private cache = new Map<string, { data: any; expiry: number }>();

  constructor(private apiKey: string) {
    this.client = axios.create({
      baseURL: "https://api.steampowered.com",
      timeout: 10000,
      params: { key: this.apiKey },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        throw this.handleSteamError(error);
      }
    );
  }

  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, any>
  ): Promise<T> {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    try {
      const response = await this.client.get<T>(endpoint, { params });

      this.cache.set(cacheKey, {
        data: response.data,
        expiry: Date.now() + 3600000,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getUserGames(steamId: string): Promise<Game[]> {
    const data = await this.makeRequest<{ response: { games?: SteamGame[] } }>(
      "IPlayerService/GetOwnedGames/v0001/",
      {
        steamid: steamId,
        include_appinfo: 1,
        include_played_free_games: 1,
        format: "json",
      }
    );

    const games = data.response?.games || [];
    const transformedGames = games.map((game) => this.transformGameData(game));

    const result = safeParse(array(GameSchema), transformedGames);
    if (!result.success) {
      console.warn("Game data validation warnings:", result.issues);
    }

    return transformedGames;
  }

  private transformGameData(game: SteamGame): Game {
    return {
      appId: game.appid,
      name: game.name,
      playtime: {
        total: game.playtime_forever,
        twoWeeks: game.playtime_2weeks,
      },
      iconUrl: `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`,
      coverUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/library_600x900.jpg`,
      hasCommunityVisibleStats: game.has_community_visible_stats,
      lastPlayed:
        game.rtime_last_played != null
          ? new Date(game.rtime_last_played * 1000)
          : undefined,
    };
  }

  async getGameAchievements(
    steamId: string,
    appId: number
  ): Promise<Achievement[]> {
    try {
      const [userStats, globalStats, schema] = await Promise.all([
        this.makeRequest<{ playerstats?: { achievements?: any[] } }>(
          "ISteamUserStats/GetPlayerAchievements/v0001/",
          { steamid: steamId, appid: appId, l: "english" }
        ),
        this.makeRequest<{ achievementpercentages?: { achievements?: any[] } }>(
          "ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/",
          { gameid: appId }
        ),
        this.makeRequest<{
          game?: { availableGameStats?: { achievements?: any[] } };
        }>("ISteamUserStats/GetSchemaForGame/v2/", { appid: appId }),
      ]);

      return this.transformAchievementsData(
        userStats.playerstats?.achievements || [],
        globalStats.achievementpercentages?.achievements || [],
        schema.game?.availableGameStats?.achievements || []
      );
    } catch (error) {
      console.warn(`Could not fetch achievements for app ${appId}:`, error);
      return [];
    }
  }

  private transformAchievementsData(
    userAchievements: any[],
    globalStats: any[],
    schema: any[]
  ): Achievement[] {
    const achievementMap = new Map<string, Partial<Achievement>>();

    schema.forEach((ach) => {
      achievementMap.set(ach.name, {
        apiName: ach.name,
        name: ach.displayName,
        description: ach.description,
        icon: {
          default: ach.icon,
          achieved: ach.icongray,
        },
        globalPercentage: 0,
        unlocked: false,
        platform: "steam" as const,
        hidden: ach.hidden === 1,
      });
    });

    globalStats.forEach((globalAch) => {
      const achievement = achievementMap.get(globalAch.name);
      if (achievement) {
        achievement.globalPercentage = globalAch.percent;
      }
    });

    userAchievements.forEach((userAch) => {
      const achievement = achievementMap.get(userAch.apiname);
      if (achievement) {
        achievement.unlocked = userAch.achieved === 1;
        achievement.unlockTime = userAch.unlocktime || undefined;
      }
    });

    const achievements = Array.from(achievementMap.values());

    const result = safeParse(array(AchievementsSchema), achievements);
    if (!result.success) {
      console.warn("Achievement data validation warnings:", result.issues);
    }

    return achievements as Achievement[];
  }

  private handleSteamError(error: any): SteamAPIError {
    if (error.response) {
        return new SteamAPIError(
            `Steam API Error: ${error.response.statusText}`,
            error.response.status,
            error.response.data?.error?.errorcode
        )
    }

    if (error.request) {
        return new SteamAPIError('Network error contacting Steam API', 503);
    }

    return new SteamAPIError('Unexpected error', 500)
  }
}
