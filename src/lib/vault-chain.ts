// On-chain vault reads/writes against the deployed DeadMansSwitch contract.
import { Contract, parseEther, formatEther } from "ethers";
import { DEAD_MANS_SWITCH_ABI, contractConfig } from "./contract";
import { getProvider, getSigner } from "./wallet";

export interface OnChainVault {
  beneficiary: string;
  amountWei: string;
  amountEth: string;
  lastPingMs: number;
  timeoutMs: number;
  cid: string;
  released: boolean;
  cancelled: boolean;
  exists: boolean;
}

function requireAddress(): string {
  const { address } = contractConfig.get();
  if (!address) throw new Error("No contract address configured yet.");
  return address;
}

export function readContract() {
  return new Contract(requireAddress(), DEAD_MANS_SWITCH_ABI, getProvider());
}

export async function writeContract() {
  return new Contract(requireAddress(), DEAD_MANS_SWITCH_ABI, await getSigner());
}

export async function fetchVault(owner: string): Promise<OnChainVault | null> {
  const contract = readContract();
  const raw = await contract["getVault"]!(owner);
  if (!raw[7]) return null;
  const amountWei = (raw[1] as bigint).toString();
  return {
    beneficiary: raw[0] as string,
    amountWei,
    amountEth: formatEther(raw[1] as bigint),
    lastPingMs: Number(raw[2] as bigint) * 1000,
    timeoutMs: Number(raw[3] as bigint) * 1000,
    cid: raw[4] as string,
    released: raw[5] as boolean,
    cancelled: raw[6] as boolean,
    exists: true,
  };
}

export async function registerVault(input: {
  beneficiary: string;
  timeoutSeconds: number;
  cid: string;
  depositEth: number;
}) {
  const contract = await writeContract();
  const tx = await contract["register"]!(
    input.beneficiary,
    BigInt(input.timeoutSeconds),
    input.cid,
    { value: parseEther(String(input.depositEth)) },
  );
  return tx.wait();
}

export async function pingVault() {
  const contract = await writeContract();
  const tx = await contract["ping"]!();
  return tx.wait();
}

export async function cancelVault() {
  const contract = await writeContract();
  const tx = await contract["cancelAndWithdraw"]!();
  return tx.wait();
}

export async function releaseVault(owner: string) {
  const contract = await writeContract();
  const tx = await contract["releaseFunds"]!(owner);
  return tx.wait();
}

export async function isDue(owner: string): Promise<boolean> {
  const contract = readContract();
  return (await contract["isDue"]!(owner)) as boolean;
}
