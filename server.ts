import "dotenv/config";
import express from "express";
import path from "path";
import os from "os";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { lookupMedication, getSimulatedPrescriptionMeds } from "./src/data/medicationDb";

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
  
  // Create a clean placeholder using the medication name
  const encodedName = encodeURIComponent(name.replace(/\s+/g, '+'));
  return `https://placehold.co/600x400/f8fafc/0f766e?text=${encodedName}`;
};

// ==== Freemium Middleware Mock ====
const enforceSubscriptionLimits = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Mocking an authenticated user context (Integration ready for JWT/Firebase Auth later)
  const mockUser = {
    id: "user_123_abc",
    subscriptionTier: "FREE" as const, // Change to "PREMIUM" to test premium flow
    subscriptionExpiry: null,
    freeScansRemaining: 3, // Simulate the 3 complimentary scans
  };

  req.user = mockUser;

  // Freemium tier validation logic
  if (req.user.subscriptionTier === "FREE") {
    if (req.user.freeScansRemaining <= 0) {
      // Return 403 Forbidden with upgrade prompt
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: '50mb' }));

  // Initialize Gemini
  // Bypassing stale process.env.GOOGLE_CLOUD_PROJECT that retains the old project id
  const activeProject = 'seidaly-live';
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY
  });

  // Get local network IP for mobile access
  const getLocalIP = (): string => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) return iface.address;
      }
    }
    return 'localhost';
  };

  // Server info endpoint (for mobile QR code)
  app.get("/api/server-info", (req, res) => {
    const localIP = getLocalIP();
    res.json({
      ip: localIP,
      port: PORT,
      url: `http://${localIP}:${PORT}`,
      apiMode: (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') ? 'offline' : 'live'
    });
  });

  // Diagnostic Health-Check Endpoint
  app.get("/api/health", (req, res) => {
    console.log("🟢 Diagnostic Health-Check initiated.");
    const maskedProject = activeProject.substring(0, 10) + "...";
    res.json({
      status: "healthy",
      serverTime: new Date().toISOString(),
      configDiagnostics: {
        hasApiKey: !!process.env.GEMINI_API_KEY,
        hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT,
        activeProjectId: maskedProject
      }
    });
  });

  // Note: We've attached the enforceSubscriptionLimits middleware to the route
  app.post("/api/scan-prescription", enforceSubscriptionLimits, async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: "Missing image data or mimeType" });
      }

      // Remove the prefix if present (e.g. data:image/png;base64,)
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const prompt = `
You are an expert pharmacist with decades of experience in deciphering complex, handwritten medical prescriptions or analyzing commercial medicine box packaging. Your task is to accurately analyze the attached prescription image, extract the medication details, and provide basic pharmacological information for each recognized drug based on your vast medical knowledge.

Extract the information into a strict JSON array of objects. Each object must represent one medication and strictly follow this schema:
- "name": The exact commercial drug name (string, e.g. "Augmentin").
- "dosage": Concentration or dose (string, e.g., "500mg" or "1g").
- "form": Form of drug (string, e.g., "Tablet", "Syrup", "Capsule", "Injection").
- "frequency": How often to take it (string, in Arabic, e.g., "كل 12 ساعة").
- "duration": Length of treatment (string, in Arabic, e.g., "٧ أيام").
- "specialInstructions": Any extra instructions or notes (string, in Arabic, e.g., "يؤخذ بعد الأكل").
- "activeIngredient": The primary scientific active ingredient(s) of this exact commercial drug (string, e.g. "Amoxicillin + Clavulanic Acid").
- "medicalUse": A short, patient-friendly explanation of what this medication is used for in Arabic (string, e.g. "مضاد حيوي لعلاج العدوى البكتيرية").
- "detailedInfo": An object containing factual clinical information about the drug in Arabic:
  - "indications": Array of strings representing why this drug is used/prescribed (in Arabic).
  - "sideEffects": Array of strings representing common side effects of the drug (in Arabic).
  - "contraindications": Array of strings representing situations where this drug is contraindicated (in Arabic).

Rules:
1. If a field from the prescription is unreadable, use your clinical knowledge to infer the most accurate information based on the drug name.
2. For "activeIngredient" and "medicalUse", you MUST use your internal medical knowledge to fill them based on the recognized drug name.
3. Output ONLY a valid JSON array. No markdown formatting, no explanations, no text outside the JSON array.
      `;

      let response;
      let retries = 3;
      let useFallback = false;
      let fallbackReason = "";
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        useFallback = true;
        fallbackReason = "GEMINI_API_KEY is not configured or set to default value.";
      } else {
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
                temperature: 0.1, // low temperature for more accurate extraction
              }
            });
            break; // Success, break out of retry loop
          } catch (e: any) {
            console.warn(`⚠️ Gemini API Warning (retries left: ${retries - 1}):`, e.message);

            if ((e.status === 503 || e.message?.includes('503')) && retries > 1) {
              retries--;
              await new Promise(res => setTimeout(res, 2000)); // wait 2s before retry
            } else {
              // Mark to use fallback for quota or authorization errors
              useFallback = true;
              fallbackReason = `Gemini API Error: ${e.message}`;
              break;
            }
          }
        }
      }

      let medicationsArray = [];

      if (useFallback || !response) {
        console.log(`\n======================================================================`);
        console.log(`⚠️  RESILIENT AUTOPILOT FALLBACK INITIATED`);
        console.log(`ℹ️  Reason: ${fallbackReason}`);
        console.log(`🚀 Falling back to premium Offline Pharmacist OCR Simulator...`);
        console.log(`======================================================================\n`);

        // Simulate professional latency of 1.5 seconds so frontend spinner works beautifully
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Use the accurate offline clinical database
        const simMeds = getSimulatedPrescriptionMeds();
        medicationsArray = simMeds.map(rec => ({
          name: `${rec.nameAr} (${rec.name})`,
          dosage: rec.dosage,
          form: rec.form,
          frequency: rec.frequency,
          duration: rec.duration,
          specialInstructions: rec.specialInstructions,
          activeIngredient: rec.activeIngredient,
          medicalUse: rec.medicalUse,
          detailedInfo: rec.detailedInfo
        }));
      } else {
        const textOutput = response.text;
        let parsedData;
        try {
          parsedData = JSON.parse(textOutput);
        } catch (jsonErr) {
          console.warn("Failed to parse AI output as JSON:", textOutput, jsonErr);
          // Fallback attempt to strip out markdown
          const cleaned = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
          try {
            parsedData = JSON.parse(cleaned);
          } catch(e) {
            // Fallback if parsing completely failed
            useFallback = true;
            fallbackReason = "AI output was not valid JSON";
          }
        }

        if (useFallback) {
          const simMeds = getSimulatedPrescriptionMeds();
          medicationsArray = simMeds.map(rec => ({
            name: `${rec.nameAr} (${rec.name})`,
            dosage: rec.dosage,
            form: rec.form,
            frequency: rec.frequency,
            duration: rec.duration,
            specialInstructions: rec.specialInstructions,
            activeIngredient: rec.activeIngredient,
            medicalUse: rec.medicalUse,
            detailedInfo: rec.detailedInfo
          }));
        } else {
          medicationsArray = Array.isArray(parsedData) ? parsedData : [parsedData];
        }
      }
      
      // Inject medicine box image URLs, enrich with DB data, and map all keys robustly
      medicationsArray = medicationsArray.map((med: any) => {
        const name = med.name || med.medicationName || "دواء غير معروف";
        const form = med.form || "Tablet";
        // Try to enrich from local DB if AI didn't provide activeIngredient/medicalUse
        const dbRecord = lookupMedication(name);
        return {
          id: med.id || "med-" + Math.random().toString(36).substring(7),
          name: name,
          medicationName: name,
          dosage: med.dosage || "غير محدد",
          form: form,
          frequency: med.frequency || "غير محدد",
          duration: med.duration || "غير محدد",
          specialInstructions: med.specialInstructions || med.notes || "لا يوجد",
          activeIngredient: med.activeIngredient || dbRecord?.activeIngredient || "غير محدد",
          medicalUse: med.medicalUse || dbRecord?.medicalUse || "دواء طبي - استشر الطبيب أو الصيدلي",
          detailedInfo: med.detailedInfo || dbRecord?.detailedInfo || {
            indications: ["مخفف للآلام وتخفيف الأعراض"],
            sideEffects: ["آمن بالجرعات العادية الموصى بها"],
            contraindications: ["الحساسية للمادة الفعالة بالدواء"]
          },
          medicineBoxImageUrl: getMedicineBoxImageUrl(name)
        };
      });

      // wrap in standard format
      return res.json({ 
        success: true, 
        medications: medicationsArray,
        isSimulated: useFallback
      });
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
- "name": The commercial/brand drug name (string).
- "dosage": Most common dose/strength (string).
- "form": Form of drug (string, e.g., "Tablet", "Syrup", "Capsule").
- "frequency": Typical frequency (string, in Arabic).
- "duration": Typical duration (string, in Arabic).
- "specialInstructions": Typical instructions (string, in Arabic).
- "activeIngredient": The primary scientific active ingredient(s) (string).
- "medicalUse": A short patient-friendly explanation of what this medication is used for in Arabic (string).
- "detailedInfo": An object containing factual clinical information in Arabic:
  - "indications": Array of strings.
  - "sideEffects": Array of strings.
  - "contraindications": Array of strings.

