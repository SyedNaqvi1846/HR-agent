import { GoogleGenAI } from "@google/genai";

export function getGenAIClient(customApiKey?: string): GoogleGenAI {
  const apiKey = (customApiKey || "").trim() || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not defined in environment variables. Please add GEMINI_API_KEY to your Vercel Dashboard (Settings > Environment Variables) or provide an API Key."
    );
  }
  return new GoogleGenAI({ apiKey });
}

export function extractEmailFromRawText(text: string): string {
  if (!text) return "";
  const emailRegex = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
  const matches = text.match(emailRegex);
  if (matches && matches.length > 0) {
    for (const m of matches) {
      const clean = m.trim().replace(/[.,;:]$/, "");
      if (!clean.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp|pdf)$/)) {
        return clean;
      }
    }
  }
  return "";
}
