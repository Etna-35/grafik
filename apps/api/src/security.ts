import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";
import { env } from "./env.js";

export function hashToken(token: string): string {
  return createHash("sha256")
    .update(env.sessionSecret)
    .update(":")
    .update(token)
    .digest("hex");
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function pinInput(pin: string): string {
  return `${pin}:${env.pinPepper}`;
}

export async function hashPin(pin: string): Promise<string> {
  return argon2.hash(pinInput(pin), {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });
}

export async function verifyPin(hash: string, pin: string): Promise<boolean> {
  return argon2.verify(hash, pinInput(pin));
}

