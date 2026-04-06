type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const envLevel = (process.env.LOG_LEVEL || "info").toLowerCase() as LogLevel;
const currentLevel: LogLevel = levelOrder[envLevel] ? envLevel : "info";

function shouldLog(level: LogLevel) {
  return levelOrder[level] >= levelOrder[currentLevel];
}

function format(level: LogLevel, message: string, meta?: unknown) {
  const base = `[${level.toUpperCase()}] ${message}`;
  if (meta === undefined) return base;
  return `${base} | ${safeStringify(meta)}`;
}

function safeStringify(meta: unknown) {
  try {
    return JSON.stringify(meta);
  } catch {
    return "[unserializable]";
  }
}

export const logger = {
  debug: (msg: string, meta?: unknown) => {
    if (shouldLog("debug")) console.debug(format("debug", msg, meta));
  },
  info: (msg: string, meta?: unknown) => {
    if (shouldLog("info")) console.info(format("info", msg, meta));
  },
  warn: (msg: string, meta?: unknown) => {
    if (shouldLog("warn")) console.warn(format("warn", msg, meta));
  },
  error: (msg: string, meta?: unknown) => {
    if (shouldLog("error")) console.error(format("error", msg, meta));
  },
};






