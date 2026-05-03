import "server-only";

import { buildShoppingAssistantPrompt } from "@/lib/prompts";
import { getServerEnv } from "@/lib/server/env";
import type { ProviderInput, ProviderResult } from "@/lib/providers/types";
import { createTimeoutController, getErrorMessage } from "@/lib/providers/utils";

const GEMINI_MODEL = "gemini-3-flash-preview";

function extractGeminiText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const text = data.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text?.trim())
    .filter(Boolean)
    .join("\n")
    .trim();

  return text || null;
}

export async function runGeminiProvider(
  input: ProviderInput,
): Promise<ProviderResult> {
  const { geminiApiKey } = getServerEnv();

  if (!geminiApiKey) {
    return { ok: false, skipped: true, provider: "gemini" };
  }

  const { signal, cleanup } = createTimeoutController();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildShoppingAssistantPrompt(input),
                },
              ],
            },
          ],
        }),
        signal,
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Gemini request failed with ${response.status}${body ? `: ${body}` : ""}`,
      );
    }

    const payload = await response.json();
    const rawResponse = extractGeminiText(payload);

    if (!rawResponse) {
      throw new Error("Gemini returned an empty text response.");
    }

    return {
      ok: true,
      output: {
        provider: "gemini",
        rawResponse,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        provider: "gemini",
        message: getErrorMessage(error, "Gemini request failed"),
      },
    };
  } finally {
    cleanup();
  }
}
