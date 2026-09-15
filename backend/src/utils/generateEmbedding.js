// backend/src/utils/generateEmbedding.js
// Reusable helper that calls Google's text-embedding-004 model via the
// Gemini REST API and returns a 768-dimensional float[] vector.
// Throws on any failure so callers can decide how to degrade gracefully.
import dotenv from "dotenv";
dotenv.config();

const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

/**
 * Generate a 768-dimensional embedding vector for the given text.
 * @param {string} text - The text to embed (max ~2048 tokens).
 * @returns {Promise<number[]>} - Float array of length 768.
 */
export async function generateEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment.");

  const response = await fetch(`${GEMINI_EMBED_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`Gemini embedding API error (${response.status}): ${err.slice(0, 300)}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values;

  if (!Array.isArray(values) || values.length !== 768) {
    throw new Error(
      `Unexpected embedding shape: got ${Array.isArray(values) ? values.length : typeof values} values, expected 768.`
    );
  }

  return values;
}
