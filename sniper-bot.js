const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");
const bs58 = require("bs58");
const { getBuyTxWithJupiter } = require("./utils/swapOnlyAmm");
const { getFullTokenInfo } = require("./utils/tokenInfo");
require("dotenv").config();

// ANSI Colors for Professional Logs
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    fg: {
        green: "\x1b[32m",
        red: "\x1b[31m",
        yellow: "\x1b[33m",
        cyan: "\x1b[36m",
        magenta: "\x1b[35m",
        white: "\x1b[37m",
        blue: "\x1b[34m"
    },
    bg: {
        red: "\x1b[41m",
        green: "\x1b[42m"
    }
};

const cleanBase58 = (str) => {
    if (!str) return "";
    return str.replace(/[^123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]/g, "");
};

async function runSniperBot() {
    console.clear();
    console.log(`\n${colors.fg.cyan}${colors.bright}==================================================${colors.reset}`);
    console.log(`${colors.fg.cyan}${colors.bright}          SOLANA SNIPER ATTACK v2.0               ${colors.reset}`);
    console.log(`${colors.fg.cyan}${colors.bright}==================================================${colors.reset}\n`);

    const rpcEndpoint = process.env.RPC_ENDPOINT;
    const tokenMintStr = process.env.TOKEN_MINT;
    
    if (!rpcEndpoint || !tokenMintStr) {
        console.log(`${colors.fg.red}❌ Error: RPC_ENDPOINT or TOKEN_MINT not found in .env${colors.reset}`);
        return;
    }

    const connection = new Connection(rpcEndpoint.trim(), { commitment: "confirmed", confirmTransactionInitialTimeout: 60000 });
    const tokenMint = new PublicKey(cleanBase58(tokenMintStr));

    if (!fs.existsSync("sniper_wallets.json")) {
        console.log(`${colors.fg.red}❌ Error: sniper_wallets.json not found.${colors.reset}`);
        console.log(`${colors.fg.white}Run ${colors.fg.yellow}node sniper-gen.js${colors.fg.white} and ${colors.fg.yellow}node sniper-fund.js${colors.fg.white} first.${colors.reset}`);
        return;
    }

    const walletsData = JSON.parse(fs.readFileSync("sniper_wallets.json", "utf-8"));
    const wallets = walletsData.map(w => Keypair.fromSecretKey(bs58.decode(cleanBase58(w.privateKey))));
    const tokenInfo = await getFullTokenInfo(tokenMint.toBase58());

    console.log(`${colors.fg.white}🚀 Status: ${colors.fg.green}Monitoring...${colors.reset}`);
    if (tokenInfo.name !== "Unknown") {
        console.log(`${colors.fg.white}🪙 Token:  ${colors.fg.cyan}${tokenInfo.name} (${tokenInfo.symbol})${colors.reset}`);
        console.log(`${colors.fg.white}💵 Price:  ${colors.fg.yellow}${tokenInfo.price.toFixed(9)} SOL${colors.reset}`);
    } else {
        console.log(`${colors.fg.white}🪙 Token:  ${colors.fg.magenta}${tokenMint.toBase58()}${colors.reset}`);
    }
    console.log(`${colors.fg.white}👥 Attackers: ${colors.fg.yellow}${wallets.length} Wallets${colors.reset}`);
    console.log(`${colors.fg.cyan}--------------------------------------------------${colors.reset}\n`);

    console.log(`${colors.fg.white}⏳ Waiting for liquidity and trade trigger on Jupiter...${colors.reset}\n`);

    let tradeSuccessCount = 0;
    let attempt = 1;

    let attackLaunched = false;
    while (tradeSuccessCount < wallets.length) {
        try {
            const currentTokenInfo = await getFullTokenInfo(tokenMint.toBase58());
            const timestamp = new Date().toLocaleTimeString();
            
            if (currentTokenInfo.price > 0 && !attackLaunched) {
                attackLaunched = true;
                console.log(`${colors.fg.green}[${timestamp}] 🎯 TARGET DETECTED! Price: ${currentTokenInfo.price.toFixed(9)} SOL. Launching Attack...${colors.reset}`);
                
                // Execute all wallets in parallel for maximum speed
                const attackPromises = wallets.map(async (wallet, i) => {
                    const balance = await connection.getBalance(wallet.publicKey);
                    if (balance < 0.005 * LAMPORTS_PER_SOL) return null;

                    const amount = Math.floor(balance - 0.005 * LAMPORTS_PER_SOL);
                    const walletShort = wallet.publicKey.toBase58().slice(0, 8);

                    process.stdout.write(`${colors.fg.white}┃ W${i+1} (${walletShort}): Sending ${(amount/LAMPORTS_PER_SOL).toFixed(4)} SOL... `);
                    
                    try {
                        const tx = await getBuyTxWithJupiter(wallet, tokenMint, amount);
                        if (tx) {
                            const sig = await connection.sendRawTransaction(tx.serialize());
                            console.log(`${colors.fg.green}✅ SUCCESS!${colors.reset}`);
                            console.log(`${colors.fg.white}┃   Tx: https://solscan.io/tx/${sig}${colors.reset}`);
                            return true;
                        } else {
                            console.log(`${colors.fg.red}❌ (No Route)${colors.reset}`);
                            return false;
                        }
                    } catch (err) {
                        console.log(`${colors.fg.red}❌ (Failed)${colors.reset}`);
                        return false;
                    }
                });

                const results = await Promise.all(attackPromises);
                tradeSuccessCount = results.filter(r => r === true).length;
                
                if (tradeSuccessCount > 0) {
                    console.log(`\n${colors.bg.green}${colors.fg.white}${colors.bright}  ✨ SNIPER MISSION COMPLETED: ${tradeSuccessCount}/${wallets.length} WALLETS SUCCESSFUL ✨  ${colors.reset}\n`);
                    break;
                }
            } else {
                process.stdout.write(`\r${colors.fg.white}[${timestamp}] Attempt #${attempt} | ${colors.fg.yellow}Waiting for liquidity...${colors.reset}`);
                attempt++;
                await new Promise(r => setTimeout(r, 2000));
            }

        } catch (e) {
            process.stdout.write(`\r${colors.fg.red}🔄 Connection retry... ${e.message.slice(0, 30)}${colors.reset}`);
            await new Promise(r => setTimeout(r, 3000));
        }
    }
}

runSniperBot();
