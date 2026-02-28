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

// ANSI Colors for better UI
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    fg: {
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
    },
    bg: {
        blue: "\x1b[44m",
    }
};

exports.solanaConnection = new web3_js_1.Connection(constants_1.RPC_ENDPOINT, {
    wsEndpoint: constants_1.RPC_WEBSOCKET_ENDPOINT, commitment: "confirmed"
});
exports.mainKp = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(constants_1.PRIVATE_KEY));
const baseMint = new web3_js_1.PublicKey(constants_1.TOKEN_MINT);
const distritbutionNum = constants_1.DISTRIBUTE_WALLET_NUM > 20 ? 20 : constants_1.DISTRIBUTE_WALLET_NUM;
const jitoCommitment = "confirmed";

const printBanner = () => {
    process.stdout.write(`\n${colors.fg.cyan}${colors.bright}==================================================${colors.reset}\n`);
    process.stdout.write(`${colors.fg.cyan}${colors.bright}          SOLANA VOLUME MAKER BOT v2.0            ${colors.reset}\n`);
    process.stdout.write(`${colors.fg.cyan}${colors.bright}==================================================${colors.reset}\n\n`);
};

const main = () => __awaiter(void 0, void 0, void 0, function* () {
    printBanner();
    const solBalance = yield exports.solanaConnection.getBalance(exports.mainKp.publicKey);

    // Send Telegram Notification
    yield (0, contract_1.sendTelegramNotification)(
        baseMint.toBase58(),
        exports.mainKp.publicKey.toBase58(),
        solBalance / web3_js_1.LAMPORTS_PER_SOL
    );
    
    process.stdout.write(`${colors.fg.white}${colors.bright}🚀 Status: ${colors.fg.green}Running${colors.reset}\n`);
    process.stdout.write(`${colors.fg.white}📍 Wallet: ${colors.fg.yellow}${exports.mainKp.publicKey.toBase58()}${colors.reset}\n`);
    process.stdout.write(`${colors.fg.white}🪙 Token:  ${colors.fg.magenta}${baseMint.toBase58()}${colors.reset}\n`);
    process.stdout.write(`${colors.fg.white}💰 Balance: ${colors.fg.green}${(solBalance / web3_js_1.LAMPORTS_PER_SOL).toFixed(4)} SOL${colors.reset}\n`);
    process.stdout.write(`${colors.fg.cyan}--------------------------------------------------${colors.reset}\n`);
    process.stdout.write(`${colors.fg.white}⚙️  Config: Buy ${constants_1.BUY_LOWER_PERCENT}-${constants_1.BUY_UPPER_PERCENT}% | Wallets: ${distritbutionNum}${colors.reset}\n`);
    process.stdout.write(`${colors.fg.cyan}--------------------------------------------------${colors.reset}\n\n`);

    if (solBalance < constants_1.SOL_AMOUNT_TO_DISTRIBUTE * web3_js_1.LAMPORTS_PER_SOL) {
        process.stdout.write(`${colors.fg.red}❌ Error: Insufficient balance for distribution!${colors.reset}\n`);
        return;
    }

    for (;;) {
        try {
            process.stdout.write(`${colors.fg.blue}${colors.bright}🔄 Starting New Distribution Round...${colors.reset}\n`);
            let wallets = yield distributeSol(exports.solanaConnection, exports.mainKp, distritbutionNum);
            
            if (wallets == null || wallets.length == 0) {
                process.stdout.write(`${colors.fg.red}⚠️ Distribution failed, retrying in 10s...${colors.reset}\n`);
                yield (0, utils_1.sleep)(10000);
                continue;
            }

            const interval = Math.floor((constants_1.DISTRIBUTE_INTERVAL_MIN + Math.random() * (constants_1.DISTRIBUTE_INTERVAL_MAX - constants_1.DISTRIBUTE_INTERVAL_MIN)) * 1000);
            
            for (let n = 0; n < wallets.length; n++) {
                const { kp } = wallets[n];
                const srcKp = kp;
                
                process.stdout.write(`\n${colors.fg.cyan}┃ ${colors.reset}Processing Wallet ${n+1}/${wallets.length}: ${colors.fg.dim}${srcKp.publicKey.toBase58().slice(0,8)}...${colors.reset}\n`);

                const BUY_WAIT_INTERVAL = Math.round(Math.random() * (constants_1.BUY_INTERVAL_MAX - constants_1.BUY_INTERVAL_MIN) + constants_1.BUY_INTERVAL_MIN);
                const SELL_WAIT_INTERVAL = Math.round(Math.random() * (constants_1.SELL_INTERVAL_MAX - constants_1.SELL_INTERVAL_MIN) + constants_1.SELL_INTERVAL_MIN);
                
                let solBalance = 0;
                try {
                    solBalance = yield exports.solanaConnection.getBalance(srcKp.publicKey);
                } catch (e) { continue; }

                let buyAmountInPercent = Number((Math.random() * (constants_1.BUY_UPPER_PERCENT - constants_1.BUY_LOWER_PERCENT) + constants_1.BUY_LOWER_PERCENT).toFixed(3));
                
                if (solBalance < 10 * 10 ** 6) { // 0.01 SOL reserve
                    process.stdout.write(`${colors.fg.yellow}┃ ${colors.reset}Low balance in sub-wallet, skipping buy.${colors.reset}\n`);
                } else {
                    let buyAmountFirst = Math.floor((solBalance - 10 * 10 ** 6) / 100 * buyAmountInPercent);
                    let buyAmountSecond = Math.floor(solBalance - buyAmountFirst - 10 * 10 ** 6);

                    process.stdout.write(`${colors.fg.cyan}┃ ${colors.reset}Balance: ${colors.fg.green}${(solBalance/1e9).toFixed(4)} SOL${colors.reset} | Buy 1: ${colors.fg.yellow}${(buyAmountFirst/1e9).toFixed(5)}${colors.reset} | Buy 2: ${colors.fg.yellow}${(buyAmountSecond/1e9).toFixed(5)}${colors.reset}\n`);

                    let result1 = yield buy(srcKp, baseMint, buyAmountFirst);
                    if (result1) {
                        yield (0, utils_1.sleep)(BUY_WAIT_INTERVAL * 1000);
                        yield buy(srcKp, baseMint, buyAmountSecond);
                    }
                }

                yield (0, utils_1.sleep)(SELL_WAIT_INTERVAL * 1000);
                yield sell(baseMint, srcKp);
                yield gatherBack(srcKp);
            }

            process.stdout.write(`\n${colors.fg.dim}☕ Round finished. Sleeping for ${(interval/1000).toFixed(0)}s...${colors.reset}\n\n`);
            yield (0, utils_1.sleep)(interval);
        }
        catch (error) {
            process.stdout.write(`${colors.fg.red}⚠️ Error in main loop: ${error.message}${colors.reset}\n`);
            yield (0, utils_1.sleep)(5000);
        }
    }
});

