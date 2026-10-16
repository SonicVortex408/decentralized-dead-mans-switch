# 💀 Silence: Decentralized Dead Man's Switch

A trustless, client-side encrypted dead man's switch on the Sepolia testnet.

An owner encrypts a secret in the browser, pins the ciphertext to IPFS, and locks ETH plus the IPFS CID in a Solidity contract. If the owner stops sending heartbeats for longer than the interval they chose, the contract releases the ETH to the beneficiary. The beneficiary then decrypts the secret locally with a passphrase the owner shared with them.

> An architecture deck with screenshots is in [`docs/presentation/`](docs/presentation/).

## 🌟 Features

- **Client-side security.** The browser's Web Crypto API (PBKDF2-SHA256, 150,000 iterations, then AES-256-GCM) encrypts the secret before it leaves the tab.
- **Decentralized storage.** Pinata stores the ciphertext on IPFS; the CID is stored on-chain.
- **On-chain automation.** Release timing comes from `block.timestamp`. Chainlink Automation (`checkUpkeep` / `performUpkeep`) can fire the release, and so can anyone else, including the beneficiary.
- **Beneficiary portal.** Beneficiaries see vaults addressed to their wallet, trigger the release, and decrypt in their own browser.

## 🛠️ Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, TanStack Router, Tailwind CSS v4, shadcn/ui |
| Data and auth | Supabase (Auth + Postgres), TanStack Query |
| Storage | Pinata IPFS |
| Cryptography | Web Crypto API (SubtleCrypto) |
| Blockchain | Solidity ^0.8.24 on Sepolia, ethers v6, MetaMask |
| Hosting | Vercel (SPA rewrite in `vercel.json`) |

## 📁 Project structure

```
contracts/DeadMansSwitch.sol     Smart contract (vaults, heartbeat, release, Chainlink upkeep)
scripts/deploy_with_ethers.ts    Browser deploy helper (needs compiled bytecode, see below)
src/routes/                      Pages: / (landing), /auth, /_authenticated/app
src/components/vault/            SetupForm, Dashboard, Countdown, BeneficiaryPanel, WalletBar, ...
src/lib/crypto-utils.ts          encryptSecret / decryptSecret
src/lib/pinata.functions.ts      Pin and fetch ciphertext on IPFS
src/lib/vault-chain.ts           Contract reads and writes (ethers)
src/lib/contract.ts              ABI, supported chains, contract address config
src/lib/wallet.ts                MetaMask connection
src/integrations/supabase/       Supabase client and generated DB types
```

## ✅ Prerequisites

- **Node.js 20+** (tested with Node 22) and npm
- **MetaMask** in your browser, with some **Sepolia test ETH** from any Sepolia faucet
- A **Supabase** project (the free tier is enough)
- A **Pinata** account with an API JWT
- Optional: a **Chainlink Automation** upkeep for automatic releases

## 🚀 Run it locally

### 1. Install dependencies

```bash
git clone https://github.com/SonicVortex408/decentralized-dead-mans-switch.git
cd decentralized-dead-mans-switch
npm install
```

> `npm ci` currently fails because `package-lock.json` is out of sync with `package.json`. Use `npm install`.

### 2. Configure environment variables

Create a `.env` file in the project root. It is git-ignored.

```bash
# Supabase: Project Settings → API
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon / publishable key>

# Pinata: API Keys → New Key → JWT
VITE_PINATA_JWT=<pinata jwt>

# Optional: default contract. Can also be pasted into the app later.
VITE_VAULT_CONTRACT_ADDRESS=0x...
VITE_VAULT_CHAIN_ID=11155111
```

| Variable | Required | Used in |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | `src/integrations/supabase/client.ts` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | `src/integrations/supabase/client.ts` |
| `VITE_PINATA_JWT` | yes, to create vaults | `src/lib/pinata.functions.ts` |
| `VITE_VAULT_CONTRACT_ADDRESS` | no | `src/lib/contract.ts` |
| `VITE_VAULT_CHAIN_ID` | no (defaults to `11155111`, Sepolia) | `src/lib/contract.ts` |

> ⚠️ Vite inlines every `VITE_` variable into the public JavaScript bundle, so anyone who loads the site can read your Pinata JWT. Use a scoped key with only the `pinJSONToIPFS` permission, and don't reuse a production key.

### 3. Set up the Supabase database

The app expects three tables, an `app_role` enum and a `has_role` function. The repo has no migrations, so the SQL below was reconstructed from `src/integrations/supabase/types.ts` and how the app uses each table. Run it in **Supabase → SQL Editor**.

<details>
<summary>Schema SQL</summary>

```sql
-- Roles
create type public.app_role as enum ('owner', 'beneficiary');

-- Profiles (one row per auth user)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  wallet_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Off-chain index of vaults (the chain stays the source of truth)
create table public.vaults (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_address text not null,
  beneficiary_address text not null,
  contract_address text not null,
  chain_id integer not null,
  ipfs_cid text not null,
  timeout_seconds integer not null,
  deposit_wei text not null default '0',
  tx_hash text,
  status text not null default 'armed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Create a profile and initial role on sign-up (the sign-up form sends display_name and role)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'owner'))
  on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row level security
alter table public.profiles   enable row level security;
alter table public.user_roles enable row level security;
alter table public.vaults     enable row level security;

create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

create policy "own roles read"   on public.user_roles for select using (auth.uid() = user_id);
create policy "own roles insert" on public.user_roles for insert with check (auth.uid() = user_id);

create policy "owner inserts vault" on public.vaults for insert with check (auth.uid() = owner_id);
-- Owners see their vaults; beneficiaries see vaults addressed to their linked wallet
create policy "owner or beneficiary reads vault" on public.vaults for select using (
  auth.uid() = owner_id
  or lower(beneficiary_address) = (
    select lower(wallet_address) from public.profiles where id = auth.uid()
  )
);
```

