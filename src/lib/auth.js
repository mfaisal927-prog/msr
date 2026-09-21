import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const AUTH_COOKIE_NAME = "malik_sajawal_session";
export const USER_ROLES = {
  ADMIN: "ADMIN",
  STAFF: "STAFF",
};

const LOCAL_AUTH_SECRET = "malik-sajawal-local-dev-secret-change-before-vercel";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_DIGEST = "sha512";

function getAuthSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET environment variable is required in production.");
  }

  return LOCAL_AUTH_SECRET;
}

function getInitialUsername() {
  return (process.env.ADMIN_USERNAME || "admin").trim();
}

function getInitialPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_PASSWORD environment variable is required before first production login.");
  }

  return "admin123";
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");

  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!password || !storedHash || !storedHash.includes(":")) return false;

  const [salt, expectedHash] = storedHash.split(":");
  const candidate = hashPassword(password, salt).split(":")[1];

  return safeCompare(candidate, expectedHash);
}

function signPayload(payload) {
  return crypto.createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function createSessionValue(user) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      username: user.username,
      role: user.role || USER_ROLES.STAFF,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    })
  ).toString("base64url");

  return `${payload}.${signPayload(payload)}`;
}

export function verifySessionValue(value) {
  if (!value || !value.includes(".")) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = signPayload(payload);
  if (!safeCompare(signature, expectedSignature)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.sub || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function ensureAdminUser() {
  const existingUser = await prisma.adminUser.findFirst({
    orderBy: { id: "asc" },
  });

  if (existingUser) return existingUser;

  return prisma.adminUser.create({
    data: {
      username: getInitialUsername(),
      passwordHash: hashPassword(getInitialPassword()),
    },
  });
}

export async function getPrimaryAdminId() {
  const firstUser = await prisma.adminUser.findFirst({
    orderBy: { id: "asc" },
    select: { id: true },
  });

  return firstUser?.id || null;
}

export async function getUserRole(userId) {
  const primaryAdminId = await getPrimaryAdminId();
  return primaryAdminId && Number(userId) === primaryAdminId ? USER_ROLES.ADMIN : USER_ROLES.STAFF;
}

export async function setAuthCookie(user) {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, createSessionValue(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = verifySessionValue(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session) return null;

  const user = await prisma.adminUser.findUnique({
    where: { id: Number(session.sub) },
    select: { id: true, username: true },
  });

  if (!user) return null;

  return {
    ...user,
    role: await getUserRole(user.id),
  };
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      error: { success: false, error: "براہِ کرم دوبارہ login کریں۔" },
    };
  }

  return { user, error: null };
}

export async function requireAdminUser() {
  const { user, error } = await requireCurrentUser();
  if (error) return { user: null, error };

  if (user.role !== USER_ROLES.ADMIN) {
    return {
      user,
      error: { success: false, error: "یہ کام صرف admin کر سکتا ہے۔" },
    };
  }

  return { user, error: null };
}

export async function requireDataEntryUser() {
  return requireCurrentUser();
}
