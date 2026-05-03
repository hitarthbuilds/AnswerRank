import "server-only";

import { getServerEnv } from "@/lib/server/env";
import { createTimeoutController, getErrorMessage } from "@/lib/providers/utils";

export type FirecrawlResult = {
  url: string;
  title?: string;
  markdown?: string;
  text?: string;
  success: boolean;
  error?: string;
};

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";
const MAX_CONTEXT_LENGTH = 5_000;

function truncateContent(value: string | undefined, maxLength = MAX_CONTEXT_LENGTH) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/\s+\n/g, "\n").trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractContext(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as {
    success?: boolean;
    data?: {
      markdown?: string;
      html?: string;
      metadata?: {
        title?: string;
      };
      warning?: string;
    };
  };

  if (!data.success || !data.data) {
    return null;
  }

  const markdown = truncateContent(data.data.markdown);
  const text = markdown
    ? undefined
    : truncateContent(
        typeof data.data.html === "string" ? stripHtml(data.data.html) : undefined,
      );

  if (!markdown && !text) {
    return null;
  }

  return {
    title: data.data.metadata?.title?.trim() || undefined,
    markdown,
    text,
  };
}

export async function extractProductContext(
  productUrl: string,
): Promise<FirecrawlResult> {
  const trimmedUrl = productUrl.trim();

  if (!trimmedUrl) {
    return {
      url: "",
      success: false,
      error: "Product URL was not provided.",
    };
  }

  const { firecrawlApiKey } = getServerEnv();

  if (!firecrawlApiKey) {
    return {
      url: trimmedUrl,
      success: false,
      error: "Firecrawl is not configured for this environment.",
    };
  }

  const { signal, cleanup } = createTimeoutController();

  try {
    const response = await fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify({
        url: trimmedUrl,
        formats: ["markdown", "html"],
        onlyMainContent: true,
        removeBase64Images: true,
        blockAds: true,
        timeout: 20_000,
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Firecrawl scrape failed with ${response.status}${body ? `: ${body}` : ""}`,
      );
    }

    const payload = await response.json();
    const extracted = extractContext(payload);

    if (!extracted) {
      throw new Error("Firecrawl returned no usable markdown or text.");
    }

    return {
      url: trimmedUrl,
      title: extracted.title,
      markdown: extracted.markdown,
      text: extracted.text,
      success: true,
    };
  } catch (error) {
    return {
      url: trimmedUrl,
      success: false,
      error: getErrorMessage(error, "Firecrawl scrape failed"),
    };
  } finally {
    cleanup();
  }
}
