"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.chats = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.chats = (0, pg_core_1.pgTable)('chats', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.text)('user_id').notNull(),
    message: (0, pg_core_1.text)('message').notNull(),
    reply: (0, pg_core_1.text)('reply').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.users = (0, pg_core_1.pgTable)('users', {
    userId: (0, pg_core_1.text)('user_id').primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    email: (0, pg_core_1.text)('email').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
