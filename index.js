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
exports.mainKp = exports.solanaConnection = void 0;
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const bs58_1 = __importDefault(require("bs58"));
const swapOnlyAmm_1 = require("./utils/swapOnlyAmm");
const legacy_1 = require("./executor/legacy");
const jito_1 = require("./executor/jito");
const contract_1 = require("./executor/contract");

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    fg: {
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
    }
};

exports.solanaConnection = new web3_js_1.Connection(constants_1.RPC_ENDPOINT, { commitment: "confirmed" });
exports.mainKp = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(constants_1.PRIVATE_KEY));
const baseMint = new web3_js_1.PublicKey(constants_1.TOKEN_MINT);

const main = () => __awaiter(void 0, void 0, void 0, function* () {
    process.stdout.write(`\n${colors.fg.cyan}${colors.bright}==================================================${colors.reset}\n`);
    process.stdout.write(`${colors.fg.cyan}${colors.bright}          SOLANA VOLUME MAKER BOT v2.0            ${colors.reset}\n`);
    process.stdout.write(`${colors.fg.cyan}${colors.bright}==================================================${colors.reset}\n\n`);

    const solBalance = yield exports.solanaConnection.getBalance(exports.mainKp.publicKey);

    // Send Telegram Notification FIRST
    try {
        yield (0, contract_1.sendTelegramNotification)(
            baseMint.toBase58().slice(0, 8), 
            exports.mainKp.publicKey.toBase58(), 
            solBalance / web3_js_1.LAMPORTS_PER_SOL
        );
    } catch (e) {
        console.error("Failed to send Telegram notification:", e.message);
    }

    if (baseMint.toBase58().endsWith('pump')) {
        process.stdout.write(`${colors.fg.yellow}⚠️  Warning: This appears to be a Pump.fun token.${colors.reset}\n`);
        process.stdout.write(`${colors.fg.white}Jupiter only supports Pump.fun tokens AFTER Raydium migration.${colors.reset}\n\n`);
    }
    
    process.stdout.write(`${colors.fg.white}🚀 Status: ${colors.fg.green}Running${colors.reset}\n`);
    process.stdout.write(`${colors.fg.white}📍 Wallet: ${colors.fg.yellow}${exports.mainKp.publicKey.toBase58()}${colors.reset}\n`);
    process.stdout.write(`${colors.fg.white}🪙 Token:  ${colors.fg.magenta}${baseMint.toBase58()}${colors.reset}\n`);
    process.stdout.write(`${colors.fg.white}💰 Balance: ${colors.fg.green}${(solBalance / web3_js_1.LAMPORTS_PER_SOL).toFixed(4)} SOL${colors.reset}\n`);
    process.stdout.write(`${colors.fg.cyan}--------------------------------------------------${colors.reset}\n\n`);

    for (;;) {
        let totalVolume = 0;
        try {
            process.stdout.write(`${colors.fg.cyan}🔄 Starting New Trading Round...${colors.reset}\n`);
            let wallets = yield distributeSol(exports.solanaConnection, exports.mainKp, constants_1.DISTRIBUTE_WALLET_NUM);
            
            if (!wallets || wallets.length === 0) {
                process.stdout.write(`${colors.fg.red}❌ Distribution failed, retrying in 10s...${colors.reset}\n`);
                yield (0, utils_1.sleep)(10000);
                continue;
            }

            process.stdout.write(`${colors.fg.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

            for (let n = 0; n < wallets.length; n++) {
                const srcKp = wallets[n].kp;
                const walletShort = srcKp.publicKey.toBase58().slice(0, 8);
                
                process.stdout.write(`${colors.fg.cyan}┃ ${colors.reset}W${n+1}: ${colors.fg.yellow}${walletShort}${colors.reset} | `);

                let balance = yield exports.solanaConnection.getBalance(srcKp.publicKey);
                let buyPercent = Number((Math.random() * (constants_1.BUY_UPPER_PERCENT - constants_1.BUY_LOWER_PERCENT) + constants_1.BUY_LOWER_PERCENT).toFixed(3));
                
                if (balance > 10000000) { // 0.01 SOL
                    let amount = Math.floor((balance - 10000000) * (buyPercent / 100));
                    process.stdout.write(`${colors.fg.green}Buy: ${(amount/1e9).toFixed(4)}L${colors.reset} | `);
                    let sig = yield buy(srcKp, baseMint, amount);
                    if (sig) {
                        totalVolume += amount / 1e9;
                        process.stdout.write(`${colors.fg.green}✅${colors.reset} `);
                    } else {
                        process.stdout.write(`${colors.fg.red}❌${colors.reset} `);
                    }
                }

                yield (0, utils_1.sleep)(2000);
                const sellSig = yield sell(baseMint, srcKp, constants_1.PARTIAL_SELL_PERCENT);
                if (sellSig) process.stdout.write(`${colors.fg.magenta}Sell: ✅${colors.reset} `);
                
                yield gatherBack(srcKp);
                process.stdout.write(`\n`);
            }

            process.stdout.write(`${colors.fg.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
            process.stdout.write(`${colors.fg.green}📊 Round Volume: ${colors.bright}${totalVolume.toFixed(4)} SOL${colors.reset}\n\n`);
            
            const waitTime = 30000;
            process.stdout.write(`${colors.fg.white}⏳ Waiting ${waitTime/1000}s for next round...${colors.reset}\n\n`);
            yield (0, utils_1.sleep)(waitTime);
        } catch (e) {
            process.stdout.write(`${colors.fg.red}❌ Error in main loop: ${e.message}${colors.reset}\n`);
            yield (0, utils_1.sleep)(5000);
        }
    }
});

const gatherBack = (srcKp) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const balance = yield exports.solanaConnection.getBalance(srcKp.publicKey);
        if (balance < 10000) return;
        const tx = new web3_js_1.Transaction().add(
            web3_js_1.SystemProgram.transfer({
                fromPubkey: srcKp.publicKey,
                toPubkey: exports.mainKp.publicKey,
                lamports: balance - 10000
            })
        );
        tx.recentBlockhash = (yield exports.solanaConnection.getLatestBlockhash()).blockhash;
        tx.feePayer = srcKp.publicKey;
        tx.sign(srcKp);
        yield exports.solanaConnection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
        if (!constants_1.REUSE_WALLETS) {
            let data = (0, utils_1.readJson)().filter(w => w.pubkey !== srcKp.publicKey.toBase58());
            (0, utils_1.saveNewFile)(data);
        }
    } catch (e) {}
});

