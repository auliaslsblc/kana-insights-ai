import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * ===== INIT GEMINI =====
 */

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ VITE_GEMINI_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

/**
 * ===== TYPES =====
 */

export interface Mention {
  id: string;
  source: string;
  content: string;
  date: string;
  author: string;
  reach: number;
}

export interface SentimentAnalysis {
  mentionId: string;
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  explanation: string;
  keywords: string[];
  entity?: string;
}

export interface DashboardInsights {
  summary: string;
  recommendations: string[];
  trendAnalysis: string;
}

/**
 * ===== HELPER: SAFE JSON PARSER =====
 */
function safeJSONParse<T>(text: string, fallback: T): T {
  if (typeof text !== 'string' || !text.trim().length) {
    return fallback;
  }
  try {
    // Bersihkan kemungkinan ```json ``` wrapper
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned);
  } catch (e) {
    console.error("❌ Failed to parse JSON:", e);
    return fallback;
  }
}

/**
 * ===== ANALYZE SENTIMENT =====
 */
export const analyzeSentiment = async (
  mentions: Mention[]
): Promise<SentimentAnalysis[]> => {
  if (!apiKey) return [];

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest",
  });

  const analyzeMention = async (mention: Mention): Promise<SentimentAnalysis> => {
    const prompt = `
Analyze the sentiment of the following review for "Kana Coffee".
The review is from the platform: ${mention.source}.

Review: "${mention.content}"

Return ONLY a valid JSON object with the following structure.
Do not include any other text or markdown.

{
  "mentionId": "${mention.id}",
  "sentiment": "positive" | "neutral" | "negative",
  "score": number,
  "explanation": "A brief explanation of why this sentiment was chosen.",
  "keywords": ["list", "of", "keywords"],
  "entity": "The main topic discussed, e.g., 'Service', 'Price', 'Quality', 'Ambiance', 'General'."
}
`;
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      // Use a fallback that includes the original mentionId
      return safeJSONParse<SentimentAnalysis>(text, {
        mentionId: mention.id,
        sentiment: 'neutral',
        score: 0,
        explanation: 'Failed to parse model output.',
        keywords: [],
        entity: 'General'
      });
    } catch (error) {
      console.error(`Error analyzing mention ${mention.id}:`, error);
      // Return a default object on error
      return {
        mentionId: mention.id,
        sentiment: 'neutral',
        score: 0,
        explanation: 'An API error occurred.',
        keywords: [],
        entity: 'General'
      };
    }
  };

  const results = await Promise.all(mentions.map(analyzeMention));
  return results;
};

/**
 * ===== DASHBOARD INSIGHTS =====
 */
export const getDashboardInsights = async (
  mentions: Mention[],
  analyses: SentimentAnalysis[]
): Promise<DashboardInsights> => {
  if (!apiKey) {
    return {
      summary: "API key missing.",
      recommendations: [],
      trendAnalysis: "Trend analysis unavailable.",
    };
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-latest",
  });

  const dataContext = mentions.map((m) => {
    const analysis = analyses.find((a) => a.mentionId === m.id);
    return {
      content: m.content,
      sentiment: analysis?.sentiment,
      score: analysis?.score,
    };
  });

  const prompt = `
Based on the following media intelligence data for "Kana Coffee",
return ONLY a valid JSON object:

{
  "summary": string,
  "recommendations": ["string"],
  "trendAnalysis": string
}

Data:
${JSON.stringify(dataContext)}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return safeJSONParse<DashboardInsights>(text, {
    summary: "Unable to generate summary.",
    recommendations: [],
    trendAnalysis: "Trend analysis unavailable.",
  });
};
