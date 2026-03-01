const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const { getAssociatedTokenAddressSync } = require("@solana/spl-token");
const bs58 = require("bs58");
const axios = require("axios");
const { getBuyTxWithJupiter, getSellTxWithJupiter } = require("./utils/swapOnlyAmm");
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
        white: "\x1b[37m"
    }
};

async function getPrice(tokenMint) {
    try {
        const response = await axios.get(`https://api.jup.ag/v6/quote`, {
            params: {
                inputMint: tokenMint,
                outputMint: "So11111111111111111111111111111111111111112",
                amount: "1000000", // 1 token (assuming 6 decimals)
                slippageBps: 50
            }
        });
        return parseFloat(response.data.outAmount) / LAMPORTS_PER_SOL;
    } catch (e) {
        return null;
    }
}

async function runMarketMaker() {
    console.log(`\n${colors.fg.magenta}${colors.bright}==================================================${colors.reset}`);
    console.log(`${colors.fg.magenta}${colors.bright}          SOLANA MARKET MAKER BOT v1.0            ${colors.reset}`);
    console.log(`${colors.fg.magenta}${colors.bright}==================================================${colors.reset}\n`);

    const rpcEndpoint = process.env.RPC_ENDPOINT;
    const mainPrivateKey = process.env.PRIVATE_KEY;
    const tokenMintStr = process.env.TOKEN_MINT;

    if (!rpcEndpoint || !mainPrivateKey || !tokenMintStr) {
        console.log("❌ Error: Missing configuration in .env");
        return;
    }

    const connection = new Connection(rpcEndpoint, "confirmed");
    const mainKp = Keypair.fromSecretKey(bs58.decode(mainPrivateKey));
    const tokenMint = new PublicKey(tokenMintStr);

    // Configuration from .env
    const BUY_DIP_THRESHOLD = parseFloat(process.env.MM_BUY_DIP_THRESHOLD) || 5;
    const SELL_PEAK_THRESHOLD = parseFloat(process.env.MM_SELL_PEAK_THRESHOLD) || 8;
    const MIN_SOL_BALANCE = parseFloat(process.env.MM_MIN_SOL_BALANCE) || 0.05;
    const TRADE_AMOUNT_SOL = parseFloat(process.env.MM_TRADE_AMOUNT_SOL) || 0.02;

    let lastPrice = await getPrice(tokenMintStr);
    if (!lastPrice) {
        console.log(`${colors.fg.red}⚠️  Could not fetch initial price. Make sure the token has liquidity.${colors.reset}`);
        // For development/initial launch, we might need a default or wait
    }

    console.log(`${colors.fg.white}📍 Wallet: ${colors.fg.yellow}${mainKp.publicKey.toBase58().slice(0, 8)}...${colors.reset}`);
    console.log(`${colors.fg.white}🪙 Token:  ${colors.fg.cyan}${tokenMintStr.slice(0, 8)}...${colors.reset}`);
    console.log(`${colors.fg.white}🛡️  Buy Dip: ${colors.fg.green}-${BUY_DIP_THRESHOLD}%${colors.reset} | ${colors.fg.white}📈 Sell Peak: ${colors.fg.magenta}+${SELL_PEAK_THRESHOLD}%${colors.reset}\n`);

    for (;;) {
        try {
            const currentPrice = await getPrice(tokenMintStr);
            const solBalance = await connection.getBalance(mainKp.publicKey);
            
            if (!currentPrice) {
                process.stdout.write(`${colors.fg.yellow}⏳ Waiting for price update...${colors.reset}\r`);
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }

            if (!lastPrice) {
                lastPrice = currentPrice;
                continue;
            }

            const priceChange = ((currentPrice - lastPrice) / lastPrice) * 100;
            const balanceInSol = solBalance / LAMPORTS_PER_SOL;

            process.stdout.write(`${colors.fg.white}Price: ${colors.fg.cyan}${currentPrice.toFixed(9)}${colors.reset} | Change: ${priceChange >= 0 ? colors.fg.green : colors.fg.red}${priceChange.toFixed(2)}%${colors.reset} | Bal: ${colors.fg.yellow}${balanceInSol.toFixed(3)}S${colors.reset}   \r`);

            // STRATEGY 1: BUY THE DIP
            if (priceChange <= -BUY_DIP_THRESHOLD && balanceInSol > MIN_SOL_BALANCE + TRADE_AMOUNT_SOL) {
                console.log(`\n${colors.fg.green}📉 Dip Detected! Buying ${TRADE_AMOUNT_SOL} SOL to support price...${colors.reset}`);
                const tx = await getBuyTxWithJupiter(mainKp, tokenMint, Math.floor(TRADE_AMOUNT_SOL * LAMPORTS_PER_SOL));
                if (tx) {
                    const sig = await connection.sendRawTransaction(tx.serialize());
                    console.log(`${colors.fg.green}✅ Support Buy Success! Tx: ${sig.slice(0, 8)}...${colors.reset}`);
                    lastPrice = currentPrice; // Reset baseline
                }
            }

            // STRATEGY 2: SELL THE PEAK (Partial Profit Taking)
            if (priceChange >= SELL_PEAK_THRESHOLD) {
                const ata = getAssociatedTokenAddressSync(tokenMint, mainKp.publicKey);
                let tokenBal;
                try {
                    tokenBal = (await connection.getTokenAccountBalance(ata)).value.amount;
                    if (BigInt(tokenBal) > 0n) {
                        const sellAmount = (BigInt(tokenBal) * 10n) / 100n; // Sell 10% of tokens
                        console.log(`\n${colors.fg.magenta}📈 Peak Detected! Selling 10% for profit taking...${colors.reset}`);
                        const tx = await getSellTxWithJupiter(mainKp, tokenMint, sellAmount.toString());
                        if (tx) {
                            const sig = await connection.sendRawTransaction(tx.serialize());
                            console.log(`${colors.fg.magenta}✅ Profit Sell Success! Tx: ${sig.slice(0, 8)}...${colors.reset}`);
                            lastPrice = currentPrice; // Reset baseline
                        }
                    }
                } catch (e) {
                    // No token account or zero balance
                }
            }

            // Update baseline slowly if no major changes (optional: trailing price)
            if (Math.abs(priceChange) < 1) {
                lastPrice = currentPrice * 0.99 + lastPrice * 0.01; // Smooth update
            }

            await new Promise(r => setTimeout(r, 10000)); // Check every 10 seconds
        } catch (e) {
            console.log(`\n${colors.fg.red}❌ Error in Market Maker: ${e.message}${colors.reset}`);
            await new Promise(r => setTimeout(r, 10000));
        }
    }
}

runMarketMaker();
