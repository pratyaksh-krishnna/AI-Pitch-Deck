import OpenAI from "openai";

// One shared client for the whole app — we create it once and reuse it.
let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in .env — create one at https://platform.openai.com/api-keys");
  }
  openaiClient ??= new OpenAI({ apiKey });
  return openaiClient;
}
