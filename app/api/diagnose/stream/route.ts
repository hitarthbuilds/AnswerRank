import { rateLimitOrThrow, RateLimitError } from "@/lib/server/rate-limit";
import { generateDiagnoseResponse } from "@/lib/server/diagnose";
import {
  InputValidationError,
  validateDiagnosticInput,
} from "@/lib/server/validate-diagnostic-input";

function formatSseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response(
      formatSseEvent("error", { error: "Invalid JSON body." }),
      {
        status: 400,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(formatSseEvent(event, data)));
      };

      try {
        send("status", {
          stage: "validating",
          message: "Validating product and buyer query",
        });
        const normalizedRequest = validateDiagnosticInput(body);

        await rateLimitOrThrow(request, {
          route: "diagnose-stream-free",
          limit: 5,
          windowMs: 60 * 60 * 1000,
          email: normalizedRequest.leadEmail,
        });

        const result = await generateDiagnoseResponse(
          {
            ...normalizedRequest,
            auditMode: normalizedRequest.auditMode ?? "free",
          },
          {
            onStatus: ({ stage, message }) => {
              send("status", { stage, message });
            },
            onQueryExpanded: (queries) => {
              send("query_expanded", { queries });
            },
            onProviderStart: ({ provider, queryId }) => {
              send("provider_start", { provider, queryId });
            },
            onProviderDone: ({ provider, queryId, success, skipped }) => {
              send("provider_done", { provider, queryId, success, skipped });
            },
          },
        );

        send("scoring", {
          stage: "scoring",
          message: "Calculating AI visibility score",
        });
        send("result", result);
        send("done", { ok: true });
      } catch (error) {
        if (error instanceof InputValidationError) {
          send("error", { error: error.message });
        } else if (error instanceof RateLimitError) {
          send("error", {
            error: "Rate limit exceeded",
            message:
              "You have reached the free diagnostic limit. Try again later or request a full AI visibility audit.",
          });
        } else {
          send("error", {
            error: "Unable to run the diagnostic right now.",
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
