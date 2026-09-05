// Real MetaMask (EIP-1193) wallet connection.
import { useSyncExternalStore } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";

export type Address = `0x${string}`;

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, handler: (...args: never[]) => void): void;
  removeListener?(event: string, handler: (...args: never[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export interface WalletState {
  address: Address | null;
  chainId: number | null;
  connecting: boolean;
  available: boolean;
}

const empty: WalletState = { address: null, chainId: null, connecting: false, available: false };
let state: WalletState = empty;
const listeners = new Set<() => void>();

function emit(next: Partial<WalletState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function getEthereum(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

let initialized = false;
function init() {
  if (initialized) return;
  initialized = true;
  const eth = getEthereum();
  if (!eth) return;
  emit({ available: true });

  eth.request({ method: "eth_accounts" }).then((accounts) => {
    const list = accounts as string[];
    if (list.length > 0) emit({ address: list[0] as Address });
  });
  eth.request({ method: "eth_chainId" }).then((cid) => {
    emit({ chainId: Number(cid as string) });
  });

  eth.on?.("accountsChanged", ((accounts: string[]) => {
    emit({ address: (accounts[0] as Address) ?? null });
  }) as never);
  eth.on?.("chainChanged", ((cid: string) => {
    emit({ chainId: Number(cid) });
  }) as never);
}

export const wallet = {
  get: () => state,
  subscribe(fn: () => void) {
    init();
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  async connect(): Promise<Address | null> {
    const eth = getEthereum();
    if (!eth) throw new Error("MetaMask not detected. Install it to continue.");
    emit({ connecting: true });
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const chainId = Number((await eth.request({ method: "eth_chainId" })) as string);
      const address = (accounts[0] as Address) ?? null;
      emit({ address, chainId, connecting: false });
      return address;
    } catch (error) {
      emit({ connecting: false });
      throw error;
    }
  },
  disconnect() {
    emit({ address: null });
  },
  async switchChain(chainId: number) {
    const eth = getEthereum();
    if (!eth) return;
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x" + chainId.toString(16) }],
    });
  },
};

export function useWallet(): WalletState {
  return useSyncExternalStore(
    wallet.subscribe,
    () => state,
    () => empty,
  );
}

export async function getSigner(): Promise<JsonRpcSigner> {
  const eth = getEthereum();
  if (!eth) throw new Error("MetaMask not detected.");
  const provider = new BrowserProvider(eth as never);
  return provider.getSigner();
}

export function getProvider(): BrowserProvider {
  const eth = getEthereum();
  if (!eth) throw new Error("MetaMask not detected.");
  return new BrowserProvider(eth as never);
}

export function shortAddr(a: string | null | undefined): string {
  if (!a) return "—";
  return a.slice(0, 6) + "…" + a.slice(-4);
}
