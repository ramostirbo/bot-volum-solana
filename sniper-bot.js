const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");
const bs58 = require("bs58");
const { getBuyTxWithJupiter } = require("./utils/swapOnlyAmm");
require("dotenv").config();

async function runSniperBot() {
    const rpcEndpoint = process.env.RPC_ENDPOINT;
    const tokenMintStr = process.env.TOKEN_MINT;
    
    if (!rpcEndpoint || !tokenMintStr) {
        console.log("❌ Error: RPC_ENDPOINT or TOKEN_MINT not found in .env");
        return;
    }

    const connection = new Connection(rpcEndpoint, "confirmed");
    const tokenMint = new PublicKey(tokenMintStr);

    if (!fs.existsSync("sniper_wallets.json")) {
        console.log("❌ Error: sniper_wallets.json not found. Run sniper-gen.js and sniper-fund.js first.");
        return;
    }

    const walletsData = JSON.parse(fs.readFileSync("sniper_wallets.json", "utf-8"));
    const wallets = walletsData.map(w => Keypair.fromSecretKey(bs58.decode(w.privateKey)));

    console.log(`\n🎯 Sniper Bot Active!`);
    console.log(`🪙 Monitoring Token: ${tokenMint.toBase58()}`);
    console.log(`👥 Using ${wallets.length} wallets for sniper attack.\n`);

    console.log("⏳ Waiting for token to be tradeable on Jupiter...");

    let tradeSuccess = false;
    while (!tradeSuccess) {
        try {
            for (let i = 0; i < wallets.length; i++) {
                const wallet = wallets[i];
                const balance = await connection.getBalance(wallet.publicKey);
                
                if (balance < 0.005 * LAMPORTS_PER_SOL) {
                    console.log(`⚠️  Wallet ${i+1} (${wallet.publicKey.toBase58().slice(0,8)}...) has low balance. Skipping.`);
                    continue;
                }

                const amount = Math.floor(balance - 0.005 * LAMPORTS_PER_SOL); // Leave 0.005 for fees
                
                console.log(`🚀 [Wallet ${i+1}] Attempting to buy with ${(amount/LAMPORTS_PER_SOL).toFixed(4)} SOL...`);
                
                const tx = await getBuyTxWithJupiter(wallet, tokenMint, amount);
                if (tx) {
                    const sig = await connection.sendRawTransaction(tx.serialize());
                    console.log(`✅ [Wallet ${i+1}] Buy Success! Tx: https://solscan.io/tx/${sig}`);
                    tradeSuccess = true;
                } else {
                    // Quote failed, likely no liquidity yet
                }
            }

            if (!tradeSuccess) {
                // Wait before retrying if no buy was successful
                await new Promise(r => setTimeout(r, 5000));
            } else {
                console.log("\n✨ Sniper Bot Task Completed for all available wallets!");
            }

        } catch (e) {
            console.log(`🔄 Retrying... ${e.message}`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

runSniperBot();
