import "server-only";

import { buildShoppingAssistantPrompt } from "@/lib/prompts";
import { getServerEnv } from "@/lib/server/env";
import type { ProviderInput, ProviderResult } from "@/lib/providers/types";
import { createTimeoutController, getErrorMessage } from "@/lib/providers/utils";

const OPENAI_MODEL = "gpt-5";
const OPENAI_URL = "https://api.openai.com/v1/responses";

function extractOpenAIText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        text?: string;
      }>;
    }>;
  };

  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const text = data.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text?.trim())
    .filter(Boolean)
    .join("\n")
    .trim();

  return text || null;
}

export async function runOpenAIProvider(
  input: ProviderInput,
): Promise<ProviderResult> {
  const { openaiApiKey } = getServerEnv();

  if (!openaiApiKey) {
    return { ok: false, skipped: true, provider: "openai" };
  }

  const { signal, cleanup } = createTimeoutController();

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: buildShoppingAssistantPrompt(input),
        reasoning: { effort: "minimal" },
        max_output_tokens: 600,
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `OpenAI request failed with ${response.status}${body ? `: ${body}` : ""}`,
      );
    }

    const payload = await response.json();
    const rawResponse = extractOpenAIText(payload);

    if (!rawResponse) {
      throw new Error("OpenAI returned an empty text response.");
    }

    return {
      ok: true,
      output: {
        provider: "openai",
        rawResponse,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        provider: "openai",
        message: getErrorMessage(error, "OpenAI request failed"),
      },
    };
  } finally {
    cleanup();
  }
}