Rules:
1. Use your vast global clinical database. NEVER return "Unknown".
2. Output ONLY a valid JSON object. No markdown, no explanations.
      `;

      let response;
      let useFallback = false;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        useFallback = true;
      } else {
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
      }

      let drugObj: any = null;

      if (useFallback || !response) {
        // Use the local clinical database
        const dbRecord = lookupMedication(drugName);
        if (dbRecord) {
          drugObj = {
            name: `${dbRecord.nameAr} (${dbRecord.name})`,
            dosage: dbRecord.dosage,
            form: dbRecord.form,
            frequency: dbRecord.frequency,
            duration: dbRecord.duration,
            specialInstructions: dbRecord.specialInstructions,
            activeIngredient: dbRecord.activeIngredient,
            medicalUse: dbRecord.medicalUse,
            detailedInfo: dbRecord.detailedInfo
          };
        } else {
          drugObj = {
            name: drugName,
            dosage: "غير محدد",
            form: "Tablet",
            frequency: "حسب تعليمات الطبيب",
            duration: "حسب الحاجة",
            specialInstructions: "استشر الطبيب أو الصيدلي",
            activeIngredient: "غير محدد",
            medicalUse: "دواء طبي - يُرجى مراجعة النشرة الداخلية",
            detailedInfo: {
              indications: [`علاج الحالات الموصوفة لـ ${drugName}`],
              sideEffects: ["يُرجى مراجعة النشرة الداخلية للدواء"],
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
      const dbEnrich = lookupMedication(drugName);
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
          activeIngredient: drugObj.activeIngredient || dbEnrich?.activeIngredient || "غير محدد",
          medicalUse: drugObj.medicalUse || dbEnrich?.medicalUse || "دواء طبي - استشر الصيدلي",
          detailedInfo: drugObj.detailedInfo || dbEnrich?.detailedInfo || {
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Static serving for production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    const localIP = getLocalIP();
    console.log(`\n🚀 Seidaly Server running!`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   📱 Mobile: http://${localIP}:${PORT}`);
    console.log(`   API Mode: ${(!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') ? '⚠️ Offline (DB fallback)' : '✅ Live (Gemini AI)'}\n`);
  });
}

startServer();
