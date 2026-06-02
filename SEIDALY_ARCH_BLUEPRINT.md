# Seidaly (صيدلي) - Full-Stack Architectural Blueprint & Mobile Roadmap

## 1. Unified Home Dashboard UI Layout (React Component Structure)

Here is the structured mapping for the unified Home Dashboard:

\`\`\`text
<DashboardLayout>
  <Header>
    <AppLogo />
    <UserGreeting name="Ahmed" />
    <SubscriptionBadge tier="FREE" scansLeft={3} onUpgrade={() => {}} />
  </Header>

  <DailyInsights>
    <StreakCounter streakDays={5} points={120} />
    <StockTrackerWidget 
      medication="Panadol" 
      pillsLeft={3} 
      alert="Tap to refill or find cheap alternatives" 
    />
  </DailyInsights>

  <PremiumFeatureGate tier="FREE">
    <FamilyProfilesList profiles={["Me", "Father", "Mother"]} />
  </PremiumFeatureGate>

  <CoreActionsGrid>
    <ActionCard icon="scan" title="AI Prescription Scanner" onClick={openScanner} />
    <ActionCard icon="barcode" title="Medicine Box Scanner" tooltip="Lookup info instantly" />
    <ActionCard icon="plus" title="Manual Logger" />
  </CoreActionsGrid>

  <DailyMedicationTimeline>
    {dailySchedule.map(timeSlot => (
      <TimelineItem 
         time="08:00 AM" 
         medication="Augmentin" 
         dosage="1g Tablet"
         isTaken={false}
         onCheck={() => updateStreakAndPoints()} 
      />
    ))}
  </DailyMedicationTimeline>

  <IsolatedFoldersWidget>
    <FolderCard doctor="Dr. Mohammed Said" specialty="Pediatrics" date="01/06/2026" />
    {/* Folder acts as a container for grouped medications */}
  </IsolatedFoldersWidget>
</DashboardLayout>
\`\`\`

### Pre-Save Interactive Modification Screen
Before an AI extraction is committed to the database, it flows through the `PreSaveReview` component:
*   **Missing Data Callouts:** Render a pulsing red `"Missing Schedule - Add Manually"` badge next to any medication lacking a frequency.
*   **Time Pickers:** Form controls allowing the user to map "Every 8 hours" to a specific `startDate` and anchor time (e.g., 08:00 AM).
*   **Folder Assignment:** A dropdown binding the scanned meds to a `PrescriptionFolder`.

---

## 2. Server Architecture: Custom API Integration Strategy

### Google Custom Search API Image Pipeline
To resolve "Gastney Syrup box package" into a real commercial image, upgrade the `getMedicineBoxImageUrl` in Node.js:
1.  **Google Programmable Search Engine:** Create an engine restricted to indexing medical image databases or pharmacies (e.g., local Egyptian pharmacy sites like *Elezaby, Yodawy*).
2.  **API Call:**
    \`\`\`typescript
    const fetchRealBoxImage = async (drugName: string) => {
      const query = encodeURIComponent(\`\${drugName} medicine box package Egypt\`);
      const res = await axios.get(\`https://www.googleapis.com/customsearch/v1?q=\${query}&cx=YOUR_CX&searchType=image&key=YOUR_API_KEY\`);
      return res.data.items?.[0]?.link || getFallbackPlaceholder(drugName);
    }
    \`\`\`
3.  **Local JSON Fallback:** If the API fails or limits are reached, fallback to a local `egypt_drug_index.json` containing pre-mapped `drug_name -> url`.

---

## 3. Flutter Mobile Migration & Background Workmanager Roadmap

Translating this React/Node stack into Flutter requires a robust background architecture to ensure alarms sound even if the app is killed.

### Tech Stack Implementation (Flutter Focus)
*   **State Management:** Riverpod or BLoC.
*   **Local DB:** `sqflite` (relational equivalence to our PostgreSQL models).
*   **Background Jobs:** `workmanager` (for syncing streaks/stock updates to the backend).
*   **Local Notifications:** `flutter_local_notifications`.

### Step-by-Step Implementation Roadmap

**Phase 1: Local Timelines & The Core Loop**
1.  **UI Construction:** Build the "Medical Teal" UI.
2.  **API Integration:** Implement the HTTP POST call mapping to our Node.js `/api/scan-prescription` endpoint.
3.  **Data Sink:** Parse the `medications` JSON array. Pass the data through the Flutter Pre-Save UI.
4.  **Local Alarm Scheduling (CRITICAL):**
    *   Do NOT rely on background isolates to "wake up" and check the time. iOS will kill them.
    *   **The Algorithm:** When the user clicks "Save Schedule", run a `for` loop generating exact `DateTime` timestamps for the upcoming week based on the `frequency` string.
    *   Insert these directly into `flutter_local_notifications` using `zonedSchedule()`.
    \`\`\`dart
    await flutterLocalNotificationsPlugin.zonedSchedule(
        id,
        '💊 Seidaly Reminder',
        'Time to take \${med.name} (\${med.dosage})',
        scheduledTime,
        const NotificationDetails(android: AndroidNotificationDetails('med_channel', 'Medications')),
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime);
    \`\`\`

**Phase 2: Folders & Streak Gamification**
1.  Translate the `PrescriptionFolder` model into Sqflite. Render the Folders tab.
2.  When a user taps "Taken!" on a timeline item, fire an API call to Node.js to `UPDATE User SET points = points + 10, adherenceStreak = adherenceStreak + 1`.

**Phase 3: Stock Tracker Background Sync**
1.  Register a Flutter `workmanager` job to run periodically (e.g., once every 24 hours).
2.  The job checks local Sqflite `Medication` inventory. If `stockRemaining < 5`, trigger a local warning notification: `"Panadol running low"`.
