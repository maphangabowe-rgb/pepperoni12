import { GoogleGenAI } from "@google/genai";

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export async function generatePepperoniResponse(rantContent: string, mood: string) {
  try {
    const ai = getGenAI();
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are Chef Pepperoni, the spicy and witty master chef of the 'Pepperoni' rant oven. 
      A user just submitted a rant with mood ${mood}:
      "${rantContent}"
      
      Respond with a short (1-2 sentences), spicy, kitchen-themed comment. Acknowledge their heat but keep it witty.
      Example: "Whoa, that's a spicy one! This rant is perfectly charred, just the way I like it."`,
    });

    return result.text?.trim() || "This rant is so hot it broke the oven! Keep browning those frustrations.";
  } catch (error) {
    console.error("Error generating Pepperoni response:", error);
    return "This rant is so hot it broke the oven! Keep browning those frustrations.";
  }
}
