import type {
  AuditMode,
  DiagnoseRequest,
  DiagnoseResponse,
  FixItRequest,
  LeadRequest,
} from "@/lib/types";
import {
  MAX_AUDIENCE_CHARS,
  MAX_BUYER_QUERY_CHARS,
  MAX_COMPANY_NAME_CHARS,
  MAX_COMPETITORS,
  MAX_COMPETITOR_NAME_CHARS,
  MAX_DESCRIPTION_CHARS,
  MAX_LEAD_EMAIL_CHARS,
  MAX_PRODUCT_NAME_CHARS,
  MAX_PRODUCT_URL_CHARS,
  MAX_REGION_CHARS,
} from "@/lib/server/limits";

export class InputValidationError extends Error {
  status = 400;

  constructor(message: string) {
    super(message);
    this.name = "InputValidationError";
  }
}

function ensureObject(value: unknown, message: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InputValidationError(message);
  }

  return value as Record<string, unknown>;
}

function readTrimmedString(
  value: unknown,
  label: string,
  maxLength: number,
  required = false,
) {
  if (typeof value !== "string") {
    if (required) {
      throw new InputValidationError(`${label} is required.`);
    }

    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    if (required) {
      throw new InputValidationError(`${label} is required.`);
    }

    return undefined;
  }

  if (trimmed.length > maxLength) {
    throw new InputValidationError(
      `${label} must be ${maxLength} characters or fewer.`,
    );
  }

  return trimmed;
}

function normalizeCompetitors(value: unknown) {
  const rawCompetitors = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const normalized = rawCompetitors
    .map((item) =>
      readTrimmedString(
        item,
        "Each competitor name",
        MAX_COMPETITOR_NAME_CHARS,
        false,
      ),
    )
    .filter((item): item is string => Boolean(item));

  if (normalized.length > MAX_COMPETITORS) {
    throw new InputValidationError(
      `A maximum of ${MAX_COMPETITORS} competitors is allowed.`,
    );
  }

  return Array.from(new Set(normalized));
}

function readAuditMode(value: unknown): AuditMode | undefined {
  if (value !== "free" && value !== "full" && typeof value !== "undefined") {
    throw new InputValidationError("auditMode must be either free or full.");
  }

  return value;
}

export function validateDiagnosticInput(input: unknown): DiagnoseRequest {
  const payload = ensureObject(input, "Request body must be a JSON object.");
  const targetQuerySource =
    payload.targetQuery ?? payload.buyerIntentQuery ?? undefined;

  const productName = readTrimmedString(
    payload.productName,
    "productName",
    MAX_PRODUCT_NAME_CHARS,
    true,
  );
  const targetQuery = readTrimmedString(
    targetQuerySource,
    "targetQuery",
    MAX_BUYER_QUERY_CHARS,
    true,
  );
  const productUrl = readTrimmedString(
    payload.productUrl,
    "productUrl",
    MAX_PRODUCT_URL_CHARS,
  );
  const productDescription = readTrimmedString(
    payload.productDescription,
    "productDescription",
    MAX_DESCRIPTION_CHARS,
  );

  if (!productUrl && !productDescription) {
    throw new InputValidationError(
      "Provide at least one of productDescription or productUrl.",
    );
  }

  const competitors = normalizeCompetitors(payload.competitors);

  return {
    productName: productName!,
    productUrl,
    productDescription,
    targetQuery: targetQuery!,
    buyerIntentQuery: targetQuery!,
    competitors: competitors.length ? competitors : undefined,
    audience: readTrimmedString(
      payload.audience,
      "audience",
      MAX_AUDIENCE_CHARS,
    ),
    region: readTrimmedString(payload.region, "region", MAX_REGION_CHARS),
    auditMode: readAuditMode(payload.auditMode),
    leadEmail: readTrimmedString(
      payload.leadEmail,
      "leadEmail",
      MAX_LEAD_EMAIL_CHARS,
    ),
  };
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

export function validateFixItInput(input: unknown): FixItRequest {
  const payload = ensureObject(input, "Request body must be a JSON object.");

  if (!isDiagnoseResponseLike(payload.report)) {
    throw new InputValidationError("report is required.");
  }

  return {
    report: payload.report,
    productDescription: readTrimmedString(
      payload.productDescription,
      "productDescription",
      MAX_DESCRIPTION_CHARS,
    ),
  };
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateLeadInput(input: unknown): LeadRequest {
  const payload = ensureObject(input, "Request body must be a JSON object.");
  const email = readTrimmedString(
    payload.email,
    "email",
    MAX_LEAD_EMAIL_CHARS,
    true,
  );

  if (!validateEmail(email!)) {
    throw new InputValidationError("email must be a valid email address.");
  }

  const source = payload.source;

  if (
    source !== "form" &&
    source !== "report_cta" &&
    source !== "full_audit_request"
  ) {
    throw new InputValidationError("source is required.");
  }

  const auditModeRequested = payload.auditModeRequested;

  if (auditModeRequested !== "free" && auditModeRequested !== "full") {
    throw new InputValidationError(
      "auditModeRequested must be either free or full.",
    );
  }

  return {
    email: email!,
    companyName: readTrimmedString(
      payload.companyName,
      "companyName",
      MAX_COMPANY_NAME_CHARS,
    ),
    productName: readTrimmedString(
      payload.productName,
      "productName",
      MAX_PRODUCT_NAME_CHARS,
    ),
    productUrl: readTrimmedString(
      payload.productUrl,
      "productUrl",
      MAX_PRODUCT_URL_CHARS,
    ),
    buyerIntentQuery: readTrimmedString(
      payload.buyerIntentQuery,
      "buyerIntentQuery",
      MAX_BUYER_QUERY_CHARS,
    ),
    source,
    auditModeRequested,
  };
}
