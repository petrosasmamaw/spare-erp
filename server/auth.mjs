import { betterAuth } from "better-auth";
import { toNodeHandler } from "better-auth/node";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const authBaseURL = process.env.BETTER_AUTH_URL || "http://localhost:4000";
const webOrigins = (process.env.WEB_ORIGINS || process.env.WEB_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

if (!process.env.BETTER_AUTH_SECRET) {
  console.warn("BETTER_AUTH_SECRET is not set. Set it in server/.env");
}

if (!connectionString) {
  throw new Error("DATABASE_URL is required for Better Auth");
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: authBaseURL,
  trustedOrigins: [...new Set([...webOrigins, authBaseURL])],
  database: pool,
  emailAndPassword: { enabled: true },
});

export const nodeHandler = toNodeHandler(auth);
