"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const serverless_1 = require("@neondatabase/serverless");
const neon_http_1 = require("drizzle-orm/neon-http");
const dotenv_1 = require("dotenv");
// Load env vars
(0, dotenv_1.config)({ path: '.env' });
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is undefined');
}
// Init Neon client
const sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
// Init Drizzle
exports.db = (0, neon_http_1.drizzle)(sql);
