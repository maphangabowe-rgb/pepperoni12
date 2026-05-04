import { GoogleGenAI } from "@google/genai";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini
let genAI: GoogleGenAI | null = null;
function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. AI critiques will use fallback responses.");
      return null;
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Critique API
  app.post("/api/critique", async (req, res) => {
    const { content, mood } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "No content to critique!" });
    }

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ response: "Oven's a bit cold today, but that's a spicy rant!" });
      }

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are Chef Pepperoni, the spicy and witty master chef of the 'Pepperoni' rant oven. 
        A user just submitted a rant with mood ${mood || "angry"}:
        "${content}"
        
        Respond with a short (1-2 sentences), spicy, kitchen-themed comment. Acknowledge their heat but keep it witty.
        Example: "Whoa, that's a spicy one! This rant is perfectly charred, just the way I like it."`,
      });

      res.json({ response: result.text?.trim() || "Bake it longer next time!" });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "The oven smoked up! Please try again." });
    }
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Pepperoni oven is preheated!" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Chef Pepperoni is serving at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("The oven failed to ignite:", err);
});
