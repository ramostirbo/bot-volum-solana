const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const bs58 = require("bs58");
require("dotenv").config();

// ANSI Escape Codes for Professional Styling
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
    }
};

async function checkWallet() {
    const rpcEndpoint = process.env.RPC_ENDPOINT;
    const privateKey = process.env.PRIVATE_KEY;

    console.log(`\n${colors.fg.cyan}${colors.bright}==================================================${colors.reset}`);
    console.log(`${colors.fg.cyan}${colors.bright}          SOLANA WALLET INSPECTOR v1.0            ${colors.reset}`);
    console.log(`${colors.fg.cyan}${colors.bright}==================================================${colors.reset}\n`);

    if (!rpcEndpoint) {
        console.log(`${colors.fg.red}❌ ERROR: RPC_ENDPOINT is not set in .env${colors.reset}`);
        return;
    }

    if (!privateKey) {
        console.log(`${colors.fg.red}❌ ERROR: PRIVATE_KEY is not set in .env${colors.reset}`);
        return;
    }

    try {
        const connection = new Connection(rpcEndpoint, {
            commitment: "confirmed",
            confirmTransactionInitialTimeout: 60000
        });
        
        const wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
        const publicKey = wallet.publicKey;
        
        console.log(`${colors.fg.green}🔄 Fetching real-time data from Network...${colors.reset}`);
        console.log(`${colors.fg.dim}RPC: ${rpcEndpoint.split('?')[0]}${colors.reset}\n`);
        
        // Fetch SOL balance with retry logic or error handling
        const balance = await connection.getBalance(publicKey).catch(err => {
            throw new Error(`Failed to connect to RPC. Please check your internet connection or RPC URL. Details: ${err.message}`);
        });

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
            programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        });

        // Display Wallet Address
        console.log(`${colors.fg.white}${colors.bright}📍 Wallet Address:${colors.reset}`);
        console.log(`${colors.fg.yellow}${publicKey.toBase58()}${colors.reset}\n`);

        // Display SOL Balance
        const solBalance = balance / 1e9;
        const balanceColor = solBalance > 0.05 ? colors.fg.green : colors.fg.red;
        console.log(`${colors.fg.white}${colors.bright}💰 SOL Balance:${colors.reset}`);
        console.log(`${balanceColor}${solBalance.toFixed(4)} SOL${colors.reset}\n`);

        // Display Token Balances
        console.log(`${colors.fg.white}${colors.bright}🪙 Token Assets:${colors.reset}`);
        console.log(`${colors.fg.cyan}--------------------------------------------------${colors.reset}`);
        
        if (tokenAccounts.value.length === 0) {
            console.log(`${colors.fg.dim}   No tokens found in this wallet.${colors.reset}`);
        } else {
            let foundTokens = false;
            tokenAccounts.value.forEach(account => {
                const info = account.account.data.parsed.info;
                const mint = info.mint;
                const amount = info.tokenAmount.uiAmount;
                if (amount > 0) {
                    foundTokens = true;
                    console.log(`${colors.fg.magenta}Mint:${colors.reset} ${mint}`);
                    console.log(`${colors.fg.green}Balance:${colors.reset} ${colors.bright}${amount.toLocaleString()}${colors.reset}`);
                    console.log(`${colors.fg.cyan}--------------------------------------------------${colors.reset}`);
                }
            });
            if (!foundTokens) {
                console.log(`${colors.fg.dim}   All token accounts are empty.${colors.reset}`);
            }
        }

        console.log(`\n${colors.fg.cyan}${colors.bright}==================================================${colors.reset}`);
        console.log(`${colors.fg.cyan}          End of Wallet Report                    ${colors.reset}`);
        console.log(`${colors.fg.cyan}${colors.bright}==================================================${colors.reset}\n`);

    } catch (error) {
        console.log(`${colors.fg.red}${colors.bright}❌ CRITICAL ERROR:${colors.reset}`);
        console.log(`${colors.fg.white}${error.message}${colors.reset}`);
        console.log(`\n${colors.fg.yellow}💡 Tips:${colors.reset}`);
        console.log(`1. Ensure you are connected to the internet.`);
        console.log(`2. Verify that your RPC URL in .env is correct and active.`);
        console.log(`3. Some RPCs require a VPN or have regional restrictions.`);
    }
}

checkWallet();
