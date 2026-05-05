import "server-only";

import type { LeadRequest } from "@/lib/types";
import { logUsageEvent } from "@/lib/server/usage-log";

type CaptureLeadInput = {
  lead: LeadRequest;
  clientIp?: string;
};

export async function captureLead({ lead, clientIp }: CaptureLeadInput) {
  const createdAt = new Date().toISOString();

  console.info(
    JSON.stringify({
      timestamp: createdAt,
      route: "/api/leads",
      type: "lead_capture",
      emailDomain: lead.email.split("@")[1] ?? null,
      companyName: lead.companyName ?? null,
      productName: lead.productName ?? null,
      productUrl: lead.productUrl ?? null,
      buyerIntentQuery: lead.buyerIntentQuery ?? null,
      source: lead.source,
      auditModeRequested: lead.auditModeRequested,
      storage: process.env.DATABASE_URL ? "log_only_database_pending" : "log_only",
    }),
  );

  logUsageEvent({
    route: "/api/leads",
    auditMode: lead.auditModeRequested,
    clientIp,
    productName: lead.productName,
    buyerIntentQuery: lead.buyerIntentQuery,
    success: true,
    leadEmail: lead.email,
  });

  return {
    ok: true,
    createdAt,
    message: "Full audit request received. We’ll send the next steps.",
  };
}