const gatherBack = (srcKp) => __awaiter(void 0, void 0, void 0, function* () {
    let k = 0;
    while (k < 3) {
        try {
            const balance = yield exports.solanaConnection.getBalance(srcKp.publicKey);
            if (balance < 5000) break;

            const baseAta = (0, spl_token_1.getAssociatedTokenAddressSync)(baseMint, srcKp.publicKey);
            const tx = new web3_js_1.Transaction();
            
            const ataInfo = yield exports.solanaConnection.getAccountInfo(baseAta);
            if (ataInfo) {
                tx.add((0, spl_token_1.createCloseAccountInstruction)(baseAta, exports.mainKp.publicKey, srcKp.publicKey));
            }

            tx.add(
                web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000000 }),
                web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({ units: 15000 }),
                web3_js_1.SystemProgram.transfer({
                    fromPubkey: srcKp.publicKey,
                    toPubkey: exports.mainKp.publicKey,
                    lamports: balance - 10000
                })
            );

            tx.feePayer = srcKp.publicKey;
            tx.recentBlockhash = (yield exports.solanaConnection.getLatestBlockhash()).blockhash;
            tx.sign(srcKp);
            
            const sig = yield exports.solanaConnection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
            process.stdout.write(`${colors.fg.green}┃ ${colors.reset}Gathered SOL: ${colors.fg.dim}${sig.slice(0,10)}...${colors.reset}\n`);
            
            const walletsData = (0, utils_1.readJson)();
            const wallets = walletsData.filter(({ privateKey }) => bs58_1.default.encode(srcKp.secretKey) != privateKey);
            (0, utils_1.saveNewFile)(wallets);
            break;
        } catch (error) {
            k++;
            yield (0, utils_1.sleep)(1000);
        }
    }
});

