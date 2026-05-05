import { spawnSync } from "node:child_process";

const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

const diagnosePayload = {
  productName: "HK Vitals 100% Magnesium Glycinate",
  productUrl:
    "https://www.hkvitals.com/sv/hk-vitals-100-magnesium-glycinate/SP-129393",
  productDescription:
    "HK Vitals 100% Magnesium Glycinate is a chelated magnesium supplement designed to support restful sleep, muscle relaxation, recovery, stress support, and gentle digestion. It is positioned around high absorption magnesium glycinate compared to harsher forms like magnesium oxide.",
  targetQuery:
    "best magnesium glycinate supplement for sleep and muscle recovery in India",
  competitors: [
    "Tata 1mg Magnesium Glycinate",
    "HealthyHey Magnesium Glycinate",
    "Himalayan Organics Magnesium",
    "Carbamide Forte Magnesium",
    "Wellbeing Nutrition Magnesium",
  ],
  audience:
    "Indian adults looking for better sleep, muscle recovery, stress support, and gentle digestion",
  region: "India",
  auditMode: "free",
};

const leadPayload = {
  email: "smoke-test@answerrank.ai",
  companyName: "AnswerRank QA",
  productName: diagnosePayload.productName,
  productUrl: diagnosePayload.productUrl,
  buyerIntentQuery: diagnosePayload.targetQuery,
  source: "full_audit_request",
  auditModeRequested: "full",
};

function runCurl(args, label) {
  const result = spawnSync("curl", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw new Error(`${label} failed to start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(
      `${label} failed with exit ${result.status}: ${result.stderr.trim() || "Unknown curl error"}`,
    );
  }

  return result.stdout;
}

function parseJsonHttpResponse(raw) {
  const marker = "\n__STATUS__:";
  const index = raw.lastIndexOf(marker);

  if (index === -1) {
    throw new Error("Unable to parse HTTP status from curl output.");
  }

  const body = raw.slice(0, index);
  const status = Number(raw.slice(index + marker.length).trim());

  return {
    status,
    body,
    json: body ? JSON.parse(body) : null,
  };
}

function requestJson(method, path, payload) {
  const args = [
    "--silent",
    "--show-error",
    "--location",
    "--write-out",
    "\n__STATUS__:%{http_code}",
    "-X",
    method,
    `${baseUrl}${path}`,
  ];

  if (payload) {
    args.push(
      "-H",
      "Content-Type: application/json",
      "--data",
      JSON.stringify(payload),
    );
  }

  return parseJsonHttpResponse(runCurl(args, `${method} ${path}`));
}

function summarizeDiagnoseResponse(json) {
  return {
    source: json?.metadata?.source ?? json?.source ?? null,
    auditMode: json?.metadata?.auditMode ?? null,
    providersUsed: json?.metadata?.providersUsed ?? [],
    providersSkipped: json?.metadata?.providersSkipped ?? [],
    cacheStatus: json?.metadata?.cacheStatus ?? null,
    firecrawlStatus: json?.metadata?.firecrawlStatus ?? null,
    expandedQueries: Array.isArray(json?.expandedQueries)
      ? json.expandedQueries.length
      : 0,
    overallScore: json?.overallScore ?? null,
  };
}

function requestStream(path, payload) {
  const raw = runCurl(
    [
      "--silent",
      "--show-error",
      "--no-buffer",
      "--max-time",
      "20",
      "-X",
      "POST",
      "-H",
      "Content-Type: application/json",
      "--data",
      JSON.stringify(payload),
      `${baseUrl}${path}`,
    ],
    `POST ${path}`,
  );

  const chunks = raw
    .split("\n\n")
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks
    .map((chunk) => {
      const lines = chunk.split("\n");
      const event = lines
        .find((line) => line.startsWith("event:"))
        ?.replace("event:", "")
        .trim();
      const data = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace("data:", "").trim())
        .join("\n");

      return {
        event: event || "message",
        data: data ? JSON.parse(data) : null,
      };
    })
    .slice(0, 12);
}

function printSection(title, payload) {
  console.log(`\n=== ${title} ===`);
  console.log(
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
  );
}

try {
  printSection("Smoke base URL", baseUrl);

  const health = requestJson("GET", "/api/health");
  printSection("GET /api/health", { status: health.status, json: health.json });

  if (health.status !== 200) {
    throw new Error(`/api/health returned ${health.status}`);
  }

  const lead = requestJson("POST", "/api/leads", leadPayload);
  printSection("POST /api/leads", { status: lead.status, json: lead.json });

  if (lead.status !== 200 || lead.json?.ok !== true) {
    throw new Error(`/api/leads returned ${lead.status}`);
  }

  const diagnose = requestJson("POST", "/api/diagnose", diagnosePayload);
  printSection("POST /api/diagnose", {
    status: diagnose.status,
    summary: summarizeDiagnoseResponse(diagnose.json),
  });

  if (diagnose.status !== 200 || !diagnose.json?.reportId) {
    throw new Error(`/api/diagnose returned ${diagnose.status}`);
  }

  try {
    const streamEvents = requestStream("/api/diagnose/stream", diagnosePayload);
    printSection(
      "POST /api/diagnose/stream",
      streamEvents.map((event) => ({
        event: event.event,
        data:
          event.event === "result"
            ? summarizeDiagnoseResponse(event.data)
            : event.data,
      })),
    );
  } catch (error) {
    printSection("POST /api/diagnose/stream", {
      warning:
        error instanceof Error
          ? error.message
          : "Streaming smoke test failed.",
    });
  }

  console.log("\nSmoke API test completed.");
} catch (error) {
  console.error(
    "\nSmoke API test failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
