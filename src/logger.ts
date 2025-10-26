/**
 * Logger utility with configurable log levels and environment detection
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

class Logger {
  private static instance: Logger;
  private currentLevel: LogLevel = LogLevel.INFO;
  private prefix: string = "[TaskRollover]";

  private constructor() {
    if (this.isDevelopment()) {
      this.currentLevel = LogLevel.DEBUG;
    } else {
      this.currentLevel = LogLevel.INFO;
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public isDevelopment(): boolean {
    return __DEV__;
  }

  public isProduction(): boolean {
    return !__DEV__;
  }

  public setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  public getLevel(): LogLevel {
    return this.currentLevel;
  }

  public setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  private formatMessage(level: string, ...args: unknown[]): unknown[] {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    return [`${this.prefix} [${timestamp}] [${level}]`, ...args];
  }

  /**
   * Debug level logging (most verbose)
   * Only logs in development by default
   */
  public debug(...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.log(...this.formatMessage("DEBUG", ...args));
    }
  }

  /**
   * Info level logging
   * Only logs in development by default
   */
  public info(...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      console.info(...this.formatMessage("INFO", ...args));
    }
  }

  /**
   * Warning level logging
   */
  public warn(...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.WARN) {
      console.warn(...this.formatMessage("WARN", ...args));
    }
  }

  /**
   * Error level logging
   */
  public error(...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      console.error(...this.formatMessage("ERROR", ...args));
    }
  }

  /**
   * Always log regardless of level (use sparingly)
   */
  public force(...args: unknown[]): void {
    console.log(...this.formatMessage("FORCE", ...args));
  }
}

export const logger = Logger.getInstance();
