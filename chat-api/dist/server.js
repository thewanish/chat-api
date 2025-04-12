"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const stream_chat_1 = require("stream-chat");
const openai_1 = __importDefault(require("openai"));
const database_js_1 = require("./config/database.js");
const schema_js_1 = require("./db/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
// Initialize Stream Client
const chatClient = stream_chat_1.StreamChat.getInstance(process.env.STREAM_API_KEY, process.env.STREAM_API_SECRET);
// Initialize Open AI
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
// Register user with Stream Chat
app.post('/register-user', async (req, res) => {
    const { name, email } = req.body || {};
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }
    try {
        const userId = email.replace(/[^a-zA-Z0-9_-]/g, '_');
        // Check if user exists
        const userResponse = await chatClient.queryUsers({ id: { $eq: userId } });
        if (!userResponse.users.length) {
            // Add new user to stream
            await chatClient.upsertUser({
                id: userId,
                name: name,
                email: email,
                role: 'user',
            });
        }
        // Check for existing user in database
        const existingUser = await database_js_1.db
            .select()
            .from(schema_js_1.users)
            .where((0, drizzle_orm_1.eq)(schema_js_1.users.userId, userId));
        if (!existingUser.length) {
            console.log(`User ${userId} does not exist in the database. Adding them...`);
            await database_js_1.db.insert(schema_js_1.users).values({ userId, name, email });
        }
        res.status(200).json({ userId, name, email });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Send message to AI
app.post('/chat', async (req, res) => {
    const { message, userId } = req.body;
    if (!message || !userId) {
        return res.status(400).json({ error: 'Message and user are required' });
    }
    try {
        // Verify user exists
        const userResponse = await chatClient.queryUsers({ id: userId });
        if (!userResponse.users.length) {
            return res
                .status(404)
                .json({ error: 'user not found. Please register first' });
        }
        // Check user in database
        const existingUser = await database_js_1.db
            .select()
            .from(schema_js_1.users)
            .where((0, drizzle_orm_1.eq)(schema_js_1.users.userId, userId));
        if (!existingUser.length) {
            return res
                .status(404)
                .json({ error: 'User not found in database, please register' });
        }
        // Fetch users past messages for context
        const chatHistory = await database_js_1.db
            .select()
            .from(schema_js_1.chats)
            .where((0, drizzle_orm_1.eq)(schema_js_1.chats.userId, userId))
            .orderBy(schema_js_1.chats.createdAt)
            .limit(10);
        // Format chat history for Open AI
        const conversation = chatHistory.flatMap((chat) => [
            { role: 'user', content: chat.message },
            { role: 'assistant', content: chat.reply },
        ]);
        // Add latest user messages to the conversation
        conversation.push({ role: 'user', content: message });
        // Send message to OpenAI GPT-4
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: conversation,
        });
        const aiMessage = response.choices[0].message?.content ?? 'No response from AI';
        // Save chat to database
        await database_js_1.db.insert(schema_js_1.chats).values({ userId, message, reply: aiMessage });
        // Create or get channel
        const channel = chatClient.channel('messaging', `chat-${userId}`, {
            name: 'AI Chat',
            created_by_id: 'ai_bot',
        });
        await channel.create();
        await channel.sendMessage({ text: aiMessage, user_id: 'ai_bot' });
        res.status(200).json({ reply: aiMessage });
    }
    catch (error) {
        console.log('Error generating AI response', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Get chat history for a user
app.post('/get-messages', async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    try {
        const chatHistory = await database_js_1.db
            .select()
            .from(schema_js_1.chats)
            .where((0, drizzle_orm_1.eq)(schema_js_1.chats.userId, userId));
        res.status(200).json({ messages: chatHistory });
    }
    catch (error) {
        console.log('Error fetching chat history', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
