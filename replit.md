# Workspace

## Overview

Monad NFT minting app — a React + Vite frontend that connects wallets via RainbowKit/Wagmi and mints from an ERC-721 contract on Monad Testnet (chainId 10143).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Frontend**: React + Vite + Tailwind v4 + shadcn-style UI
- **Web3**: wagmi v2 + viem + RainbowKit + @tanstack/react-query
- **Chain**: Monad Testnet (10143) via `https://testnet-rpc.monad.xyz`
- **Smart contract**: `contracts/MonadNFT.sol` (ERC-721 on top of OpenZeppelin)

## Features

- Wallet connect (RainbowKit) with auto-prompt to switch to Monad Testnet
- Live mint price / minted / remaining stats and progress bar
- Mint button calling `mint()` payable with the on-chain `mintPrice`
- Success modal with thumbs-up image, transaction hash linked to Monadscan, and X close button
- "My Mints" gallery scanning past `Minted` events for the connected wallet, then resolving each token's metadata image (supports `ipfs://`, `http(s)://`, and `data:` URIs)

## Configuration

The mint UI reads two optional env vars (Vite-prefixed):

- `VITE_NFT_CONTRACT_ADDRESS` — the deployed `MonadNFT` address. Until set, the UI shows a "contract not configured" notice.
- `VITE_WALLETCONNECT_PROJECT_ID` — optional Reown/WalletConnect project ID; without it the WalletConnect QR flow falls back to defaults.

## Deploying the contract

1. `forge init monad-nft && cd monad-nft`
2. `forge install OpenZeppelin/openzeppelin-contracts`
3. Copy `contracts/MonadNFT.sol` into `src/`
4. `forge create src/MonadNFT.sol:MonadNFT --rpc-url https://testnet-rpc.monad.xyz --private-key $PRIVATE_KEY --constructor-args "Monad Genesis" "MGEN" "ipfs://YOUR_BASE_URI/" 5000 10000000000000000`
5. Set `VITE_NFT_CONTRACT_ADDRESS` to the printed address.

## Key Commands

- `pnpm --filter @workspace/nft-mint run dev` — run the mint frontend
- `pnpm run typecheck` — full typecheck
- `pnpm run build` — build all packages
