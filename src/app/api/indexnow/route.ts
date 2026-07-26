import { NextResponse } from "next/server";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const EXPECTED_PRODUCTION_ORIGIN = "https://www.primeglobal.pro";
const RETRY_DELAYS_MS = [500, 1500, 3500] as const;
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_URLS_PER_REQUEST = 1_000;

type IndexNowRequestBody = {
  url?: unknown;
  urls?: unknown;
  urlList?: unknown;
};

type IndexNowPayload = {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
};

function jsonError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details,
      },
    },
    {
      status,
      headers: {
        Allow: "POST",
      },
    }
  );
}

function getSiteOrigin(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) {
    throw new Error("Missing NEXT_PUBLIC_SITE_URL");
  }

  const parsed = new URL(siteUrl);
  if (parsed.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS");
  }

  if (parsed.origin !== EXPECTED_PRODUCTION_ORIGIN) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must be ${EXPECTED_PRODUCTION_ORIGIN} for IndexNow submissions`
    );
  }

  return parsed.origin;
}

function readIndexNowKey(): string {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    throw new Error("Missing INDEXNOW_KEY");
  }
  return key;
}

function readSubmitSecret(): string {
  const secret = process.env.INDEXNOW_SUBMIT_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing INDEXNOW_SUBMIT_SECRET");
  }
  return secret;
}

function isAuthorized(request: Request, expectedSecret: string): boolean {
  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim() === expectedSecret;
  }

  const headerSecret = request.headers.get("x-indexnow-secret")?.trim();
  return headerSecret === expectedSecret;
}

function collectUrlCandidates(body: IndexNowRequestBody): string[] {
  const fromSingle = typeof body.url === "string" ? [body.url] : [];
  const fromUrls = Array.isArray(body.urls) ? body.urls : [];
  const fromUrlList = Array.isArray(body.urlList) ? body.urlList : [];

  return [...fromSingle, ...fromUrls, ...fromUrlList]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function validateCanonicalUrls(rawUrls: string[], allowedOrigin: string): string[] {
  const canonical = new Set<string>();

  for (const rawUrl of rawUrls) {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new Error(`Invalid URL: ${rawUrl}`);
    }

    if (parsed.origin !== allowedOrigin) {
      throw new Error(`Non-canonical URL rejected: ${rawUrl}`);
    }

    if (parsed.protocol !== "https:") {
      throw new Error(`Only HTTPS URLs are allowed: ${rawUrl}`);
    }

    if (parsed.username || parsed.password) {
      throw new Error(`Credentialed URL rejected: ${rawUrl}`);
    }

    canonical.add(parsed.toString());
  }

  return [...canonical];
}

async function submitIndexNow(payload: IndexNowPayload) {
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: abort.signal,
      });

      clearTimeout(timeout);
      lastStatus = response.status;
      lastBody = (await response.text()).slice(0, 4000);

      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          body: lastBody,
          attempts: attempt + 1,
        };
      }

      const shouldRetry = response.status >= 500 || response.status === 429;
      if (!shouldRetry || attempt === RETRY_DELAYS_MS.length - 1) {
        return {
          ok: false,
          status: response.status,
          body: lastBody,
          attempts: attempt + 1,
        };
      }
    } catch (error) {
      clearTimeout(timeout);

      if (attempt === RETRY_DELAYS_MS.length - 1) {
        const message = error instanceof Error ? error.message : "Unknown fetch error";
        return {
          ok: false,
          status: lastStatus,
          body: lastBody,
          attempts: attempt + 1,
          networkError: message,
        };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
  }

  return {
    ok: false,
    status: lastStatus,
    body: lastBody,
    attempts: RETRY_DELAYS_MS.length,
  };
}

function methodNotAllowed() {
  return jsonError(405, "METHOD_NOT_ALLOWED", "Use POST for IndexNow submissions.");
}

export const runtime = "nodejs";

export async function GET() {
  return methodNotAllowed();
}

export async function POST(request: Request) {
  let allowedOrigin: string;
  try {
    allowedOrigin = getSiteOrigin();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configuration error";
    return jsonError(500, "CONFIGURATION_ERROR", message);
  }

  let body: IndexNowRequestBody;
  try {
    body = (await request.json()) as IndexNowRequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  let submitSecret: string;
  try {
    submitSecret = readSubmitSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configuration error";
    return jsonError(500, "CONFIGURATION_ERROR", message);
  }

  if (!isAuthorized(request, submitSecret)) {
    return jsonError(401, "UNAUTHORIZED", "Invalid submit token.");
  }

  const candidates = collectUrlCandidates(body);
  if (candidates.length === 0) {
    return jsonError(400, "INVALID_PAYLOAD", "Provide one URL in `url` or multiple URLs in `urls`/`urlList`.");
  }

  if (candidates.length > MAX_URLS_PER_REQUEST) {
    return jsonError(400, "TOO_MANY_URLS", `Maximum ${MAX_URLS_PER_REQUEST} URLs per request.`);
  }

  let canonicalUrls: string[];
  try {
    canonicalUrls = validateCanonicalUrls(candidates, allowedOrigin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid URL payload";
    return jsonError(400, "NON_CANONICAL_URL", message);
  }

  let indexNowKey: string;
  try {
    indexNowKey = readIndexNowKey();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configuration error";
    return jsonError(500, "CONFIGURATION_ERROR", message);
  }

  const keyLocation = `${allowedOrigin}/${indexNowKey}.txt`;
  const payload: IndexNowPayload = {
    host: new URL(allowedOrigin).host,
    key: indexNowKey,
    keyLocation,
    urlList: canonicalUrls,
  };

  const submission = await submitIndexNow(payload);
  if (!submission.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INDEXNOW_UPSTREAM_ERROR",
          message: "IndexNow submission failed.",
          status: submission.status || null,
          attempts: submission.attempts,
          details: submission.networkError ?? submission.body,
        },
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      submittedCount: canonicalUrls.length,
      host: payload.host,
      keyLocation: payload.keyLocation,
      upstream: {
        status: submission.status,
        attempts: submission.attempts,
        body: submission.body,
      },
    },
    { status: 200 }
  );
}

export async function PUT() {
  return methodNotAllowed();
}

export async function PATCH() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}