</details>

Then, in **Authentication → URL Configuration**, add `http://localhost:5173` (and your production URL) to the allowed redirect URLs. For quicker local testing you can turn off **Confirm email** under **Authentication → Providers → Email**.

### 4. Deploy the smart contract

The easiest route is **[Remix](https://remix.ethereum.org)**:

1. Create `DeadMansSwitch.sol` and paste in the contents of `contracts/DeadMansSwitch.sol`.
2. Compile with Solidity **0.8.24** or newer.
3. Under **Deploy & Run**, choose **Injected Provider – MetaMask**, switch MetaMask to **Sepolia**, and click **Deploy**. The constructor takes no arguments.
4. Copy the deployed contract address.

> `scripts/deploy_with_ethers.ts` deploys from the browser through MetaMask, but its `BYTECODE` constant is a placeholder (`"0x60806040..."`). Paste the compiled bytecode from Remix or `solc` into it before using it.

### 5. (Optional) Register a Chainlink Automation upkeep

Without an upkeep, nothing releases a vault automatically. The beneficiary can still release it by clicking **Trigger release**, which calls `releaseFunds(owner)`.

To release automatically:

1. Open [automation.chain.link](https://automation.chain.link) and connect MetaMask on Sepolia.
2. Register a new upkeep and choose **Custom logic**.
3. Enter your contract address and fund the upkeep with Sepolia LINK.

### 6. Start the app

```bash
npm run dev
```

Open http://localhost:5173.

## 🧭 Using the app

**As the owner**

1. Sign up or log in on `/auth`, then open the app.
2. Click **Connect MetaMask**. If MetaMask is on the wrong network, click **Switch to Sepolia**. You can also **link** the wallet to your profile.
3. If you didn't set `VITE_VAULT_CONTRACT_ADDRESS`, paste your contract address under **Point at your deployment**. It is saved in localStorage.
4. Fill in **Create your vault**: the secret, a passphrase (at least 6 characters), the beneficiary's wallet, the silence interval in minutes, and a deposit in ETH. Then click **Encrypt, pin & arm the switch**. The app encrypts the secret, pins it to IPFS, sends the `register()` transaction and saves an index row in Supabase.
5. Click **I am alive** to send a heartbeat (`ping()`) before the countdown runs out. **Cancel & withdraw** disarms the switch and refunds the deposit.
6. Share the passphrase with your beneficiary outside the app, using any secure channel.

**As the beneficiary**

1. Sign in, switch to the **Beneficiary** tab, and connect the wallet address the owner entered.
2. Once the owner has gone silent, click **Trigger release** unless Chainlink has already released the vault. The ETH is sent to your wallet.
3. Enter the passphrase and click **Decrypt**. The secret is decrypted in your browser.

> 💡 For a quick demo, use a 1–2 minute silence interval and two MetaMask accounts: one for the owner, one for the beneficiary.

## 📦 Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server on port 5173 |
| `npm run build` | Build the production bundle into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## ☁️ Deploying to Vercel

1. Import the repo into Vercel. It detects the framework as **Vite**, with build command `npm run build` and output directory `dist`.
2. Add the `VITE_*` environment variables from step 2.
3. Deploy. `vercel.json` rewrites every path to `index.html`, so routes such as `/app` work when the page is refreshed.
4. Add the Vercel URL to Supabase's allowed redirect URLs.

## 🩹 Troubleshooting

| Problem | Fix |
|---|---|
| `Missing Supabase environment variable(s)` | Check `.env` and restart `npm run dev`. Vite reads `.env` only at startup. |
| "MetaMask not detected" | Install MetaMask, or open the app in a browser profile that has it. |
| "IPFS pinning is not configured" | Set `VITE_PINATA_JWT`. |
| "Could not pin the encrypted payload" | The Pinata JWT is invalid or lacks the `pinJSONToIPFS` permission. |
| Vault doesn't load / `getVault` errors | MetaMask is on a different network from the contract, or the address is wrong. |
| Transaction reverts with `BadBeneficiary` | The beneficiary can't be the zero address or your own address. |
| Transaction reverts with `VaultExists` | Each address can have one active vault. Cancel the existing one first. |
| Beneficiary sees "No vault points at this wallet" | Use the exact address the owner entered, and check the `vaults` RLS policy. |
| **Continue with Google** fails | `src/integrations/lovable/index.ts` doesn't implement `auth.signInWithOAuth` yet. Use email and password, or wire Google up through `supabase.auth.signInWithOAuth`. |

## 🔐 Security notes

- The plaintext and the passphrase never leave the browser. IPFS and the chain see only ciphertext and the CID.
- The ciphertext on IPFS is public, so a weak passphrase can be guessed offline. Use a long, random one.
- This is a testnet demo, and the contract has not been audited. Don't lock real funds in it.
