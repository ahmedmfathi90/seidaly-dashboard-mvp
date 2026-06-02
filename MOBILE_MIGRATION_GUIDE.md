# Seidaly (صيدلي) - Handover & Mobile Migration Blueprint

This document serves as the official technical handover for the Seidaly application. It bridges the gap between our validated web-based AI dashboard prototype and the final production-ready cross-platform mobile application.

---

## 1. Final Tech Stack Recommendation

For an application heavily reliant on rigid local notifications, camera hardware, and fluid UI experiences, we recommend evaluating the two major frameworks based on background execution reliability.

| Component | Recommendation | Alternatives / Details |
| :--- | :--- | :--- |
| **Mobile Frontend** | **Flutter (Recommended)** | **React Native** (Alternative). Flutter is highly recommended here due to its predictable background execution lifecycle via `workmanager` and precise alarm handling with `flutter_local_notifications`. React Native is a great choice if you want to reuse the React knowledge from this MVP, utilizing `Notifee` for advanced notifications. |
| **Backend API** | **Node.js (Express) + TypeScript** | The current Node.js architecture perfectly supports the MVP. Deployed on Google Cloud Run, it scales automatically. |
| **Database** | **PostgreSQL (via Prisma)** | SQL is ideal for relational data (Users $\rightarrow$ Subscriptions $\rightarrow$ Medications $\rightarrow$ Reminders) and handles the Freemium limits well. |
| **AI Engine** | **Gemini 2.5 Flash** | Fast, secure, and highly capable of extracting complex medical OCR data and generating structured JSON payloads on the server side. |
| **Payments** | **RevenueCat** | Essential for managing Apple App Store and Google Play subscriptions, trials (7-day free), and server-side receipt validation. |

### Handling Background Tasks & Smart Reminders
*   **iOS Limitations:** iOS strictly limits background execution. Standard background tasks cannot trigger exact alarms reliably. 
*   **The Solution:** Use **Local Notifications** scheduled in advance. When the JSON timeline comes back from our AI API, the mobile app calculates the exact timestamps for the next 64 doses (iOS limit) and schedules them locally as calendar/time-based notification triggers. No active background daemon is needed just to fire the alarm!

---

## 2. Complete Node.js Server Blueprint

Our target architecture keeps the raw Gemini AI keys completely hidden from the mobile application. The mobile app acts only as a dumb client sending an image and receiving scheduling instructions.

### Architecture Highlights included in `server.ts`:
1.  **Freemium Middleware (`enforceSubscriptionLimits`)**: Validates the JWT/User token and checks `freeScansRemaining` or `subscriptionExpiry` before processing the image.
2.  **LLM Safety & JSON Enforcement**: Employs a strict prompt with `responseMimeType: "application/json"` and a fallback regex parser.
3.  **Exponential Backoff (503 Handling)**: A `while (retries > 0)` loop prevents transient Gemini API timeouts from failing the user experience.
4.  **Fallback Image Mapping**: `getMedicineBoxImageUrl` applies dynamic UI fallbacks if commercial image APIs fail.

### Core API Flow for `/api/scan-prescription`
```typescript
// 1. Authenticate & Check Tier (Middleware)
app.post("/api/scan-prescription", enforceSubscriptionLimits, async (req, res) => {
  // 2. Validate Payload
  const { imageBase64, mimeType } = req.body;
  
  // 3. Construct Gemini Prompt with JSON Enforcement
  const prompt = `...`; // (Refer to our built server.ts)

  // 4. Exponential Backoff Retry Wrapper
  let response;
  let retries = 3;
  while (retries > 0) {
    try {
      response = await ai.models.generateContent({ /* config */ });
      break;
    } catch (e) {
      if (e.status === 503) { retries--; await sleep(2000); }
      else throw e;
    }
  }

  // 5. Parse, Inject Image Placeholders, and Return Data
  const parsedData = JSON.parse(response.text);
  return res.json({ success: true, medications: parsedData });
});
```

---

## 3. Mobile Integration Strategy (Step-by-Step)

When transitioning to Flutter or React Native, follow this exact data pipeline to recreate the Seidaly experience:

### Step 1: Secure Camera Capture & Compression
*   Mobile photos can be 5MB-10MB. Sending this raw over cellular networks will cause extreme latency.
*   **Action:** Use an image compression library (e.g., `flutter_image_compress` or `react-native-image-resizer`) to compress the image payload to under 1MB while preserving text legibility.

### Step 2: Base64 Encoding
*   Convert the compressed JPEG/PNG to a Base64 string locally on the device.
*   Attach the JWT authentication token to the HTTP headers.

### Step 3: Call the AI API
```dart
// Pseudo-code (Flutter/Dart)
final response = await http.post(
  Uri.parse('https://api.yourdomain.com/api/scan-prescription'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $userToken',
  },
  body: jsonEncode({
    'imageBase64': base64ImageString,
    'mimeType': 'image/jpeg'
  }),
);
```

### Step 4: Parse JSON into Local Device Alarms
Once the array of medications is returned, iterate through the list to schedule the device-level alarms.

```dart
// Pseudo-code (Flutter/Dart)
final data = jsonDecode(response.body);

for (var med in data['medications']) {
  // Save to local SQLite database for offline viewing
  await DatabaseHelper.insertMedication(med);
  
  // Example: "Every 8 hours" -> Schedule next 10 days of alarms
  if (med['frequency'].contains('8 hours')) {
     scheduleLocalNotifications(
        title: "وقت الدواء: ${med['name']}",
        body: "الجرعة: ${med['dosage']}",
        intervalHours: 8,
     );
  }
}
```

---

**Next Steps for the Development Team:**
1. Connect the `server.ts` to a real PostgreSQL instance using the `schema.prisma` we designed.
2. Replace the Mock User Middleware with a real Firebase Auth or JWT verification middleware.
3. Integrate RevenueCat webhooks to automatically update the `SubscriptionTier` in the database when a user upgrades via the App Store.
