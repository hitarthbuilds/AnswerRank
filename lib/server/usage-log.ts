import "server-only";

import { createHash } from "node:crypto";
import type { AuditMode, CacheStatus, ProviderId } from "@/lib/types";

function hashValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

type UsageLogInput = {
  route: string;
  auditMode: AuditMode;
  clientIp?: string;
  productName?: string;
  buyerIntentQuery?: string;
  expandedQueryCount?: number;
  providersUsed?: ProviderId[];
  providersSkipped?: ProviderId[];
  providersFailed?: string[];
  cacheStatus?: CacheStatus;
  success: boolean;
  errorType?: string;
  leadEmail?: string;
};

export function logUsageEvent(input: UsageLogInput) {
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      route: input.route,
      auditMode: input.auditMode,
      clientIpHash: hashValue(input.clientIp),
      productName: input.productName,
      buyerIntentQuery: input.buyerIntentQuery,
      expandedQueryCount: input.expandedQueryCount,
      providersUsed: input.providersUsed ?? [],
      providersSkipped: input.providersSkipped ?? [],
      providersFailed: input.providersFailed ?? [],
      cacheStatus: input.cacheStatus,
      success: input.success,
      errorType: input.errorType,
      leadEmailHash: hashValue(input.leadEmail?.toLowerCase()),
    }),
  );
}
