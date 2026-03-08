# XCHANGE – OTC P2P Marketplace on Bitcoin L1

A fully decentralized OTC peer-to-peer marketplace for trading OP_20 tokens and OP_721 NFTs directly against BTC on Bitcoin Layer 1 via OP_NET.

## Features
- 🟠 Real OP_WALLET connect (no mock)
- 🏪 Live marketplace — empty until real users list
- ➕ Create listings (OP_20 tokens or OP_721 NFTs)
- 💰 Fixed price OR accept offers per listing
- 🔐 Escrow-protected trades with 48h timelock
- 📊 Dashboard: my listings, sent/received offers
- 📜 Transaction history
- 🌙/☀️ Dark/light mode

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import your repo
3. Framework: Vite
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy!

## Local Dev

```bash
npm install
npm run dev
```

## OP_WALLET

Install OP_WALLET from https://opnet.org/wallet to connect.
The app uses `window.opnet` injected by the extension.

## Network

- Testnet RPC: https://testnet.opnet.org
- Mainnet RPC: https://opnet.org

## Tech Stack
- React 18 + Vite
- OP_NET SDK (`window.opnet`)
- localStorage for listing persistence
- No backend required
