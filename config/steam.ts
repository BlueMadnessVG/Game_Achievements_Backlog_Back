export const STEAM_CONFIG = {
    API_KEY: process.env.STEAM_API_KEY as string || 'My_steam_key',
    BASE_URL: 'https://api.steampowered.com',
    RATE_LIMIT: 200,
    CACHE_DURATION: 3600
}