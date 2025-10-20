export class SteamAPIError extends Error {
  public statusCode?: number;
  public steamErrorCode?: number;
  public timestamp: string;

  constructor(message: string, statusCode?: number, steamErrorCode?: number) {
    super(message);
    this.name = "SteamAPIError";
    this.statusCode = statusCode;
    this.steamErrorCode = steamErrorCode;
    this.timestamp = new Date().toISOString();
  }
}

export const STEAM_ERROR_CODES = {
  1: "Invalid service",
  2: "Service temporarily down",
  5: "Invalid format",
  8: "Invalid SteamID",
  // ... more error codes
};
