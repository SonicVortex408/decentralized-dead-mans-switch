💀 Dead Man's Switch (DMS)
A trustless, client-side encrypted backup protocol on the Sepolia testnet.

🌟 Features
Client-Side Security: Zero-knowledge server architecture utilizing browser-native Web Crypto API (AES-256-GCM + PBKDF2) to encrypt secrets before they ever touch IPFS.

Decentralized Storage: Immutable metadata and ciphertext pinning via Pinata IPFS.

On-Chain Automation: Trustless heartbeat monitoring and timed release logic deployed on Sepolia.

Beneficiary Portal: Seamless recovery dashboard allowing verified beneficiaries to trigger releases and decrypt payloads locally.

🛠️ Tech Stack
Frontend: React, TypeScript, Vite, Tailwind CSS, Shadcn UI

State & Auth: Supabase, TanStack Query

Storage: Pinata IPFS API V3

Cryptography: Web Crypto API (SubtleCrypto)

Blockchain: Sepolia Testnet, Ethers.js / Wagmi
