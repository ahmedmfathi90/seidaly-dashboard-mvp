/**
 * Seidaly Offline Clinical Medication Database
 * Contains accurate pharmacological data for common medications in the Arab market.
 * Used as a smart fallback when Gemini API is unavailable.
 */

export interface MedicationRecord {
  name: string;
  nameAr: string;
  activeIngredient: string;
  medicalUse: string;
  dosage: string;
  form: string;
  frequency: string;
  duration: string;
  specialInstructions: string;
  detailedInfo: {
    indications: string[];
    sideEffects: string[];
    contraindications: string[];
  };
}

const MEDICATION_DB: Record<string, MedicationRecord> = {
  // --- Antibiotics ---
  augmentin: {
    name: "Augmentin",
    nameAr: "أوجمنتين",
    activeIngredient: "Amoxicillin + Clavulanic Acid",
    medicalUse: "مضاد حيوي واسع المدى لعلاج العدوى البكتيرية",
    dosage: "1g",
    form: "Tablet",
    frequency: "كل 12 ساعة",
    duration: "7 أيام",
    specialInstructions: "يؤخذ بعد الطعام مباشرة لتقليل اضطرابات المعدة",
    detailedInfo: {
      indications: ["التهابات الجهاز التنفسي العلوي والسفلي", "التهاب اللوزتين والحلق البكتيري", "التهابات الجيوب الأنفية الحادة", "التهابات المسالك البولية", "التهابات الجلد والأنسجة الرخوة"],
      sideEffects: ["إسهال وغثيان خفيف", "طفح جلدي", "اضطرابات في وظائف الكبد (نادرة)", "عدوى فطرية مهبلية عند النساء"],
      contraindications: ["حساسية البنسلين أو السيفالوسبورين", "خلل شديد في وظائف الكبد سابقاً مع أوجمنتين", "كثرة الوحيدات العدوائية (Mononucleosis)"]
    }
  },
  amoxicillin: {
    name: "Amoxicillin",
    nameAr: "أموكسيسيللين",
    activeIngredient: "Amoxicillin Trihydrate",
    medicalUse: "مضاد حيوي لعلاج العدوى البكتيرية الخفيفة والمتوسطة",
    dosage: "500mg",
    form: "Capsule",
    frequency: "كل 8 ساعات",
    duration: "7 أيام",
    specialInstructions: "يمكن تناوله مع أو بدون طعام",
    detailedInfo: {
      indications: ["التهابات الأذن الوسطى", "التهاب الحلق البكتيري", "التهابات المسالك البولية البسيطة", "قرحة المعدة (ضمن بروتوكول ثلاثي)"],
      sideEffects: ["إسهال", "غثيان وقيء", "طفح جلدي خفيف"],
      contraindications: ["حساسية البنسلين", "كثرة الوحيدات العدوائية"]
    }
  },
  azithromycin: {
    name: "Azithromycin",
    nameAr: "أزيثرومايسين (زيثروماكس)",
    activeIngredient: "Azithromycin Dihydrate",
    medicalUse: "مضاد حيوي من مجموعة الماكروليد لعلاج التهابات الجهاز التنفسي",
    dosage: "500mg",
    form: "Tablet",
    frequency: "مرة واحدة يومياً",
    duration: "3 أيام",
    specialInstructions: "يؤخذ قبل الأكل بساعة أو بعده بساعتين",
    detailedInfo: {
      indications: ["الالتهاب الرئوي المكتسب من المجتمع", "التهاب الشعب الهوائية الحاد", "التهاب الجيوب الأنفية", "التهابات الجلد", "الأمراض المنقولة جنسياً"],
      sideEffects: ["إسهال وألم بالبطن", "غثيان", "صداع", "تغيرات مؤقتة في حاسة التذوق"],
      contraindications: ["حساسية الماكروليد", "أمراض الكبد الشديدة", "اضطرابات نظم القلب (إطالة QT)"]
    }
  },

  // --- Pain & Inflammation ---
  panadol: {
    name: "Panadol",
    nameAr: "بانادول",
    activeIngredient: "Paracetamol (Acetaminophen)",
    medicalUse: "مسكن للآلام وخافض للحرارة",
    dosage: "500mg",
    form: "Tablet",
    frequency: "كل 4-6 ساعات عند اللزوم",
    duration: "حسب الحاجة (لا يتجاوز 5 أيام بدون استشارة طبيب)",
    specialInstructions: "لا تتجاوز 8 أقراص يومياً. تجنب الكحول تماماً",
    detailedInfo: {
      indications: ["تخفيف الصداع بأنواعه", "خافض للحرارة عند الحمى", "آلام الأسنان واللثة", "آلام الدورة الشهرية", "آلام العضلات والمفاصل الخفيفة"],
      sideEffects: ["آمن جداً بالجرعات الموصى بها", "نادراً: طفح جلدي", "جرعات زائدة: تسمم كبدي خطير"],
      contraindications: ["القصور الكبدي الشديد", "حساسية الباراسيتامول", "إدمان الكحول المزمن"]
    }
  },
  cataflam: {
    name: "Cataflam",
    nameAr: "كاتافلام",
    activeIngredient: "Diclofenac Potassium",
    medicalUse: "مضاد قوي للالتهابات ومسكن سريع المفعول للآلام",
    dosage: "50mg",
    form: "Tablet",
    frequency: "كل 8 ساعات بعد الأكل",
    duration: "3-5 أيام",
    specialInstructions: "يؤخذ بعد الأكل مباشرة. لا يُستخدم على معدة فارغة أبداً",
    detailedInfo: {
      indications: ["آلام الأسنان واللثة الحادة", "الآلام الروماتيزمية والتهاب المفاصل", "آلام الظهر والرقبة", "الصداع النصفي (الشقيقة)", "آلام ما بعد العمليات الجراحية"],
      sideEffects: ["حموضة وحرقان بالمعدة", "غثيان وعسر هضم", "صداع ودوار خفيف", "ارتفاع طفيف في ضغط الدم"],
      contraindications: ["قرحة المعدة النشطة أو نزيف الجهاز الهضمي", "الفشل القلبي الشديد", "الفشل الكلوي المتقدم", "الثلث الأخير من الحمل", "حساسية الأسبرين أو مضادات الالتهاب NSAIDs"]
    }
  },
  brufen: {
    name: "Brufen",
    nameAr: "بروفين",
    activeIngredient: "Ibuprofen",
    medicalUse: "مسكن للآلام ومضاد للالتهابات وخافض للحرارة",
    dosage: "400mg",
    form: "Tablet",
    frequency: "كل 8 ساعات بعد الأكل",
    duration: "3-5 أيام",
    specialInstructions: "يؤخذ مع الطعام أو الحليب لحماية المعدة",
    detailedInfo: {
      indications: ["آلام المفاصل والعضلات", "آلام الدورة الشهرية", "الصداع والصداع النصفي", "التهاب المفاصل الروماتويدي", "الحمى والالتهابات"],
      sideEffects: ["اضطرابات هضمية وحموضة", "غثيان خفيف", "احتباس سوائل خفيف", "صداع ودوار"],
      contraindications: ["قرحة المعدة والاثني عشر", "الربو الناتج عن الأسبرين", "أمراض القلب الشديدة", "الحمل في الثلث الأخير"]
    }
  },
  voltaren: {
    name: "Voltaren",
    nameAr: "فولتارين",
    activeIngredient: "Diclofenac Sodium",
    medicalUse: "مسكن قوي ومضاد للالتهابات والروماتيزم",
    dosage: "50mg",
    form: "Tablet",
    frequency: "مرتين إلى ثلاث مرات يومياً",
    duration: "حسب إرشادات الطبيب",
    specialInstructions: "يؤخذ أثناء أو بعد الأكل مباشرة مع كوب ماء كامل",
    detailedInfo: {
      indications: ["التهاب المفاصل الروماتويدي والفصال العظمي", "النقرس الحاد", "آلام الظهر المزمنة", "التهاب الأوتار والأربطة", "آلام ما بعد الجراحة"],
      sideEffects: ["آلام واضطرابات بالمعدة", "ارتفاع إنزيمات الكبد", "صداع ودوخة", "احتباس سوائل وتورم"],
      contraindications: ["قرحة المعدة النشطة", "أمراض القلب والأوعية الدموية الخطيرة", "القصور الكلوي الشديد", "الحمل والرضاعة"]
    }
  },

  // --- Cold & Flu ---
  congestal: {
    name: "Congestal",
    nameAr: "كونجستال",
    activeIngredient: "Paracetamol + Pseudoephedrine + Chlorpheniramine",
    medicalUse: "علاج شامل لأعراض نزلات البرد والإنفلونزا",
    dosage: "قرص واحد",
    form: "Tablet",
    frequency: "كل 8 ساعات",
    duration: "5 أيام",
    specialInstructions: "قد يسبب النعاس - تجنب القيادة. يؤخذ بعد الأكل",
    detailedInfo: {
      indications: ["تخفيف أعراض نزلات البرد والإنفلونزا", "علاج الرشح وسيلان الأنف", "تخفيف احتقان الجيوب الأنفية", "خفض الحرارة وتسكين آلام الجسم"],
      sideEffects: ["النعاس والخمول", "جفاف الفم والحلق", "دوار خفيف", "صعوبة في التبول (نادر)"],
      contraindications: ["ارتفاع ضغط الدم غير المنضبط", "أمراض القلب الشديدة", "تضخم البروستاتا", "الاستعمال المتزامن مع مثبطات MAO", "الجلوكوما (المياه الزرقاء)"]
    }
  },
  comtrex: {
    name: "Comtrex",
    nameAr: "كومتركس",
    activeIngredient: "Paracetamol + Pseudoephedrine + Chlorpheniramine + Dextromethorphan",
    medicalUse: "علاج أعراض البرد والإنفلونزا مع الكحة الجافة",
    dosage: "قرص واحد",
    form: "Tablet",
    frequency: "كل 6 ساعات",
    duration: "5 أيام",
    specialInstructions: "يسبب النعاس. لا يُستخدم مع أدوية السعال الأخرى",
    detailedInfo: {
      indications: ["نزلات البرد والإنفلونزا", "السعال الجاف", "احتقان الأنف والجيوب", "الحمى وآلام الجسم"],
      sideEffects: ["نعاس شديد", "جفاف الفم", "إمساك", "دوار"],
      contraindications: ["ارتفاع ضغط الدم", "أمراض الكبد", "السعال المصحوب ببلغم", "الأطفال أقل من 12 سنة"]
    }
  },

  // --- Cardiovascular ---
  concor: {
    name: "Concor",
    nameAr: "كونكور",
    activeIngredient: "Bisoprolol Fumarate",
    medicalUse: "علاج ارتفاع ضغط الدم وحماية عضلة القلب",
    dosage: "5mg",
    form: "Tablet",
    frequency: "مرة واحدة يومياً صباحاً",
    duration: "علاج مستمر - لا يُوقف فجأة",
    specialInstructions: "يؤخذ على الريق صباحاً. لا يُوقف فجأة أبداً بل يُقلّل تدريجياً",
    detailedInfo: {
      indications: ["علاج ارتفاع ضغط الدم الأساسي", "الذبحة الصدرية المستقرة", "قصور القلب المزمن المستقر", "تنظيم ضربات القلب السريعة"],
      sideEffects: ["إرهاق وتعب عام", "برودة في الأطراف", "بطء في ضربات القلب", "دوخة خفيفة عند الوقوف", "اضطرابات النوم"],
      contraindications: ["الربو الشعبي الشديد", "بطء شديد في ضربات القلب", "انخفاض ضغط الدم الشديد", "قصور القلب الحاد غير المستقر", "ورم القواتم غير المعالج"]
    }
  },
  lipitor: {
    name: "Lipitor",
    nameAr: "ليبيتور",
    activeIngredient: "Atorvastatin Calcium",
    medicalUse: "خفض مستويات الكوليسترول والدهون الثلاثية بالدم",
    dosage: "20mg",
    form: "Tablet",
    frequency: "مرة واحدة يومياً مساءً",
    duration: "علاج مستمر",
    specialInstructions: "يُفضل تناوله مساءً. يتطلب فحص دوري لوظائف الكبد",
    detailedInfo: {
      indications: ["ارتفاع الكوليسترول الضار LDL", "ارتفاع الدهون الثلاثية", "الوقاية من أمراض القلب والشرايين", "بعد جلطات القلب للوقاية الثانوية"],
      sideEffects: ["آلام عضلية خفيفة", "ارتفاع إنزيمات الكبد", "صداع", "اضطرابات هضمية خفيفة"],
      contraindications: ["أمراض الكبد النشطة", "الحمل والرضاعة", "حساسية للستاتينات", "انحلال العضلات (Rhabdomyolysis)"]
    }
  },

  // --- Diabetes ---
  glucophage: {
    name: "Glucophage",
    nameAr: "جلوكوفاج",
    activeIngredient: "Metformin Hydrochloride",
    medicalUse: "تنظيم مستوى السكر بالدم لمرضى السكري النوع الثاني",
    dosage: "500mg",
    form: "Tablet",
    frequency: "مرتين يومياً مع الوجبات",
    duration: "علاج مستمر",
    specialInstructions: "يؤخذ أثناء الأكل أو بعده مباشرة لتقليل اضطرابات المعدة",
    detailedInfo: {
      indications: ["السكري من النوع الثاني", "مقاومة الأنسولين", "متلازمة تكيس المبايض (PCOS)", "الوقاية من السكري في الفئات عالية الخطورة"],
      sideEffects: ["اضطرابات هضمية وغثيان (شائعة في البداية)", "إسهال", "طعم معدني بالفم", "نقص فيتامين B12 على المدى الطويل"],
      contraindications: ["الفشل الكلوي الشديد (eGFR < 30)", "الحماض الكيتوني السكري", "قبل إجراء الأشعة بالصبغة", "الفشل الكبدي الشديد", "الإدمان على الكحول"]
    }
  },

  // --- GI / Stomach ---
  antinal: {
    name: "Antinal",
    nameAr: "أنتينال",
    activeIngredient: "Nifuroxazide",
    medicalUse: "مطهر معوي لعلاج الإسهال والنزلات المعوية",
    dosage: "200mg",
    form: "Capsule",
    frequency: "كل 6 ساعات",
    duration: "3 أيام",
    specialInstructions: "يمكن تناوله مع أو بدون طعام. يجب شرب سوائل كافية",
    detailedInfo: {
      indications: ["الإسهال البكتيري الحاد", "النزلات المعوية", "التسمم الغذائي الخفيف", "اضطرابات الجهاز الهضمي المعدية"],
      sideEffects: ["نادرة الحدوث عموماً", "حساسية جلدية (نادر جداً)", "غثيان خفيف"],
      contraindications: ["حساسية النيفوروكسازيد", "الأطفال أقل من شهرين"]
    }
  },
  nexium: {
    name: "Nexium",
    nameAr: "نيكسيوم",
    activeIngredient: "Esomeprazole Magnesium",
    medicalUse: "علاج قرحة المعدة وارتجاع المريء وحموضة المعدة الشديدة",
    dosage: "40mg",
    form: "Capsule",
    frequency: "مرة واحدة يومياً قبل الإفطار",
    duration: "4-8 أسابيع",
    specialInstructions: "يؤخذ قبل الأكل بـ 30 دقيقة على الأقل. يُبلع كاملاً دون مضغ",
    detailedInfo: {
      indications: ["ارتجاع المريء (GERD)", "قرحة المعدة والاثني عشر", "متلازمة زولينجر إليسون", "الوقاية من قرحة الأدوية المضادة للالتهابات", "بروتوكول القضاء على جرثومة المعدة"],
      sideEffects: ["صداع", "إسهال أو إمساك", "غثيان وانتفاخ", "نقص المغنيسيوم (مع الاستخدام الطويل)", "هشاشة العظام (مع الاستخدام المزمن)"],
      contraindications: ["حساسية مثبطات مضخة البروتون", "الاستخدام المتزامن مع أتازانافير أو نلفينافير"]
    }
  },
  gaviscon: {
    name: "Gaviscon",
    nameAr: "جافيسكون",
    activeIngredient: "Sodium Alginate + Sodium Bicarbonate + Calcium Carbonate",
    medicalUse: "علاج الحموضة وحرقة المعدة وارتجاع المريء",
    dosage: "10-20ml",
    form: "Syrup",
    frequency: "بعد الوجبات وقبل النوم",
    duration: "حسب الحاجة",
    specialInstructions: "يُرج جيداً قبل الاستعمال. لا يُخلط مع أدوية أخرى",
    detailedInfo: {
      indications: ["حرقة المعدة والحموضة", "ارتجاع المريء الخفيف والمتوسط", "عسر الهضم"],
      sideEffects: ["آمن جداً عموماً", "انتفاخ خفيف (نادر)", "إمساك خفيف (نادر)"],
      contraindications: ["حساسية لأي من المكونات", "نظام غذائي منخفض الصوديوم (يحتوي على صوديوم)"]
    }
  },

  // --- Respiratory ---
  ventolin: {
    name: "Ventolin",
    nameAr: "فنتولين",
    activeIngredient: "Salbutamol (Albuterol)",
    medicalUse: "موسع للشعب الهوائية لعلاج الربو وضيق التنفس",
    dosage: "100mcg/بخة",
    form: "Inhaler",
    frequency: "عند اللزوم (1-2 بخة كل 4-6 ساعات)",
    duration: "حسب الحاجة",
    specialInstructions: "يُرج البخاخ جيداً قبل الاستعمال. يُستنشق ببطء وعمق",
    detailedInfo: {
      indications: ["نوبات الربو الحادة", "ضيق التنفس وأزيز الصدر", "الانسداد الرئوي المزمن COPD", "الوقاية من ضيق التنفس قبل التمارين"],
      sideEffects: ["رعشة خفيفة باليدين", "تسارع ضربات القلب", "صداع", "تقلصات عضلية خفيفة"],
      contraindications: ["حساسية السالبوتامول", "اضطرابات نظم القلب الشديدة غير المنضبطة"]
    }
  },

  // --- Allergy ---
  telfast: {
    name: "Telfast",
    nameAr: "تلفاست",
    activeIngredient: "Fexofenadine Hydrochloride",
    medicalUse: "مضاد للحساسية لعلاج الرشح التحسسي والحكة والأرتيكاريا",
    dosage: "180mg",
    form: "Tablet",
    frequency: "مرة واحدة يومياً",
    duration: "حسب استمرار الأعراض",
    specialInstructions: "لا يسبب النعاس. يؤخذ مع الماء وليس مع العصائر",
    detailedInfo: {
      indications: ["حساسية الأنف الموسمية (حمى القش)", "الأرتيكاريا المزمنة والحكة", "حساسية الجلد", "العطاس والرشح التحسسي"],
      sideEffects: ["صداع خفيف", "غثيان (نادر)", "دوخة بسيطة (نادر)"],
      contraindications: ["حساسية الفيكسوفينادين", "القصور الكلوي الشديد"]
    }
  },
  zyrtec: {
    name: "Zyrtec",
    nameAr: "زيرتك",
    activeIngredient: "Cetirizine Hydrochloride",
    medicalUse: "مضاد للحساسية لعلاج الحكة والعطاس واحتقان الأنف التحسسي",
    dosage: "10mg",
    form: "Tablet",
    frequency: "مرة واحدة يومياً مساءً",
    duration: "حسب استمرار الأعراض",
    specialInstructions: "قد يسبب نعاساً خفيفاً. يُفضل تناوله مساءً",
    detailedInfo: {
      indications: ["التهاب الأنف التحسسي", "الأرتيكاريا والحكة الجلدية", "حساسية العيون (الدموع والحكة)", "لدغات الحشرات"],
      sideEffects: ["نعاس خفيف", "جفاف الفم", "صداع", "إرهاق"],
      contraindications: ["حساسية السيتريزين أو الهيدروكسيزين", "القصور الكلوي الشديد", "الأطفال أقل من سنتين"]
    }
  },
};

/**
 * Look up a medication by name (case-insensitive, supports Arabic & English, partial match).
 */
export function lookupMedication(query: string): MedicationRecord | null {
  if (!query) return null;
  const q = query.toLowerCase().trim();

  // Direct key match
  for (const key of Object.keys(MEDICATION_DB)) {
    if (q.includes(key) || key.includes(q)) {
      return MEDICATION_DB[key];
    }
  }

  // Match against Arabic names
  for (const rec of Object.values(MEDICATION_DB)) {
    if (q.includes(rec.nameAr) || rec.nameAr.includes(q)) return rec;
    if (q.includes(rec.name.toLowerCase()) || rec.name.toLowerCase().includes(q)) return rec;
    if (q.includes(rec.activeIngredient.toLowerCase().split(' ')[0])) return rec;
  }

  return null;
}

/**
 * Get a fallback set of medications for simulated prescription scan.
 */
export function getSimulatedPrescriptionMeds(): MedicationRecord[] {
  return [
    MEDICATION_DB.augmentin,
    MEDICATION_DB.panadol,
    MEDICATION_DB.cataflam,
  ];
}

export default MEDICATION_DB;
