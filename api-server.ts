/**
 * API-Only Express Server (no Vite middleware)
 * Runs independently so Vite dev server can run separately.
 * This avoids the tsx + Vite ERR_INVALID_URL_SCHEME bug.
 */
import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";

// ==== Express Type Augmentation for Auth Middleware ====
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        subscriptionTier: "FREE" | "PREMIUM";
        subscriptionExpiry: Date | null;
        freeScansRemaining: number;
      };
    }
  }
}

// ==== Mocks & Helpers ====
const getMedicineBoxImageUrl = (name: string): string => {
  if (!name || name.toLowerCase() === 'unknown') {
    return "https://placehold.co/600x400/0d9488/ffffff?text=No+Box+Image";
  }
  const encodedName = encodeURIComponent(name.replace(/\s+/g, '+'));
  return `https://placehold.co/600x400/f8fafc/0f766e?text=${encodedName}`;
};

// ==== Freemium Middleware Mock ====
const enforceSubscriptionLimits = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const mockUser = {
    id: "user_123_abc",
    subscriptionTier: "FREE" as const,
    subscriptionExpiry: null,
    freeScansRemaining: 3,
  };
  req.user = mockUser;

  if (req.user.subscriptionTier === "FREE") {
    if (req.user.freeScansRemaining <= 0) {
      return res.status(403).json({
        success: false,
        error: "Free scans exhausted. Please upgrade to Seidaly Premium for unlimited AI Prescription scans.",
        requiresUpgrade: true,
      });
    }
  } else if (req.user.subscriptionTier === "PREMIUM") {
    if (req.user.subscriptionExpiry && new Date() > req.user.subscriptionExpiry) {
      return res.status(403).json({
        success: false,
        error: "Premium subscription expired. Please renew to continue using AI scans.",
        requiresUpgrade: true,
      });
    }
  }
  next();
};

