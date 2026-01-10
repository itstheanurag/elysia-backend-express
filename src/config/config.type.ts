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

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  docs: DocsConfig;
  cors: CorsConfig;
  logger: LoggerConfig;
  isDev: boolean;
  isProd: boolean;
}
