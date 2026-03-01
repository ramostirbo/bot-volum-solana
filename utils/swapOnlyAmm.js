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
exports.getSellTxWithJupiter = exports.getBuyTxWithJupiter = void 0;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("../constants");
const axios_1 = __importDefault(require("axios"));
const https_1 = __importDefault(require("https"));

// Jupiter V6 API Endpoint - Using public endpoint to avoid 401
const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6";

const jupClient = axios_1.default.create({
    baseURL: JUPITER_QUOTE_API,
    timeout: 20000,
    headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
    }
});

const getBuyTxWithJupiter = (wallet, baseMint, amount) => __awaiter(void 0, void 0, void 0, function* () {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        try {
            const quoteResponse = yield jupClient.get(`/quote`, {
                params: {
                    inputMint: "So11111111111111111111111111111111111111112",
                    outputMint: baseMint.toBase58(),
                    amount: amount.toString(),
                    slippageBps: constants_1.SLIPPAGE,
                    onlyDirectRoutes: false
                }
            });
            
            if (!quoteResponse.data || quoteResponse.data.error) {
                console.log(`┃ Quote Error: ${quoteResponse.data?.error || 'Invalid token or no liquidity'}`);
                return null;
            }

            const swapResponse = yield jupClient.post(`/swap`, {
                quoteResponse: quoteResponse.data,
                userPublicKey: wallet.publicKey.toString(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: 600000
            });

            if (!swapResponse.data || !swapResponse.data.swapTransaction) {
                return null;
            }

            const swapTransactionBuf = Buffer.from(swapResponse.data.swapTransaction, "base64");
            const transaction = web3_js_1.VersionedTransaction.deserialize(swapTransactionBuf);
            transaction.sign([wallet]);
            return transaction;
        }
        catch (error) {
            console.log(`┃ Retry ${retryCount + 1}: Connection Issue (Jupiter API): ${error.message}`);
            retryCount++;
            yield new Promise(r => setTimeout(r, 3000));
        }
    }
    return null;
});
exports.getBuyTxWithJupiter = getBuyTxWithJupiter;

const getSellTxWithJupiter = (wallet, baseMint, amount) => __awaiter(void 0, void 0, void 0, function* () {
    if (BigInt(amount) <= 0n) return null;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        try {
            const quoteResponse = yield jupClient.get(`/quote`, {
                params: {
                    inputMint: baseMint.toBase58(),
                    outputMint: "So11111111111111111111111111111111111111112",
                    amount: amount.toString(),
                    slippageBps: constants_1.SLIPPAGE,
                    onlyDirectRoutes: false
                }
            });

            if (!quoteResponse.data || quoteResponse.data.error) {
                return null;
            }

            const swapResponse = yield jupClient.post(`/swap`, {
                quoteResponse: quoteResponse.data,
                userPublicKey: wallet.publicKey.toString(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: 600000
            });

            if (!swapResponse.data || !swapResponse.data.swapTransaction) {
                return null;
            }

            const swapTransactionBuf = Buffer.from(swapResponse.data.swapTransaction, "base64");
            const transaction = web3_js_1.VersionedTransaction.deserialize(swapTransactionBuf);
            transaction.sign([wallet]);
            return transaction;
        }
        catch (error) {
            console.log(`┃ Retry ${retryCount + 1}: Connection Issue (Jupiter API): ${error.message}`);
            retryCount++;
            yield new Promise(r => setTimeout(r, 3000));
        }
    }
    return null;
});
exports.getSellTxWithJupiter = getSellTxWithJupiter;
