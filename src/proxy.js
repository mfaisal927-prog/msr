import { NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "malik_sajawal_session";
const LOCAL_AUTH_SECRET = "malik-sajawal-local-dev-secret-change-before-vercel";
const PUBLIC_PATH_PATTERN = /^\/(?:_next|favicon\.ico|.*\..*)/;
const STAFF_ROLE = "STAFF";
const STAFF_HOME_PATH = "/daily-entry";
const STAFF_ALLOWED_PATHS = ["/dashboard", "/daily-entry", "/records", "/daily", "/purchases"];

function getAuthSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET environment variable is required in production.");
  }

  return LOCAL_AUTH_SECRET;
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeCompare(left, right) {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function verifySessionValue(value) {
  if (!value || !value.includes(".")) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expectedSignature = bytesToBase64Url(new Uint8Array(signatureBytes));

  if (!safeCompare(signature, expectedSignature)) return null;

  try {
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    if (!session.sub || !session.exp || session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

function isStaffAllowedPath(pathname) {
  return STAFF_ALLOWED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATH_PATTERN.test(pathname)) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/";
  const session = await verifySessionValue(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (!session && !isLoginPage) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isLoginPage) {
    const homePath = session.role === STAFF_ROLE ? STAFF_HOME_PATH : "/dashboard";
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  if (session?.role === STAFF_ROLE && !isStaffAllowedPath(pathname)) {
    return NextResponse.redirect(new URL(STAFF_HOME_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};
