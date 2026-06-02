export interface Medication {
  id?: string;
  name: string;
  dosage: string;
  form: string;
  frequency: string;
  duration: string;
  specialInstructions: string;
  activeIngredient?: string;
  medicalUse?: string;
  medicineBoxImageUrl?: string;
  detailedInfo?: {
    indications: string[];
    sideEffects: string[];
    contraindications: string[];
  };
  timings?: string[];
  inventoryQty?: number;
  foodInstruction?: 'before' | 'after' | 'with' | 'needed';
}

export interface ScanResponse {
  success: boolean;
  medications?: Medication[];
  error?: string;
}
