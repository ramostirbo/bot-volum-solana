## PumpFun AMM Bundler & Volume Maker

Automates bundled token trading on Solana for PumpFun/Raydium using Jito for first-block execution. Designed to create liquidity, distribute SOL across multiple wallets, simulate organic volume via randomized buy/sell cycles, and gather funds back reliably.

[![Node](https://img.shields.io/badge/Node-16%2B-5FA04E?logo=node.js&logoColor=white)](#)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-14F195?logo=solana&logoColor=white)](#)
[![Telegram](https://img.shields.io/badge/Telegram-@lorine93s-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/lorine93s)

### Key Features
- **Jito bundling**: First-block inclusion (when enabled) for fast, reliable execution
- **Volume simulation**: Randomized buy/sell intervals and amounts to mimic organic flow
- **Multi-wallet orchestration**: Distributes SOL to N sub-wallets and gathers profits back
- **Raydium/PumpFun support**: Uses Raydium SDK and Jupiter routes to swap
- **Config via .env**: Tune timing, slippage, fees, wallet counts, and token mint
- **Resilience**: Retries on failures and cleans up sub-wallet balances

### How It Works
1) Distribute SOL from the main wallet to `DISTRIBUTE_WALLET_NUM` temporary wallets
2) Each wallet executes buy twice (split amounts), waits randomized intervals, then sells
3) Close token accounts and transfer remaining SOL back to the main wallet
4) Repeat after a randomized round interval

### Project Structure
```
pumpfun-amm-bundler-volume-maker/
  ├─ index.js                # main loop: distribute, buy/sell, gather
  ├─ gather.js               # utility to gather SOL from wallets
  ├─ constants/              # environment-driven runtime config
  ├─ utils/                  # Jupiter swap builders, file utils, helpers
  ├─ executor/               # legacy/jito transaction executors
  ├─ package.json            # scripts: start, gather
  └─ README.md
```

## Getting Started

### Prerequisites
- Node.js 16+
- A funded Solana keypair (base58 private key)
- RPC endpoint and (optional) Jito bundle relayer access

### Install
```bash
npm install
# or
yarn install
```

### Configuration (.env)
Create a `.env` in the project root:
```ini
# Wallet and network
PRIVATE_KEY=base58_private_key_here
RPC_ENDPOINT=https://your-rpc
RPC_WEBSOCKET_ENDPOINT=wss://your-rpc-ws

# Token and trading params
TOKEN_MINT=So11111111111111111111111111111111111111112
SLIPPAGE=1                 # %
JITO_MODE=false            # true to enable Jito
JITO_FEE=0                 # lamports or relayer-specific

# Distribution and volume shaping
DISTRIBUTE_WALLET_NUM=10
SOL_AMOUNT_TO_DISTRIBUTE=1.0     # total SOL to distribute each round
DISTRIBUTE_INTERVAL_MIN=60       # seconds
DISTRIBUTE_INTERVAL_MAX=120

BUY_LOWER_PERCENT=5              # % of wallet SOL (excluding reserve)
BUY_UPPER_PERCENT=15
BUY_INTERVAL_MIN=5               # seconds
BUY_INTERVAL_MAX=15
SELL_INTERVAL_MIN=30             # seconds
SELL_INTERVAL_MAX=90
```

Notes:
- `PRIVATE_KEY` is base58 of the main wallet (will fund sub-wallets).
- `TOKEN_MINT` is the token to trade (base58).
- When `JITO_MODE=true`, transactions are submitted via the Jito executor.

### Run
```bash
# Start the bundler/volume bot
npm run start
# or
yarn start
```

You should see logs showing:
- Main wallet address and SOL balance
- Token mint
- Configured buy/sell intervals
- Distribution results, swap tx links, and gather steps

Optional utility:
```bash
# Run standalone gather (if provided) to sweep SOL from sub-wallets
npm run gather
# or
yarn gather
```

## Troubleshooting
- Missing env var: the bot will print which variable is not set and exit
- Low SOL: ensure the main wallet has enough SOL for distribution and fees
- Slippage: increase `SLIPPAGE` if swaps are failing due to price movement
- RPC instability: try a more reliable RPC or reduce concurrency

## Safety and Responsibility
Use at your own risk; on-chain trading is volatile. Fund the main wallet carefully and start with small amounts. Ensure RPC endpoints and (optional) Jito access are stable. Comply with local laws and exchange/AMM policies.

## Contact
[![Telegram](https://img.shields.io/badge/Telegram-@lorine93s-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/lorine93s)
