import OpenAI from "openai";

// OpenAI's built-in image models (same API key as the Agent SDK).
// gpt-image-1-mini = cheaper, good for learning
// gpt-image-1.5   = higher quality, costs more
const IMAGE_MODEL = "gpt-image-1-mini";
const IMAGE_SIZE = "1024x1024";

// One shared client for the whole app — we create it once and reuse it.
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY in .env — create one at https://platform.openai.com/api-keys",
    );
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

/**
 * Dev shortcut: use a free stock photo instead of calling OpenAI.
 * Enable with USE_PLACEHOLDER_IMAGES=true in .env
 */
async function fetchPlaceholderImage(): Promise<Buffer> {
  const response = await fetch("https://picsum.photos/1024/1024");

  if (!response.ok) {
    throw new Error("Could not download placeholder image");
  }

  const bytes = await response.arrayBuffer();
  return Buffer.from(bytes);
}

/**
 * Call OpenAI's image API and return the image as a Buffer (raw PNG bytes).
 *
 * GPT image models always return base64-encoded PNG data —
 * we decode it into a Buffer so ImageKit can upload it next.
 */
async function createImageWithOpenAI(prompt: string): Promise<Buffer> {
  const openai = getOpenAIClient();

  const response = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: IMAGE_SIZE,
  });

  const base64Image = response.data?.[0]?.b64_json;

  if (!base64Image) {
    throw new Error(
      "OpenAI returned no image — check your API credits or try again",
    );
  }

  return Buffer.from(base64Image, "base64");
}

/**
 * Generate one slide image from a text prompt.
 *
 * 1. If USE_PLACEHOLDER_IMAGES=true → stock photo (free, for local testing)
 * 2. Otherwise → OpenAI gpt-image model → PNG buffer for ImageKit upload
 */
export async function generateSlideImage(prompt: string): Promise<Buffer> {
  if (process.env.USE_PLACEHOLDER_IMAGES === "true") {
    return fetchPlaceholderImage();
  }

  return createImageWithOpenAI(prompt);
}
