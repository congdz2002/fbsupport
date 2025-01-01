const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Danh sách các domain được phép truy cập
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://yourdomain.com', // Thêm domain chính của bạn vào đây
    process.env.FRONTEND_URL // Hoặc lấy từ biến môi trường
];

// Cấu hình CORS
app.use(cors({
    origin: function (origin, callback) {
        // Cho phép requests không có origin (như mobile apps hoặc curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(null, false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
    credentials: true
}));

// Middleware bảo vệ các routes
app.use((req, res, next) => {
    // Thêm security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

app.use(express.json());

// Lấy các thông tin từ env
const API_KEY = process.env.API_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SERVER_URL = process.env.SERVER_URL;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Config endpoint với rate limiting cơ bản
let lastRequestTime = {};
const RATE_LIMIT_WINDOW = 60000; // 1 phút
const MAX_REQUESTS = 30; // số request tối đa trong 1 phút

app.get('/config', (req, res) => {
    const clientIP = req.ip;
    const now = Date.now();
    
    // Simple rate limiting
    if (lastRequestTime[clientIP] && (now - lastRequestTime[clientIP].time) < RATE_LIMIT_WINDOW) {
        if (lastRequestTime[clientIP].count >= MAX_REQUESTS) {
            return res.status(429).json({ error: 'Too many requests' });
        }
        lastRequestTime[clientIP].count++;
    } else {
        lastRequestTime[clientIP] = { time: now, count: 1 };
    }

    res.json({
        apiKey: API_KEY,
        serverUrl: SERVER_URL,
        telegramChatId: TELEGRAM_CHAT_ID
    });
});

// API key validation middleware
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Telegram endpoint với validation
app.post('/telegram', validateApiKey, async (req, res) => {
    try {
        const { chatId, text } = req.body;

        if (!chatId || !text) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!BOT_TOKEN) {
            return res.status(500).json({ error: 'Bot configuration error' });
        }

        const response = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text,
                    parse_mode: 'HTML'
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Telegram API error:', data);
            throw new Error(data.description || 'Telegram API error');
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    console.log('Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        PORT: port,
        SERVER_URL: SERVER_URL || 'Not set'
    });
});