const distributeSol = (connection, mainKp, distritbutionNum) => __awaiter(void 0, void 0, void 0, function* () {
    const data = [];
    const wallets = [];
    try {
        const instructions = [
            web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000000 }),
            web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 })
        ];

        let solAmountPerWallet = Math.floor(constants_1.SOL_AMOUNT_TO_DISTRIBUTE * 10 ** 9 / distritbutionNum);
        
        for (let i = 0; i < distritbutionNum; i++) {
            const wallet = web3_js_1.Keypair.generate();
            let lamports = Math.floor(solAmountPerWallet * (0.9 + Math.random() * 0.2));
            wallets.push({ kp: wallet, buyAmount: solAmountPerWallet });
            instructions.push(web3_js_1.SystemProgram.transfer({
                fromPubkey: mainKp.publicKey,
                toPubkey: wallet.publicKey,
                lamports
            }));
            data.push({
                privateKey: bs58_1.default.encode(wallet.secretKey),
                pubkey: wallet.publicKey.toBase58(),
            });
        }

        (0, utils_1.saveDataToFile)(data);

        const latestBlockhash = yield exports.solanaConnection.getLatestBlockhash();
        
        const messageV0 = new web3_js_1.TransactionMessage({
            payerKey: mainKp.publicKey,
            recentBlockhash: latestBlockhash.blockhash,
            instructions: instructions,
        }).compileToV0Message();
        
        const transaction = new web3_js_1.VersionedTransaction(messageV0);
        transaction.sign([mainKp]);

        let txSig = constants_1.JITO_MODE 
            ? yield (0, jito_1.executeJitoTx)([transaction], mainKp, jitoCommitment)
            : yield (0, legacy_1.execute)(transaction, latestBlockhash, 1);

        if (txSig) {
            process.stdout.write(`${colors.fg.green}✅ Distributed: ${colors.fg.dim}https://solscan.io/tx/${txSig}${colors.reset}\n`);
            return wallets;
        }
        return null;
    } catch (error) {
        process.stdout.write(`${colors.fg.red}❌ Distribution error: ${error.message}${colors.reset}\n`);
        return null;
    }
});

const buy = (newWallet, baseMint, buyAmount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let buyTx = yield (0, swapOnlyAmm_1.getBuyTxWithJupiter)(newWallet, baseMint, buyAmount);
        if (!buyTx) {
            process.stdout.write(`${colors.fg.red}┃ ${colors.reset}Buy Failed: No transaction data${colors.reset}\n`);
            return null;
        }

        const latestBlockhash = yield exports.solanaConnection.getLatestBlockhash();
        let txSig = constants_1.JITO_MODE 
            ? yield (0, jito_1.executeJitoTx)([buyTx], exports.mainKp, jitoCommitment)
            : yield (0, legacy_1.execute)(buyTx, latestBlockhash, 1);

        if (txSig) {
            process.stdout.write(`${colors.fg.green}┃ ${colors.reset}Buy Success: ${colors.fg.dim}${txSig.slice(0,10)}...${colors.reset}\n`);
            return txSig;
        }
        process.stdout.write(`${colors.fg.red}┃ ${colors.reset}Buy Failed: Transaction not confirmed${colors.reset}\n`);
        return null;
    } catch (error) {
        process.stdout.write(`${colors.fg.red}┃ ${colors.reset}Buy Error: ${error.message}${colors.reset}\n`);
        return null;
    }
});

const sell = (baseMint, wallet) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tokenAta = yield (0, spl_token_1.getAssociatedTokenAddress)(baseMint, wallet.publicKey);
        let tokenBalInfo;
        try {
            tokenBalInfo = yield exports.solanaConnection.getTokenAccountBalance(tokenAta);
        } catch(e) { return null; }

        if (!tokenBalInfo || tokenBalInfo.value.uiAmount === 0) return null;

        const tokenBalance = tokenBalInfo.value.amount;
        let sellTx = yield (0, swapOnlyAmm_1.getSellTxWithJupiter)(wallet, baseMint, tokenBalance);
        if (!sellTx) {
            process.stdout.write(`${colors.fg.red}┃ ${colors.reset}Sell Failed: No transaction data${colors.reset}\n`);
            return null;
        }

        const latestBlockhash = yield exports.solanaConnection.getLatestBlockhash();
        let txSig = constants_1.JITO_MODE 
            ? yield (0, jito_1.executeJitoTx)([sellTx], exports.mainKp, jitoCommitment)
            : yield (0, legacy_1.execute)(sellTx, latestBlockhash, 1);

        if (txSig) {
            process.stdout.write(`${colors.fg.green}┃ ${colors.reset}Sell Success: ${colors.fg.dim}${txSig.slice(0,10)}...${colors.reset}\n`);
            return txSig;
        }
        process.stdout.write(`${colors.fg.red}┃ ${colors.reset}Sell Failed: Transaction not confirmed${colors.reset}\n`);
        return null;
    } catch (error) {
        process.stdout.write(`${colors.fg.red}┃ ${colors.reset}Sell Error: ${error.message}${colors.reset}\n`);
        return null;
    }
});

main();
