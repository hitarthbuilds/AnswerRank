import "server-only";

import type { ProviderId } from "@/lib/types";
import { runAnthropicProvider } from "@/lib/providers/anthropic";
import { runGeminiProvider } from "@/lib/providers/gemini";
import { runOpenAIProvider } from "@/lib/providers/openai";
import type {
  ProviderError,
  ProviderInput,
  ProviderOutput,
  ProviderResult,
} from "@/lib/providers/types";

export async function runProviders(
  input: ProviderInput,
  allowedProviders: ProviderId[] = ["openai", "gemini", "anthropic"],
): Promise<{
  outputs: ProviderOutput[];
  errors: ProviderError[];
  skipped: ProviderOutput["provider"][];
}> {
  const tasks: Promise<ProviderResult>[] = [];

  if (allowedProviders.includes("openai")) {
    tasks.push(runOpenAIProvider(input));
  }

  if (allowedProviders.includes("gemini")) {
    tasks.push(runGeminiProvider(input));
  }

  if (allowedProviders.includes("anthropic")) {
    tasks.push(runAnthropicProvider(input));
  }

  const results = await Promise.all<ProviderResult>(tasks);

  const outputs: ProviderOutput[] = [];
  const errors: ProviderError[] = [];
  const skipped: ProviderOutput["provider"][] = [];

  for (const result of results) {
    if (result.ok) {
      outputs.push(result.output);
      continue;
    }

    if ("skipped" in result) {
      skipped.push(result.provider);
      continue;
    }

    if ("error" in result) {
      errors.push(result.error);
    }
  }

  return { outputs, errors, skipped };
}
