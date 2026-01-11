export interface ServerConfig {
  port: number;
  host: string;
  prefix: string;
}

export interface DatabaseConfig {
  url: string | undefined;
  enabled: boolean;
}

export interface DocsConfig {
  enabled: boolean;
  provider: "scalar" | "swaggerui";
  path: string;
  title: string;
  version: string;
  description: string;
  tags?: Array<{ name: string; description: string }>;
}

export interface CorsConfig {
  origin: string | string[] | boolean;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
}

export interface LoggerConfig {
  level: "debug" | "info" | "warn" | "error";
  enabled: boolean;
}

export interface QueueConfig {
  /** Redis URL for queues (defaults to main REDIS_URL) */
  redisUrl: string | undefined;
  /** Worker concurrency per queue */
  concurrency: number;
  /** Enable queue system */
  enabled: boolean;
}

export interface BullBoardConfig {
  /** Enable Bull Board UI */
  enabled: boolean;
  /** Bull Board URL path */
  path: string;
  /** Basic auth username (optional) */
  username?: string;
  /** Basic auth password (optional) */
  password?: string;
}

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  docs: DocsConfig;
  cors: CorsConfig;
  logger: LoggerConfig;
  queue: QueueConfig;
  bullBoard: BullBoardConfig;
  isDev: boolean;
  isProd: boolean;
}
