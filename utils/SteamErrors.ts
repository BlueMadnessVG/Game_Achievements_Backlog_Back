export class SteamAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public steamErrorCode?: number
  ) {
    super(message);
    this.name = "SteamAPIError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}
