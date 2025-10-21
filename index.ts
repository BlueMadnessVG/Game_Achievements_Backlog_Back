// src/index.ts
import express, { type Application, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import "dotenv/config";

// Routes
import steamRoutes from "./routes/steam";

// Middleware
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";

class GameAchievementsBackend {
  public app: Application;
  public port: string | number;

  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;

    this.initializeConfiguration();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeHealthChecks();
  }

  private initializeConfiguration(): void {
    // Validate required environment variables
    const requiredEnvVars = ["STEAM_API_KEY"];
    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    if (missingEnvVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingEnvVars.join(", ")}`
      );
    }

    console.log("✅ Environment configuration validated");
  }

  private initializeMiddlewares(): void {
    // Security headers
    this.app.use(
      helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin: this.getCorsOrigins(),
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      })
    );

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(
      express.json({
        limit: "10mb",
        verify: (req: any, res, buf) => {
          req.rawBody = buf;
        },
      })
    );

    this.app.use(
      express.urlencoded({
        extended: true,
        limit: "10mb",
      })
    );

    // Logging
    this.app.use(
      morgan(this.getMorganFormat(), {
        skip: (req) => req.url === "/health",
      })
    );

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`📥 ${req.method} ${req.url}`, {
        query: req.query,
        params: req.params,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      });
      next();
    });

    console.log("✅ Middlewares initialized");
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use("/api/steam", steamRoutes);

    // Root endpoint
    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        message: "Game Achievements Backlog API",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        endpoints: {
          steam: "/api/steam",
          health: "/health",
          docs: "/api/docs", // Future OpenAPI docs
        },
      });
    });

    console.log("✅ Routes initialized");
  }

  private initializeErrorHandling(): void {
    // 404 handler - must be after all routes
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);

    // Unhandled rejection handler
    process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
      console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
      // In production, you might want to exit here
      // process.exit(1);
    });

    // Uncaught exception handler
    process.on("uncaughtException", (error: Error) => {
      console.error("❌ Uncaught Exception:", error);
      process.exit(1);
    });

    console.log("✅ Error handling initialized");
  }

  private initializeHealthChecks(): void {
    // Basic health check
    this.app.get("/health", (req: Request, res: Response) => {
      const healthCheck = {
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || "development",
      };

      res.json(healthCheck);
    });

    // Detailed health check (could check database, external APIs, etc.)
    this.app.get("/health/detailed", async (req: Request, res: Response) => {
      try {
        const healthDetails = {
          status: "OK",
          timestamp: new Date().toISOString(),
          checks: {
            steam_api: await this.checkSteamAPIHealth(),
            memory: this.getMemoryHealth(),
            disk: this.getDiskHealth(),
          },
        };

        res.json(healthDetails);
      } catch (error) {
        res.status(503).json({
          status: "SERVICE_UNAVAILABLE",
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    console.log("✅ Health checks initialized");
  }

  private getCorsOrigins(): string[] {
    const origins = process.env.CORS_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:5173", // Vite
      "http://127.0.0.1:3000",
    ];

    if (process.env.NODE_ENV === "production" && process.env.FRONTEND_URL) {
      origins.push(process.env.FRONTEND_URL);
    }

    return origins;
  }

  private getMorganFormat(): string {
    return process.env.NODE_ENV === "production" ? "combined" : "dev";
  }

  private async checkSteamAPIHealth(): Promise<{
    status: string;
    responseTime: number;
  }> {
    const startTime = Date.now();

    // Set up an AbortController to implement a fetch timeout
    const controller = new AbortController();
    const timeoutMs = 5000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Simple check - try to get a known game's achievements
      const testSteamId = "76561198136740830"; // Valve's Steam ID
      const testAppId = 570; // Dota 2

      const response = await fetch(
        `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid=${testAppId}&key=${process.env.STEAM_API_KEY}`,
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      const responseTime = Date.now() - startTime;

      return {
        status: response.ok ? "HEALTHY" : "DEGRADED",
        responseTime,
      };
    } catch (error) {
      return {
        status: "UNHEALTHY",
        responseTime: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private getMemoryHealth(): { status: string; usage: any } {
    const memoryUsage = process.memoryUsage();
    const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const usagePercent = (usedMB / totalMB) * 100;

    return {
      status: usagePercent > 90 ? "WARNING" : "HEALTHY",
      usage: {
        used: `${usedMB} MB`,
        total: `${totalMB} MB`,
        percentage: `${Math.round(usagePercent)}%`,
      },
    };
  }

  private getDiskHealth(): { status: string; free: string } {
    // This is a simplified version - in production, you might use a proper disk usage library
    return {
      status: "HEALTHY", // Simplified for example
      free: "N/A", // You'd implement actual disk space checking here
    };
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`
🎮 Game Achievements Backlog API Server Started!

📍 Environment: ${process.env.NODE_ENV || "development"}
🚀 Server running on port: ${this.port}
📊 API Documentation: http://localhost:${this.port}/
❤️ Health Check: http://localhost:${this.port}/health
🔍 Detailed Health: http://localhost:${this.port}/health/detailed

📋 Available Endpoints:
   • GET  /api/steam/user/:steamId/games
   • GET  /api/steam/user/:steamId/games/:appId/achievements
   • GET  /health
   • GET  /health/detailed

⏰ Started at: ${new Date().toISOString()}
      `);
    });
  }
}

// Create and start the application
const server = new GameAchievementsBackend();
server.start();

export default server.app;