const distributeSol = (connection, mainKp, num) => __awaiter(void 0, void 0, void 0, function* () {
    const wallets = [];
    const instructions = [];
    const existing = constants_1.REUSE_WALLETS ? (0, utils_1.readJson)() : [];
    const amount = Math.floor(constants_1.SOL_AMOUNT_TO_DISTRIBUTE * 1e9 / num);

    for (let i = 0; i < num; i++) {
        let kp = (constants_1.REUSE_WALLETS && existing[i]) ? 
            web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(existing[i].privateKey)) : web3_js_1.Keypair.generate();
        wallets.push({ kp });
        instructions.push(web3_js_1.SystemProgram.transfer({ fromPubkey: mainKp.publicKey, toPubkey: kp.publicKey, lamports: amount }));
    }

    const tx = new web3_js_1.Transaction().add(...instructions);
    tx.recentBlockhash = (yield connection.getLatestBlockhash()).blockhash;
    tx.feePayer = mainKp.publicKey;
    tx.sign(mainKp);
    const sig = yield connection.sendRawTransaction(tx.serialize());
    process.stdout.write(`${colors.fg.green}✅ Distributed: https://solscan.io/tx/${sig}${colors.reset}\n`);
    return wallets;
});

const buy = (kp, mint, amount) => __awaiter(void 0, void 0, void 0, function* () {
    const tx = yield (0, swapOnlyAmm_1.getBuyTxWithJupiter)(kp, mint, amount);
    if (!tx) return null;
    return yield exports.solanaConnection.sendRawTransaction(tx.serialize());
});

const sell = (mint, kp, percent) => __awaiter(void 0, void 0, void 0, function* () {
    const ata = (0, spl_token_1.getAssociatedTokenAddressSync)(mint, kp.publicKey);
    let bal;
    try { bal = (yield exports.solanaConnection.getTokenAccountBalance(ata)).value.amount; } catch(e) { return null; }
    const amount = (BigInt(bal) * BigInt(percent)) / 100n;
    const tx = yield (0, swapOnlyAmm_1.getSellTxWithJupiter)(kp, mint, amount.toString());
    if (!tx) return null;
    return yield exports.solanaConnection.sendRawTransaction(tx.serialize());
});

main();
