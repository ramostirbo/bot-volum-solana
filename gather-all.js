const { Connection, PublicKey, Keypair, Transaction, SystemProgram, ComputeBudgetProgram } = require("@solana/web3.js");
const { getAssociatedTokenAddressSync, createCloseAccountInstruction } = require("@solana/spl-token");
const bs58 = require("bs58");
const fs = require("fs");
require("dotenv").config();

// ANSI Colors for better UI
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    fg: {
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
    }
};

async function gatherAll() {
    console.log(`\n${colors.fg.cyan}${colors.bright}==================================================${colors.reset}`);
    console.log(`${colors.fg.cyan}${colors.bright}          SOLANA FUNDS RECOVERY TOOL v1.0         ${colors.reset}`);
    console.log(`${colors.fg.cyan}${colors.bright}==================================================${colors.reset}\n`);

    const rpcEndpoint = process.env.RPC_ENDPOINT;
    const mainPrivateKey = process.env.PRIVATE_KEY;
    const tokenMintStr = process.env.TOKEN_MINT;

    if (!rpcEndpoint || !mainPrivateKey) {
        console.log(`${colors.fg.red}❌ Error: RPC_ENDPOINT or PRIVATE_KEY not found in .env${colors.reset}`);
        return;
    }

    const connection = new Connection(rpcEndpoint, "confirmed");
    const mainKp = Keypair.fromSecretKey(bs58.decode(mainPrivateKey));
    const tokenMint = tokenMintStr ? new PublicKey(tokenMintStr) : null;

    console.log(`${colors.fg.white}📍 Main Wallet: ${colors.fg.yellow}${mainKp.publicKey.toBase58()}${colors.reset}`);
    console.log(`${colors.fg.cyan}--------------------------------------------------${colors.reset}`);

    // Read sub-wallets from data.json
    let wallets = [];
    if (fs.existsSync("data.json")) {
        try {
            wallets = JSON.parse(fs.readFileSync("data.json", "utf-8"));
        } catch (e) {
            console.log(`${colors.fg.red}❌ Error reading data.json${colors.reset}`);
        }
    }

    if (wallets.length === 0) {
        console.log(`${colors.fg.yellow}⚠️ No sub-wallets found in data.json${colors.reset}`);
        return;
    }

    console.log(`${colors.fg.white}🔄 Found ${colors.bright}${wallets.length}${colors.reset} wallets to process...\n`);

    for (let i = 0; i < wallets.length; i++) {
        const walletInfo = wallets[i];
        try {
            const subKp = Keypair.fromSecretKey(bs58.decode(walletInfo.privateKey));
            const balance = await connection.getBalance(subKp.publicKey);

            process.stdout.write(`${colors.fg.white}[${i+1}/${wallets.length}] Wallet: ${colors.fg.dim}${subKp.publicKey.toBase58().slice(0,8)}...${colors.reset} | Balance: ${colors.fg.green}${(balance/1e9).toFixed(5)} SOL${colors.reset}`);

            if (balance < 5000) {
                process.stdout.write(` -> ${colors.fg.yellow}Skipping (too low)${colors.reset}\n`);
                continue;
            }

            const tx = new Transaction();
            tx.add(
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000000 }),
                ComputeBudgetProgram.setComputeUnitLimit({ units: 20000 })
            );

            // Close ATA if exists to recover rent
            if (tokenMint) {
                const ata = getAssociatedTokenAddressSync(tokenMint, subKp.publicKey);
                const ataInfo = await connection.getAccountInfo(ata);
                if (ataInfo) {
                    tx.add(createCloseAccountInstruction(ata, mainKp.publicKey, subKp.publicKey));
                }
            }

            // Transfer all remaining SOL back to main wallet
            tx.add(
                SystemProgram.transfer({
                    fromPubkey: subKp.publicKey,
                    toPubkey: mainKp.publicKey,
                    lamports: balance - 10000 // Small fee margin
                })
            );

            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            tx.feePayer = subKp.publicKey;
            tx.sign(subKp);

            const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true });
            process.stdout.write(` -> ${colors.fg.green}✅ Success! ${colors.fg.dim}(${sig.slice(0,8)}...)${colors.reset}\n`);

        } catch (error) {
            process.stdout.write(` -> ${colors.fg.red}❌ Error: ${error.message.slice(0,30)}...${colors.reset}\n`);
        }
    }

    // Clean up data.json after recovery
    try {
        fs.writeFileSync("data.json", JSON.stringify([], null, 2));
        console.log(`\n${colors.fg.green}✨ Recovery complete! data.json has been cleared.${colors.reset}`);
    } catch (e) {
        console.log(`\n${colors.fg.red}❌ Failed to clear data.json${colors.reset}`);
    }

    console.log(`\n${colors.fg.cyan}${colors.bright}==================================================${colors.reset}\n`);
}

gatherAll();
