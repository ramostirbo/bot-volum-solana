const axios = require("axios");
require("dotenv").config();

// ANSI Colors
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    fg: {
        green: "\x1b[32m",
        cyan: "\x1b[36m",
        yellow: "\x1b[33m",
        white: "\x1b[37m"
    }
};

async function checkPrice(tokenMint) {
    const startTime = Date.now();
    try {
        // Use DexScreener API (Totally public, no 401 ever)
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`, {
            timeout: 10000
        });
        
        const duration = Date.now() - startTime;
        const pair = response.data.pairs ? response.data.pairs[0] : null;
        
        if (pair && pair.priceNative) {
            return { 
                price: parseFloat(pair.priceNative), 
                duration,
                name: pair.baseToken ? pair.baseToken.name : "Unknown",
                symbol: pair.baseToken ? pair.baseToken.symbol : "???"
            };
        } else {
            return { error: "No liquidity pair found on DexScreener", duration };
        }
    } catch (e) {
        const duration = Date.now() - startTime;
        return { error: e.message, duration };
    }
}

async function startPriceChecker() {
    const tokenMint = process.env.TOKEN_MINT;
    if (!tokenMint) {
        console.log("❌ TOKEN_MINT not found in .env");
        return;
    }

    console.log(`\n${colors.fg.cyan}${colors.bright}🔍 Solana Price & Latency Checker (DexScreener API)${colors.reset}`);
    console.log(`${colors.fg.white}🪙 Token: ${tokenMint}${colors.reset}\n`);

    for (let i = 1; ; i++) {
        const { price, duration, error, name, symbol } = await checkPrice(tokenMint);
        const timestamp = new Date().toLocaleTimeString();

        if (error) {
            console.log(`[${timestamp}] #${i} | ${colors.fg.yellow}Latency: ${duration}ms${colors.reset} | ❌ Error: ${error}`);
        } else {
            const tokenInfo = name ? `${colors.fg.cyan}${name} (${symbol})${colors.reset} | ` : "";
            console.log(`[${timestamp}] #${i} | ${colors.fg.yellow}Latency: ${duration}ms${colors.reset} | ${tokenInfo}${colors.fg.green}Price: ${price.toFixed(9)} SOL${colors.reset}`);
        }

        await new Promise(r => setTimeout(r, 2000)); // Check every 2 seconds
    }
}

startPriceChecker();
