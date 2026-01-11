import { AppConfig } from "@/config";

export interface ServerFactoryOptions {
  config: AppConfig;
  name?: string;
}

export interface GracefulShutdownOptions {
  /** Timeout in ms before forcing shutdown (default: 10000) */
  timeout?: number;

  /** Custom cleanup functions to run before shutdown */
  onShutdown?: () => Promise<void> | void;

  /**
   * Handler for uncaught exceptions
   * By default: logs error and continues (server never stops)
   * Return true to shutdown, false to continue
   */
  onUncaughtException?: (error: Error) => boolean | Promise<boolean>;

  /**
   * Handler for unhandled promise rejections
   * By default: logs error and continues (server never stops)
   * Return true to shutdown, false to continue
   */
  onUnhandledRejection?: (reason: unknown) => boolean | Promise<boolean>;

  /**
   * Callback to notify admins/external services about critical errors
   * Called for uncaught exceptions and unhandled rejections
   */
  onCriticalError?: (error: {
    type: "uncaughtException" | "unhandledRejection";
    error: Error | unknown;
    timestamp: string;
  }) => Promise<void> | void;
}
