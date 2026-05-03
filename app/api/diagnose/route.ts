import { NextResponse } from "next/server";
import {
  createMockDiagnoseResponse,
  normalizeCompetitorsInput,
} from "@/lib/mock-data";
import type { DiagnoseRequest } from "@/lib/types";

type ErrorResponse = {
  error: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json<ErrorResponse>({ error: message }, { status });
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function readRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Request body must be a JSON object.");
  }

  const payload = body as Partial<DiagnoseRequest>;
  const productName = readRequiredString(payload.productName);
  const targetQuery = readRequiredString(payload.targetQuery);
  const productDescription = readOptionalString(payload.productDescription);
  const productUrl = readOptionalString(payload.productUrl);

  if (!productName) {
    return jsonError("productName is required.");
  }

  if (!targetQuery) {
    return jsonError("targetQuery is required.");
  }

  if (!productDescription && !productUrl) {
    return jsonError(
      "Provide at least one of productDescription or productUrl.",
    );
  }

  const competitors = normalizeCompetitorsInput(payload.competitors);

  const normalizedRequest: DiagnoseRequest = {
    productName,
    targetQuery,
    productDescription,
    productUrl,
    competitors: competitors.length ? competitors : undefined,
    audience: readOptionalString(payload.audience),
    region: readOptionalString(payload.region),
  };

  return NextResponse.json(createMockDiagnoseResponse(normalizedRequest));
}
