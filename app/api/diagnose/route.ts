import { NextResponse } from "next/server";
import { generateDiagnoseResponse } from "@/lib/server/diagnose";
import { rateLimitOrThrow, RateLimitError } from "@/lib/server/rate-limit";
import {
  InputValidationError,
  validateDiagnosticInput,
} from "@/lib/server/validate-diagnostic-input";

type ErrorResponse = {
  error: string;
  message?: string;
};

function jsonError(message: string, status = 400, detail?: string) {
  return NextResponse.json<ErrorResponse>(
    detail ? { error: message, message: detail } : { error: message },
    { status },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }

  try {
    const normalizedRequest = validateDiagnosticInput(body);
    await rateLimitOrThrow(request, {
      route: "diagnose-free",
      limit: 5,
      windowMs: 60 * 60 * 1000,
      email: normalizedRequest.leadEmail,
    });

    return NextResponse.json(
      await generateDiagnoseResponse({
        ...normalizedRequest,
        auditMode: normalizedRequest.auditMode ?? "free",
      }),
    );
  } catch (error) {
    if (error instanceof InputValidationError) {
      return jsonError(error.message, error.status);
    }

    if (error instanceof RateLimitError) {
      return jsonError(
        "Rate limit exceeded",
        error.status,
        "You have reached the free diagnostic limit. Try again later or request a full AI visibility audit.",
      );
    }

    throw error;
  }
}
