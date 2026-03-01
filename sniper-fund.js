const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require("fs");
const bs58 = require("bs58");
require("dotenv").config();

async function fundSniperWallets() {
    const rpcEndpoint = process.env.RPC_ENDPOINT;
    const mainPrivateKey = process.env.PRIVATE_KEY;
    const solAmount = parseFloat(process.env.SNIPER_SOL_AMOUNT) || 0.1;

    if (!rpcEndpoint || !mainPrivateKey) {
        console.log("❌ Error: RPC_ENDPOINT or PRIVATE_KEY not found in .env");
        return;
    }

    const connection = new Connection(rpcEndpoint, "confirmed");
    const mainKp = Keypair.fromSecretKey(bs58.decode(mainPrivateKey));

    console.log(`\n📍 Main Wallet: ${mainKp.publicKey.toBase58()}`);
    const mainBalance = await connection.getBalance(mainKp.publicKey);
    console.log(`💰 Main Balance: ${(mainBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    if (!fs.existsSync("sniper_wallets.json")) {
        console.log("❌ Error: sniper_wallets.json not found. Run sniper-gen.js first.");
        return;
    }

    const wallets = JSON.parse(fs.readFileSync("sniper_wallets.json", "utf-8"));
    console.log(`🔄 Funding ${wallets.length} wallets with ${solAmount} SOL each...`);

    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        const destPubkey = new PublicKey(wallet.pubkey);
        
        try {
            const tx = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: mainKp.publicKey,
                    toPubkey: destPubkey,
                    lamports: Math.floor(solAmount * LAMPORTS_PER_SOL)
                })
            );

            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            tx.feePayer = mainKp.publicKey;
            tx.sign(mainKp);

            const sig = await connection.sendRawTransaction(tx.serialize());
            console.log(`✅ [${i+1}/${wallets.length}] Funded ${wallet.pubkey.slice(0,8)}... | Tx: ${sig.slice(0,8)}...`);
        } catch (e) {
            console.log(`❌ [${i+1}/${wallets.length}] Failed to fund ${wallet.pubkey.slice(0,8)}...: ${e.message}`);
        }
    }

    console.log("\n✨ Funding process complete!\n");
}

fundSniperWallets();
