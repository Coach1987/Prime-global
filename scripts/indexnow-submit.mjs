const EXPECTED_PRODUCTION_ORIGIN = "https://www.primeglobal.pro";

function readEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function extractSitemapUrls(xmlText) {
  const matches = xmlText.matchAll(/<loc>([^<]+)<\/loc>/g);
  const urls = [];

  for (const match of matches) {
    const candidate = match[1]?.trim();
    if (candidate) {
      urls.push(candidate);
    }
  }

  return urls;
}

function validateProductionUrls(urls, expectedOrigin) {
  const valid = new Set();

  for (const value of urls) {
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      continue;
    }

    if (parsed.origin !== expectedOrigin || parsed.protocol !== "https:") {
      continue;
    }

    if (parsed.username || parsed.password) {
      continue;
    }

    valid.add(parsed.toString());
  }

  return [...valid];
}

async function main() {
  const submitSecret = readEnv("INDEXNOW_SUBMIT_SECRET");
  const siteUrl = new URL(readEnv("NEXT_PUBLIC_SITE_URL"));

  if (siteUrl.origin !== EXPECTED_PRODUCTION_ORIGIN) {
    throw new Error(
      `Refusing to submit from non-production origin. Expected ${EXPECTED_PRODUCTION_ORIGIN}, got ${siteUrl.origin}`
    );
  }

  const sitemapResponse = await fetch(`${siteUrl.origin}/sitemap.xml`, {
    headers: { accept: "application/xml,text/xml" },
  });

  if (!sitemapResponse.ok) {
    throw new Error(`Failed to fetch sitemap.xml: HTTP ${sitemapResponse.status}`);
  }

  const sitemapXml = await sitemapResponse.text();
  const sitemapUrls = extractSitemapUrls(sitemapXml);
  const canonicalUrls = validateProductionUrls(sitemapUrls, siteUrl.origin);

  if (canonicalUrls.length === 0) {
    throw new Error("No production canonical URLs found in sitemap.xml");
  }

  const submitResponse = await fetch(`${siteUrl.origin}/api/indexnow`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${submitSecret}`,
    },
    body: JSON.stringify({ urlList: canonicalUrls }),
  });

  const responseText = await submitResponse.text();

  if (!submitResponse.ok) {
    throw new Error(`IndexNow API route failed: HTTP ${submitResponse.status} ${responseText}`);
  }

  const result = JSON.parse(responseText);
  const submittedCount = result?.submittedCount;

  console.log(
    JSON.stringify(
      {
        ok: true,
        submittedCount,
        origin: siteUrl.origin,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
