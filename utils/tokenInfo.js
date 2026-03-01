const axios = require("axios");

/**
 * Professional Price & Token Info Fetcher using DexScreener API
 * @param {string} tokenMint 
 * @returns {Promise<{price: number, name: string, symbol: string, error: string|null}>}
 */
async function getFullTokenInfo(tokenMint) {
    try {
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`, {
            timeout: 10000
        });
        const pair = response.data.pairs ? response.data.pairs[0] : null;
        
        if (pair && pair.priceNative) {
            return { 
                price: parseFloat(pair.priceNative), 
                name: pair.baseToken ? pair.baseToken.name : "Unknown",
                symbol: pair.baseToken ? pair.baseToken.symbol : "???",
                error: null
            };
        } else {
            return { price: 0, name: "Unknown", symbol: "???", error: "No pair found" };
        }
    } catch (e) {
        return { price: 0, name: "Unknown", symbol: "???", error: e.message };
    }
}

module.exports = { getFullTokenInfo };
