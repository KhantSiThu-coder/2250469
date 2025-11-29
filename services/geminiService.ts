import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysisResult } from "../types";

const apiKey = process.env.API_KEY;

// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey: apiKey });

/**
 * Converts a File object to a Base64 string.
 */
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeItemImage = async (imageFile: File): Promise<GeminiAnalysisResult> => {
  if (!apiKey) {
    console.warn("API Key is missing. Skipping AI analysis.");
    throw new Error("API Key is missing.");
  }

  try {
    const imagePart = await fileToGenerativePart(imageFile);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          imagePart,
          {
            text: `Analyze this image of a shopping item. 
            Identify the product name.
            Classify it strictly into one of these groups: 'Cooking Ingredients', 'Food & Drinks', 'Clothing', 'Electronics', 'Others'.
            Estimate price in Japanese Yen (numeric only). If price is not visible or unknown, return null.
            Provide a short visual description for notes.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            price: { type: Type.NUMBER, nullable: true },
            notes: { type: Type.STRING },
          },
          required: ["name", "category", "price", "notes"],
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as GeminiAnalysisResult;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};
