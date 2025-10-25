import pino from "pino";

const isProd = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL ?? (isProd ? "info" : "debug");

const logger = pino({
  level,
  redact: {
    paths: [
      // common auth headers/fields
      "req.headers.authorization",
      "headers.authorization",
      "Authorization",
      "authorization",
      // supabase keys
      "SUPABASE_*",
      "supabase*",
    ],
    remove: true,
  },
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          singleLine: false,
        },
      },
});

export type Logger = typeof logger;
export default logger;
