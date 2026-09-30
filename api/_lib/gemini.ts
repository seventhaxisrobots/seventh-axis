// Gemini generateContent over REST with structured JSON output.

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODELS = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];
// Unknown model, quota exhausted or overloaded: another model may still answer.
const TRY_NEXT_MODEL = new Set([404, 429, 500, 503]);

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

interface GenerateOptions {
  system: string;
  prompt: string;
  schema: unknown;
  timeoutMs: number;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  error?: { message?: string };
}

export async function generateJson({ system, prompt, schema, timeoutMs }: GenerateOptions): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL, ...DEFAULT_MODELS] : DEFAULT_MODELS;
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  for (const model of [...new Set(models)]) {
    // Newer models take a JSON Schema and a thinking level; older ones reject
    // those fields, so retry with the plain JSON mime type before moving on.
    for (const strict of [true, false]) {
      const generationConfig: Record<string, unknown> = { responseMimeType: "application/json" };
      if (strict) {
        generationConfig.responseJsonSchema = schema;
        generationConfig.thinkingConfig = { thinkingLevel: "low" };
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) throw lastError ?? new Error("Gemini timed out");

      const res = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
        }),
        signal: AbortSignal.timeout(remaining),
      });

      const body = (await res.json().catch(() => ({}))) as GeminiResponse;
      if (res.ok) {
        const text = (body.candidates?.[0]?.content?.parts ?? [])
          .filter((p) => !p.thought && typeof p.text === "string")
          .map((p) => p.text)
          .join("");
        return JSON.parse(stripFences(text));
      }

      lastError = new Error(`Gemini ${model} responded ${res.status}: ${body.error?.message ?? "unknown error"}`);
      if (TRY_NEXT_MODEL.has(res.status)) break;
      if (res.status !== 400) throw lastError; // bad key or permissions won't improve on retry
    }
  }
  throw lastError;
}

function stripFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}
