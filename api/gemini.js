import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { prompt } = req.body;

    // Validate prompt
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ error: "Prompt is required and must be a non-empty string." });
    }

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY environment variable is not set");
      return res.status(500).json({ error: "Server configuration error. API key missing." });
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const reply = response.text();

    // Return successful response
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Gemini API error:", error);
    
    // Handle specific Gemini errors
    if (error.message?.includes("API key")) {
      return res.status(401).json({ error: "Invalid API key or authentication failed." });
    }
    
    if (error.message?.includes("quota") || error.message?.includes("limit")) {
      return res.status(429).json({ error: "API quota exceeded. Please try again later." });
    }
    
    // Generic error
    return res.status(500).json({ 
      error: "Failed to generate AI response. Please try again.",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
}
