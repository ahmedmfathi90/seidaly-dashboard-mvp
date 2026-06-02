// api-server.ts
import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";
var getMedicineBoxImageUrl = (name) => {
  if (!name || name.toLowerCase() === "unknown") {
    return "https://placehold.co/600x400/0d9488/ffffff?text=No+Box+Image";
  }
  const encodedName = encodeURIComponent(name.replace(/\s+/g, "+"));
  return `https://placehold.co/600x400/f8fafc/0f766e?text=${encodedName}`;
};
var enforceSubscriptionLimits = async (req, res, next) => {
  const mockUser = {
    id: "user_123_abc",
    subscriptionTier: "FREE",
    subscriptionExpiry: null,
    freeScansRemaining: 3
  };
  req.user = mockUser;
  if (req.user.subscriptionTier === "FREE") {
    if (req.user.freeScansRemaining <= 0) {
      return res.status(403).json({
        success: false,
        error: "Free scans exhausted. Please upgrade to Seidaly Premium for unlimited AI Prescription scans.",
        requiresUpgrade: true
      });
    }
  } else if (req.user.subscriptionTier === "PREMIUM") {
    if (req.user.subscriptionExpiry && /* @__PURE__ */ new Date() > req.user.subscriptionExpiry) {
      return res.status(403).json({
        success: false,
        error: "Premium subscription expired. Please renew to continue using AI scans.",
        requiresUpgrade: true
      });
    }
  }
  next();
};
async function startApiServer() {
  const app = express();
  const PORT = 3001;
  app.use(express.json({ limit: "50mb" }));
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.error("\u274C GEMINI_API_KEY is not set! Edit your .env file.");
    console.error("   Get your key from: https://aistudio.google.com/apikey");
    process.exit(1);
  }
  const ai = new GoogleGenAI({ apiKey });
  console.log("\u2705 Gemini API initialized with key: " + apiKey.substring(0, 8) + "...");
  app.get("/api/health", (req, res) => {
    console.log("\u{1F7E2} Health-Check OK");
    res.json({
      status: "healthy",
      serverTime: (/* @__PURE__ */ new Date()).toISOString(),
      configDiagnostics: {
        hasApiKey: !!apiKey,
        keyPrefix: apiKey.substring(0, 8) + "..."
      }
    });
  });
  app.get("/api/test-gemini", async (req, res) => {
    try {
      console.log("\u{1F9EA} Testing Gemini API...");
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: 'Reply with exactly: {"status": "ok", "message": "Gemini is working!"}',
        config: {
          responseMimeType: "application/json",
          temperature: 0
        }
      });
      const text = response.text;
      console.log("\u2705 Gemini responded:", text);
      res.json({ success: true, geminiResponse: JSON.parse(text) });
    } catch (error) {
      console.error("\u274C Gemini test failed:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post("/api/scan-prescription", enforceSubscriptionLimits, async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: "Missing image data or mimeType" });
      }
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const prompt = `
You are an expert pharmacist with decades of experience in deciphering complex, handwritten medical prescriptions. Your task is to accurately analyze the attached prescription image and extract the medication details.

Extract the information into a strict JSON array of objects. Each object must represent one medication and strictly follow this schema:
- "medicationName": The drug name (string).
- "dosage": Concentration or dose (string, e.g., "500mg").
- "frequency": How often to take it (string, e.g., "Every 8 hours").
- "duration": Length of treatment (string, e.g., "5 days").
- "notes": Any extra instructions (string).

Rules:
1. If a field is unreadable, return null.
2. Output ONLY a valid JSON array. No markdown formatting, no explanations.
      `;
      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
              prompt,
              {
                inlineData: {
                  data: base64Data,
                  mimeType
                }
              }
            ],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1
            }
          });
          break;
        } catch (e) {
          console.warn(`Gemini API Warning (retries left: ${retries - 1}):`, e.message);
          if ((e.status === 503 || e.message?.includes("503")) && retries > 1) {
            retries--;
            await new Promise((res2) => setTimeout(res2, 2e3));
          } else {
            throw e;
          }
        }
      }
      if (!response) {
        throw new Error("Failed to get response from Gemini API");
      }
      const textOutput = response.text;
      let parsedData;
      try {
        parsedData = JSON.parse(textOutput);
      } catch (jsonErr) {
        console.warn("Failed to parse AI output as JSON:", textOutput, jsonErr);
        const cleaned = textOutput.replace(/```json/g, "").replace(/```/g, "").trim();
        try {
          parsedData = JSON.parse(cleaned);
        } catch (e) {
          return res.status(500).json({ error: "Failed to parse the prescription data. Please try again." });
        }
      }
      let medicationsArray = Array.isArray(parsedData) ? parsedData : [parsedData];
      medicationsArray = medicationsArray.map((med) => ({
        ...med,
        medicineBoxImageUrl: getMedicineBoxImageUrl(med.medicationName || med.name)
      }));
      return res.json({ success: true, medications: medicationsArray });
    } catch (error) {
      console.warn("Failed to analyze prescription:", error.message);
      res.status(500).json({ error: error.message || "Internal server error analyzing prescription." });
    }
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`
\u{1F680} API Server running on http://localhost:${PORT}`);
    console.log(`   Health:  http://localhost:${PORT}/api/health`);
    console.log(`   Test:    http://localhost:${PORT}/api/test-gemini`);
    console.log(`
\u{1F4A1} Run Vite separately: npx vite`);
  });
}
startApiServer();
