
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from "../types";

export const analyzeImage = async (base64Image: string): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const base64Data = base64Image.split(',')[1] || base64Image;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data,
          },
        },
        {
          text: `Act as a professional creative director and Stock Photography SEO expert. Analyze this image and generate:
          1. 10 professional and trending taglines. Ensure a high diversity in tone: include options that are playful, sophisticated, urgent, inspirational, minimalist, and storytelling-driven.
          2. 50 highly relevant keywords. 
             - For EACH keyword, provide a relevance score (1-100) and specify which platforms it is BEST suited for (Adobe Stock, Shutterstock, Freepik).
             - CRITICAL: When assigning the relevance score, meticulously consider the specificity of the term and its potential commercial search volume. High scores (80-100) must be reserved for terms that are both highly specific to the image and likely to be high-value search queries.
             - Include a mix of descriptive, conceptual, and technical terms.
             - Keywords should be single words or short phrases.
          3. A short, vivid description of the visual mood.
          4. Top 3 social media platforms where this visual would perform best.
          
          Return the response strictly in JSON format.`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          taglines: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          keywords: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                relevance: { type: Type.NUMBER },
                platforms: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING, enum: ['Adobe Stock', 'Shutterstock', 'Freepik'] }
                }
              },
              required: ["word", "relevance", "platforms"]
            }
          },
          description: { type: Type.STRING },
          platforms: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["taglines", "keywords", "description", "platforms"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from AI");

  try {
    return JSON.parse(text) as GeminiResponse;
  } catch (err) {
    console.error("Failed to parse JSON:", text);
    throw new Error("Invalid format received from AI");
  }
};