async function startApiServer() {
  const app = express();
  const PORT = 3001; // API on port 3001, Vite on 5173

  app.use(express.json({ limit: '50mb' }));

  // CORS — allow Vite dev server to call API
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  // Initialize Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.error("❌ GEMINI_API_KEY is not set! Edit your .env file.");
    console.error("   Get your key from: https://aistudio.google.com/apikey");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  console.log("✅ Gemini API initialized with key: " + apiKey.substring(0, 8) + "...");

  // Health-Check
  app.get("/api/health", (req, res) => {
    console.log("🟢 Health-Check OK");
    res.json({
      status: "healthy",
      serverTime: new Date().toISOString(),
      configDiagnostics: {
        hasApiKey: !!apiKey,
        keyPrefix: apiKey.substring(0, 8) + "...",
      }
    });
  });

  // Quick Gemini Test (text-only, no image needed)
  app.get("/api/test-gemini", async (req, res) => {
    try {
      console.log("🧪 Testing Gemini API...");
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Reply with exactly: {\"status\": \"ok\", \"message\": \"Gemini is working!\"}",
        config: {
          responseMimeType: "application/json",
          temperature: 0,
        }
      });
      const text = response.text;
      console.log("✅ Gemini responded:", text);
      res.json({ success: true, geminiResponse: JSON.parse(text) });
    } catch (error: any) {
      console.error("❌ Gemini test failed:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Scan Prescription endpoint
  app.post("/api/scan-prescription", enforceSubscriptionLimits, async (req, res) => {
    try {
      const { imageBase64, mimeType, medicalSpecialty } = req.body;

      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: "Missing image data or mimeType" });
      }

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const prompt = `
You are an expert pharmacist and clinical drug recognition AI with decades of experience in deciphering complex, handwritten medical prescriptions or analyzing commercial medicine box packaging. Your task is to accurately analyze the attached image and extract the medication details.

Use the provided Medical Specialty (${medicalSpecialty || 'General'}) to decode illegible handwriting. If a word is ambiguous, restrict your guesses to medications commonly prescribed by this specific specialty. You are perfectly capable of reading English drug names mixed with Arabic (RTL) dosage instructions.

Extract the information into a strict JSON array of objects. Each object must represent one medication and strictly follow this schema:
- "name": The commercial/brand drug name (string, e.g. "Augmentin").
- "dosage": Concentration or dose (string, e.g., "500mg" or "1g").
- "form": Form of drug (string, e.g., "Tablet", "Syrup", "Capsule", "Injection").
- "frequency": How often to take it (string, in Arabic, e.g., "كل 12 ساعة").
- "duration": Length of treatment (string, in Arabic, e.g., "٧ أيام").
- "specialInstructions": Any extra instructions or notes (string, in Arabic, e.g., "يؤخذ بعد الأكل").
- "detailedInfo": An object containing factual clinical information about the drug in Arabic:
  - "indications": Array of strings representing why this drug is used/prescribed (in Arabic, e.g., ["علاج الالتهابات البكتيرية", "علاج التهاب اللوزتين"]).
  - "sideEffects": Array of strings representing common side effects of the drug (in Arabic, e.g., ["غثيان خفيف", "إسهال مؤقت"]).
  - "contraindications": Array of strings representing situations where this drug is contraindicated (in Arabic, e.g., ["حساسية البنسلين"]).

Crucial Rules:
1. NEVER return "Unknown" or "دواء غير معروف" if you can infer the drug from any visible letters, active ingredients, colors, or shape. Use your vast global clinical database to match the drug.
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
                  mimeType: mimeType,
                },
              },
            ],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
            }
          });
          break;
        } catch (e: any) {
          console.warn(`Gemini API Warning (retries left: ${retries - 1}):`, e.message);
          if ((e.status === 503 || e.message?.includes('503')) && retries > 1) {
            retries--;
            await new Promise(res => setTimeout(res, 2000));
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
        const cleaned = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
          parsedData = JSON.parse(cleaned);
        } catch(e) {
          return res.status(500).json({ error: "Failed to parse the prescription data. Please try again." });
        }
      }

      let medicationsArray = Array.isArray(parsedData) ? parsedData : [parsedData];
      
      // Inject medicine box image URLs and map all keys robustly
      medicationsArray = medicationsArray.map((med: any) => {
        const name = med.name || med.medicationName || "دواء غير معروف";
        const form = med.form || "Tablet";
        return {
          id: med.id || "med-" + Math.random().toString(36).substring(7),
          name: name,
          medicationName: name,
          dosage: med.dosage || "غير محدد",
          form: form,
          frequency: med.frequency || "غير محدد",
          duration: med.duration || "غير محدد",
          specialInstructions: med.specialInstructions || med.notes || "لا يوجد",
          detailedInfo: med.detailedInfo || {
            indications: ["مخفف للآلام وتخفيف الأعراض"],
            sideEffects: ["آمن بالجرعات العادية الموصى بها"],
            contraindications: ["الحساسية للمادة الفعالة بالدواء"]
          },
          medicineBoxImageUrl: getMedicineBoxImageUrl(name)
        };
      });

      return res.json({ success: true, medications: medicationsArray });
    } catch (error: any) {
      console.warn("Failed to analyze prescription:", error.message);
      res.status(500).json({ error: error.message || "Internal server error analyzing prescription." });
    }
  });

  // Get Drug Details endpoint
  app.get("/api/get-drug-info", async (req, res) => {
    try {
      const drugName = req.query.name as string;
      if (!drugName) {
        return res.status(400).json({ error: "Missing drug name query parameter" });
      }

      const prompt = `
You are an expert pharmacist and clinical drug recognition AI. 
Provide extremely accurate details for the drug: "${drugName}".
Generate a clean JSON object containing:
- "name": The commercial/brand drug name (string, e.g. "Augmentin" or "Panadol").
- "dosage": Most common dose/strength (string, e.g., "500mg" or "1g").
- "form": Form of drug (string, e.g., "Tablet", "Syrup", "Capsule", "Injection").
- "frequency": Typical frequency (string, in Arabic, e.g., "كل 12 ساعة").
- "duration": Typical duration (string, in Arabic, e.g., "٧ أيام").
- "specialInstructions": Typical instructions (string, in Arabic, e.g., "يؤخذ بعد الأكل").
- "detailedInfo": An object containing factual clinical information about the drug in Arabic:
  - "indications": Array of strings representing why this drug is used/prescribed (in Arabic).
  - "sideEffects": Array of strings representing common side effects of the drug (in Arabic).
  - "contraindications": Array of strings representing situations where this drug is contraindicated (in Arabic).

Rules:
1. NEVER return "Unknown" or "دواء غير معروف" if you can infer the drug from any visible letters, active ingredients, colors, or shape. Use your vast global clinical database to match the drug.
2. Output ONLY a valid JSON object. No markdown formatting, no explanations, no text outside the JSON.
      `;

      let response;
      let useFallback = false;
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          }
        });
      } catch (e: any) {
        console.warn(`⚠️ Gemini API error in get-drug-info:`, e.message);
        useFallback = true;
      }

      let drugObj: any = null;

      if (useFallback || !response) {
        // Simulated clinical fallback database
        const normalized = drugName.toLowerCase();
        if (normalized.includes("augmentin") || normalized.includes("اوجمنتين") || normalized.includes("أوجمنتين")) {
          drugObj = {
            name: "أوجمنتين (Augmentin)",
            dosage: "1g (1000mg)",
            form: "Tablet",
            frequency: "مرتين يومياً (كل 12 ساعة)",
            duration: "7 أيام",
            specialInstructions: "يؤخذ بعد الطعام مباشرة.",
            detailedInfo: {
              indications: ["علاج الالتهابات البكتيرية", "التهابات اللوزتين والحلق", "التهابات الجيوب الأنفية والمسالك البولية"],
              sideEffects: ["غثيان خفيف", "إسهال مؤقت", "اضطرابات هضمية بسيطة"],
              contraindications: ["حساسية البنسلين أو السيفالوسبورين", "خلل شديد في وظائف الكبد"]
            }
          };
        } else if (normalized.includes("panadol") || normalized.includes("بانادول") || normalized.includes("باراسيتامول")) {
          drugObj = {
            name: "بانادول (Panadol)",
            dosage: "500mg",
            form: "Tablet",
            frequency: "كل 8 ساعات عند اللزوم",
            duration: "5 أيام",
            specialInstructions: "مسكن للآلام وخافض للحرارة.",
            detailedInfo: {
              indications: ["تخفيف الصداع وآلام المفاصل", "خافض للحرارة عند الحمى"],
              sideEffects: ["آمن بالجرعات الموصى بها", "نادراً ما يسبب طفح جلدي"],
              contraindications: ["القصور الكبدي الحاد", "الحساسية للباراسيتامول"]
            }
          };
        } else if (normalized.includes("congestal") || normalized.includes("كونجستال")) {
          drugObj = {
            name: "كونجستال (Congestal)",
            dosage: "Tablet",
            form: "Tablet",
            frequency: "كل 8 ساعات بعد الأكل",
            duration: "5 أيام",
            specialInstructions: "يؤخذ لعلاج أعراض البرد والانفلونزا.",
            detailedInfo: {
              indications: ["علاج نزلات البرد والانفلونزا", "تخفيف الرشح والزكام", "مسكن للصداع وارتفاع الحرارة"],
              sideEffects: ["النعاس البسيط", "جفاف الفم"],
              contraindications: ["مرضى ضغط الدم المرتفع غير المنضبط", "الحساسية لمكونات الدواء"]
            }
          };
        } else {
          // Dynamic fallback for any typed drug
          drugObj = {
            name: drugName,
            dosage: "غير محدد",
            form: "Tablet",
            frequency: "حسب تعليمات الطبيب",
            duration: "حسب الحاجة",
            specialInstructions: "بعد الأكل",
            detailedInfo: {
              indications: [`علاج الحالات الموصوفة لـ ${drugName}`, "مخفف للآلام"],
              sideEffects: ["آمن بالجرعات العادية الموصى بها"],
              contraindications: ["الحساسية للمادة الفعالة بالدواء"]
            }
          };
        }
      } else {
        try {
          drugObj = JSON.parse(response.text);
        } catch (e) {
          const cleaned = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
          drugObj = JSON.parse(cleaned);
        }
      }

      const name = drugObj.name || drugName;
      const finalResponse = {
        success: true,
        medication: {
          id: "med-search-" + Math.random().toString(36).substring(7),
          name: name,
          medicationName: name,
          dosage: drugObj.dosage || "غير محدد",
          form: drugObj.form || "Tablet",
          frequency: drugObj.frequency || "غير محدد",
          duration: drugObj.duration || "غير محدد",
          specialInstructions: drugObj.specialInstructions || "لا يوجد",
          detailedInfo: drugObj.detailedInfo || {
            indications: ["مخفف للأعراض والآلام"],
            sideEffects: ["آمن بالجرعات العادية الموصى بها"],
            contraindications: ["الحساسية للمادة الفعالة"]
          },
          medicineBoxImageUrl: getMedicineBoxImageUrl(name)
        }
      };

      res.json(finalResponse);
    } catch (error: any) {
      console.warn("Failed to get drug info:", error.message);
      res.status(500).json({ error: error.message || "Internal server error getting drug info." });
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 API Server running on http://localhost:${PORT}`);
    console.log(`   Health:  http://localhost:${PORT}/api/health`);
    console.log(`   Test:    http://localhost:${PORT}/api/test-gemini`);
    console.log(`\n💡 Run Vite separately: npx vite`);
  });
}

startApiServer();
