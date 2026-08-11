import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "hari_admin_session";
const SESSION_SECONDS = 6 * 60 * 60;

function adminSecret() {
  return process.env.ADMIN_PASSCODE || "";
}

function sign(value) {
  return createHmac("sha256", adminSecret()).update(value).digest("hex");
}

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isValidAdminPasscode(passcode) {
  const expected = adminSecret();

  if (!expected || !passcode) {
    return false;
  }

  return constantTimeEqual(String(passcode), expected);
}

export function createAdminSessionValue() {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  return `${expiresAt}.${sign(String(expiresAt))}`;
}

export function isValidAdminSession(value) {
  if (!adminSecret() || !value) {
    return false;
  }

  const [expiresAt, signature] = String(value).split(".");
  const expiresAtNumber = Number(expiresAt);

  if (!expiresAt || !signature || !Number.isFinite(expiresAtNumber) || expiresAtNumber < Date.now()) {
    return false;
  }

  return constantTimeEqual(signature, sign(expiresAt));
}

export async function hasAdminSession() {
  const cookieStore = await cookies();
  return isValidAdminSession(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export async function setAdminSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_COOKIE_NAME, createAdminSessionValue(), {
    httpOnly: true,
    maxAge: SESSION_SECONDS,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production"
  });
}
