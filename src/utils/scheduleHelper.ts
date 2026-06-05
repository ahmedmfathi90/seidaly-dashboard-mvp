import { Medication } from '../types';

/**
 * Computes base times for frequency rules.
 * E.g., "كل 8 ساعات" -> 3 doses, "كل 12 ساعة" -> 2 doses, "كل 6 ساعات" -> 4 doses.
 */
export function generateMedicationSchedules(medication: Partial<Medication>): Partial<Medication> {
  const freq = medication.frequency || "";
  const currentTimings = medication.timings && medication.timings.length > 0 ? medication.timings : ["09:00 AM"];
  const baseTime = currentTimings[0];

  const parseTime = (tStr: string) => {
    let [time, modifier] = tStr.split(' ');
    let [hoursStr, minutesStr] = time.split(':');
    let hours = parseInt(hoursStr, 10);
    let minutes = parseInt(minutesStr, 10) || 0;
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  };

  const formatTime = (hours: number, minutes: number) => {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    let displayHours = hours % 12;
    displayHours = displayHours ? displayHours : 12;
    const strHours = displayHours < 10 ? '0' + displayHours : displayHours.toString();
    const strMinutes = minutes < 10 ? '0' + minutes : minutes.toString();
    return `${strHours}:${strMinutes} ${ampm}`;
  };

  let newTimings = [...currentTimings];

  // Map common Arabic/English frequencies
  const isEightHours = freq.includes("كل 8") || freq.includes("كل ٨") || freq.toLowerCase().includes("8 hour") || freq.includes("٣ مرات") || freq.includes("3 مرات") || freq.includes("ثلاث مرات");
  const isTwelveHours = freq.includes("كل 12") || freq.includes("كل ١٢") || freq.toLowerCase().includes("12 hour") || freq.includes("مرتين") || freq.includes("2 مرتين");
  const isSixHours = freq.includes("كل 6") || freq.includes("كل ٦") || freq.toLowerCase().includes("6 hour") || freq.includes("٤ مرات") || freq.includes("4 مرات") || freq.includes("اربع مرات");

  if (isEightHours) {
    const base = parseTime(baseTime);
    const t1 = formatTime(base.hours, base.minutes);
    const t2 = formatTime((base.hours + 8) % 24, base.minutes);
    const t3 = formatTime((base.hours + 16) % 24, base.minutes);
    newTimings = [t1, t2, t3];
  } else if (isTwelveHours) {
    const base = parseTime(baseTime);
    const t1 = formatTime(base.hours, base.minutes);
    const t2 = formatTime((base.hours + 12) % 24, base.minutes);
    newTimings = [t1, t2];
  } else if (isSixHours) {
    const base = parseTime(baseTime);
    const t1 = formatTime(base.hours, base.minutes);
    const t2 = formatTime((base.hours + 6) % 24, base.minutes);
    const t3 = formatTime((base.hours + 12) % 24, base.minutes);
    const t4 = formatTime((base.hours + 18) % 24, base.minutes);
    newTimings = [t1, t2, t3, t4];
  }

  // Handle duration and start/end dates
  const startDate = medication.startDate || new Date().toISOString().split('T')[0];
  let endDate = medication.endDate;

  const durationMatch = (medication.duration || "").match(/(\d+)\s*(أيام|يوم|days|day)/);
  if (durationMatch) {
    const daysCount = parseInt(durationMatch[1], 10);
    const startD = new Date(startDate);
    startD.setDate(startD.getDate() + daysCount - 1); // e.g. 5 days starting today ends in today + 4 days
    endDate = startD.toISOString().split('T')[0];
  }

  return {
    ...medication,
    timings: newTimings,
    startDate,
    endDate
  };
}

/**
 * Calculates remaining days until target end date.
 */
export function getRemainingDays(endDateStr?: string): number | null {
  if (!endDateStr) return null;
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);
  const end = new Date(endDateStr);
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : -1;
}
