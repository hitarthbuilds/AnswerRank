import { NextResponse } from "next/server";
import { generateFixItResponse } from "@/lib/server/fix-it";
import type { DiagnoseResponse, FixItRequest } from "@/lib/types";

type ErrorResponse = {
  error: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json<ErrorResponse>({ error: message }, { status });
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function isDiagnoseResponseLike(value: unknown): value is DiagnoseResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof (value as Partial<DiagnoseResponse>).productName === "string" &&
      typeof (value as Partial<DiagnoseResponse>).targetQuery === "string" &&
      Array.isArray((value as Partial<DiagnoseResponse>).recommendations),
  );
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

  const payload = body as Partial<FixItRequest>;

  if (!isDiagnoseResponseLike(payload.report)) {
    return jsonError("report is required.");
  }

  return NextResponse.json(
    await generateFixItResponse({
      report: payload.report,
      productDescription: readOptionalString(payload.productDescription),
    }),
  );
}
