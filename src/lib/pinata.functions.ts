import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const payloadSchema = z.object({
  v: z.literal(1),
  alg: z.literal("AES-GCM+PBKDF2"),
  salt: z.string().min(1).max(2048),
  iv: z.string().min(1).max(2048),
  ct: z.string().min(1).max(500_000),
});

const pinSchema = z.object({
  payload: payloadSchema,
  name: z.string().min(1).max(120).default("silence-vault"),
});

/** Pin the AES-256-GCM ciphertext to IPFS through Pinata from the client side. */
export async function pinEncryptedPayload(inputData: unknown) {
  // Ensure the user is authenticated via Supabase before proceeding
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Unauthorized: You must be logged in to pin payloads.");
  }
  console.log("Raw input data to pin:", inputData);
  const data = pinSchema.parse(inputData);
  const jwt = import.meta.env.VITE_PINATA_JWT;
  
  if (!jwt) {
    throw new Error("IPFS pinning is not configured. Missing VITE_PINATA_JWT.");
  }

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      pinataMetadata: { name: data.name },
      pinataContent: data.payload,
    }),
  });

  if (!res.ok) {
    console.error("Pinata pin failed", res.status, await res.text());
    throw new Error("Could not pin the encrypted payload to IPFS.");
  }

  const json = (await res.json()) as { IpfsHash: string; PinSize?: number };
  return { cid: json.IpfsHash, size: json.PinSize ?? null };
}

const cidSchema = z.object({ cid: z.string().min(20).max(120).regex(/^[A-Za-z0-9]+$/) });

/** Fetch the ciphertext back from IPFS from the client side. */
export async function fetchEncryptedPayload(inputData: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Unauthorized: You must be logged in to fetch payloads.");
  }

  const data = cidSchema.parse(inputData);
  const res = await fetch(`https://gateway.pinata.cloud/ipfs/${data.cid}`);
  
  if (!res.ok) {
    throw new Error("Could not read the payload from IPFS.");
  }
  
  const json = await res.json();
  return payloadSchema.parse(json);
}