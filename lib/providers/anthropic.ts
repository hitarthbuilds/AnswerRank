import "server-only";

import { buildShoppingAssistantPrompt } from "@/lib/prompts";
import { getServerEnv } from "@/lib/server/env";
import type { ProviderInput, ProviderResult } from "@/lib/providers/types";
import { createTimeoutController, getErrorMessage } from "@/lib/providers/utils";

const ANTHROPIC_MODEL = "claude-sonnet-4-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

function extractAnthropicText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as {
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  };

  const text = data.content
    ?.filter((item) => item.type === "text")
    .map((item) => item.text?.trim())
    .filter(Boolean)
    .join("\n")
    .trim();

  return text || null;
}

export async function runAnthropicProvider(
  input: ProviderInput,
): Promise<ProviderResult> {
  const { anthropicApiKey } = getServerEnv();

  if (!anthropicApiKey) {
    return { ok: false, skipped: true, provider: "anthropic" };
  }

  const { signal, cleanup } = createTimeoutController();

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 700,
        messages: [
          {
            role: "user",
            content: buildShoppingAssistantPrompt(input),
          },
        ],
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Anthropic request failed with ${response.status}${body ? `: ${body}` : ""}`,
      );
    }

    const payload = await response.json();
    const rawResponse = extractAnthropicText(payload);

    if (!rawResponse) {
      throw new Error("Anthropic returned an empty text response.");
    }

    return {
      ok: true,
      output: {
        provider: "anthropic",
        rawResponse,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        provider: "anthropic",
        message: getErrorMessage(error, "Anthropic request failed"),
      },
    };
  } finally {
    cleanup();
  }
}
