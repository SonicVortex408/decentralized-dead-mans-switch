// Deployed DeadMansSwitch contract configuration + ABI.
// The address can be supplied at build time (VITE_VAULT_CONTRACT_ADDRESS) or
// pasted into the app by the owner (persisted locally) so the same frontend can
// point at any deployment.

import { useSyncExternalStore } from "react";

export const DEAD_MANS_SWITCH_ABI = [
  "function register(address beneficiary, uint64 timeout, string cid) payable",
  "function ping()",
  "function deposit() payable",
  "function cancelAndWithdraw()",
  "function releaseFunds(address owner)",
  "function isDue(address owner) view returns (bool)",
  "function getVault(address owner) view returns (address beneficiary, uint256 amount, uint64 lastPing, uint64 timeout, string cid, bool released, bool cancelled, bool exists)",
  "event VaultRegistered(address indexed owner, address indexed beneficiary, uint256 amount, uint64 timeout, string cid)",
  "event Heartbeat(address indexed owner, uint64 at)",
  "event Released(address indexed owner, address indexed beneficiary, uint256 amount)",
  "event Cancelled(address indexed owner, uint256 refunded)",
] as const;

export const SUPPORTED_CHAINS: Record<number, { name: string; explorer: string }> = {
  11155111: { name: "Sepolia", explorer: "https://sepolia.etherscan.io" },
  84532: { name: "Base Sepolia", explorer: "https://sepolia.basescan.org" },
  8453: { name: "Base", explorer: "https://basescan.org" },
  1: { name: "Ethereum", explorer: "https://etherscan.io" },
};

const ADDR_KEY = "silence.contract.address";
const CHAIN_KEY = "silence.contract.chainId";

const envAddress = (import.meta.env["VITE_VAULT_CONTRACT_ADDRESS"] as string | undefined) ?? "";
const envChain = Number(import.meta.env["VITE_VAULT_CHAIN_ID"] ?? 11155111);

export interface ContractConfig {
  address: string;
  chainId: number;
}

function read(): ContractConfig {
  if (typeof window === "undefined") return { address: envAddress, chainId: envChain };
  return {
    address: window.localStorage.getItem(ADDR_KEY) || envAddress,
    chainId: Number(window.localStorage.getItem(CHAIN_KEY) || envChain),
  };
}

let config: ContractConfig = read();
const listeners = new Set<() => void>();
const serverSnapshot: ContractConfig = { address: envAddress, chainId: envChain };

export const contractConfig = {
  get: () => config,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  set(next: ContractConfig) {
    config = next;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADDR_KEY, next.address);
      window.localStorage.setItem(CHAIN_KEY, String(next.chainId));
    }
    listeners.forEach((l) => l());
  },
};

export function useContractConfig(): ContractConfig {
  return useSyncExternalStore(
    contractConfig.subscribe,
    () => config,
    () => serverSnapshot,
  );
}

export function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function explorerTx(chainId: number, hash: string): string {
  const chain = SUPPORTED_CHAINS[chainId];
  return chain ? `${chain.explorer}/tx/${hash}` : "#";
}
