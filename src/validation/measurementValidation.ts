import { z } from 'zod';

// Measurement abbreviation mappings based on the Notion database schema
export const MEASUREMENT_MAPPINGS = {
  // Single measurements
  'CH': 'Chest (CH)',
  'SH': 'Shoulder (SH)', 
  'SL': 'Sleeve Length (SL)',
  'WT': 'Waist (WT)',
  'HP': 'Hip (HP)',
  'LP': 'Lap (LP)',
  'CF': 'Calf (CF)',
  'NK': 'Neck (NK)',
  'ST': 'Stomach (ST)',
  
  // Dual entry measurements with specific mapping rules
  'LT': {
    single: 'Top Length (LT)', // Default when only one LT value
    dual: ['Top Length (LT)', 'Trouser Length (LT)'] // When two values: first=Top, second=Trouser
  },
  'RD': {
    single: 'Bicep Round (RD)', // Default when only one RD value
    dual: ['Bicep Round (RD)', 'Ankle Round (RD)'] // When two values: first=Bicep, second=Ankle
  }
} as const;

// Notion database field names for mapping
export const NOTION_FIELD_NAMES = {
  'Chest (CH)': 'Chest (CH)',
  'Shoulder (SH)': 'Shoulder (SH)',
  'Sleeve Length (SL)': 'Sleeve Length (SL)',
  'Top Length (LT)': 'Top Length (LT)',
  'Waist (WT)': 'Waist (WT)',
  'Hip (HP)': 'Hip (HP)',
  'Lap (LP)': 'Lap (LP)',
  'Trouser Length (LT)': 'Trouser Length (LT)',
  'Ankle Round (RD)': 'Ankle Round (RD)',
  'Bicep Round (RD)': 'Bicep Round (RD)',
  'Calf (CF)': 'Calf (CF)',
  'Neck (NK)': 'Neck (NK)',
  'Stomach (ST)': 'Stomach (ST)',
} as const;

// Realistic measurement ranges in inches (min, max) for data integrity
export const MEASUREMENT_RANGES = {
  'Chest (CH)': [20, 70],
  'Shoulder (SH)': [10, 30],
  'Sleeve Length (SL)': [12, 40],
  'Top Length (LT)': [15, 50],
  'Waist (WT)': [16, 60],
  'Hip (HP)': [20, 65],
  'Lap (LP)': [18, 45], // Lap measurement
  'Trouser Length (LT)': [20, 55],
  'Ankle Round (RD)': [6, 16],
  'Bicep Round (RD)': [6, 25],
  'Calf (CF)': [8, 25],
  'Neck (NK)': [8, 25],
  'Stomach (ST)': [18, 65],
} as const;

// Parsed measurement entry
export type ParsedMeasurement = {
  abbreviation: string;
  notionField: string;
  value: number;
  isValid: boolean;
  errorMessage?: string;
};

// For dual entries like LT: 31/37 or RD: 15/16
export type DualMeasurement = {
  abbreviation: string;
  firstField: string;
  secondField: string;
  firstValue: number;
  secondValue: number;
  isValid: boolean;
  errorMessage?: string;
};

// Customer measurements with validation
export type ValidatedMeasurements = {
  singleMeasurements: ParsedMeasurement[];
  dualMeasurements: DualMeasurement[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Parse a dual entry value like "31/37" or "15/16"
 */
function parseDualEntry(value: string): { first: number; second: number } | null {
  const dualMatch = value.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (dualMatch) {
    return {
      first: parseFloat(dualMatch[1]),
      second: parseFloat(dualMatch[2])
    };
  }
  return null;
}

/**
 * Parse a single measurement value
 */
function parseSingleValue(value: string): number | null {
  const singleMatch = value.match(/^(\d+(?:\.\d+)?)$/);
  if (singleMatch) {
    return parseFloat(singleMatch[1]);
  }
  return null;
}

/**
 * Validate a measurement value against realistic ranges
 */
function validateMeasurementRange(fieldName: string, value: number): string | null {
  const range = MEASUREMENT_RANGES[fieldName as keyof typeof MEASUREMENT_RANGES];
  if (!range) {
    return `No validation range defined for ${fieldName}`;
  }
  
  const [min, max] = range;
  if (value < min || value > max) {
    return `${fieldName} value ${value}" is outside realistic range (${min}-${max} inches)`;
  }
  
  return null; // Valid
}

/**
 * Parse and validate a single measurement entry
 */
export function parseMeasurement(abbreviation: string, value: string): ParsedMeasurement | DualMeasurement | null {
  const upperAbbrev = abbreviation.toUpperCase().trim();
  const trimmedValue = value.trim();
  
  // Check if this is a known measurement
  if (!(upperAbbrev in MEASUREMENT_MAPPINGS)) {
    return {
      abbreviation: upperAbbrev,
      notionField: 'Unknown',
      value: 0,
      isValid: false,
      errorMessage: `Unknown measurement abbreviation: ${upperAbbrev}`
    };
  }

  const mapping = MEASUREMENT_MAPPINGS[upperAbbrev as keyof typeof MEASUREMENT_MAPPINGS];
  
  // Handle dual entry measurements (LT and RD)
  if (typeof mapping === 'object' && 'dual' in mapping) {
    const dualEntry = parseDualEntry(trimmedValue);
    
    if (dualEntry) {
      // Dual entry like "31/37" or "15/16"
      const [firstField, secondField] = mapping.dual;
      const errors: string[] = [];
      
      // Validate both values
      const firstError = validateMeasurementRange(firstField, dualEntry.first);
      const secondError = validateMeasurementRange(secondField, dualEntry.second);
      
      if (firstError) errors.push(firstError);
      if (secondError) errors.push(secondError);
      
      return {
        abbreviation: upperAbbrev,
        firstField,
        secondField,
        firstValue: dualEntry.first,
        secondValue: dualEntry.second,
        isValid: errors.length === 0,
        errorMessage: errors.length > 0 ? errors.join('; ') : undefined
      } as DualMeasurement;
    } else {
      // Single value for a potentially dual measurement
      const singleValue = parseSingleValue(trimmedValue);
      if (singleValue === null) {
        return {
          abbreviation: upperAbbrev,
          notionField: mapping.single,
          value: 0,
          isValid: false,
          errorMessage: `Invalid measurement format: ${trimmedValue}`
        };
      }
      
      const errorMessage = validateMeasurementRange(mapping.single, singleValue);
      
      return {
        abbreviation: upperAbbrev,
        notionField: mapping.single,
        value: singleValue,
        isValid: errorMessage === null,
        errorMessage: errorMessage || undefined
      } as ParsedMeasurement;
    }
  }
  
  // Handle single measurements
  if (typeof mapping === 'string') {
    const singleValue = parseSingleValue(trimmedValue);
    if (singleValue === null) {
      return {
        abbreviation: upperAbbrev,
        notionField: mapping,
        value: 0,
        isValid: false,
        errorMessage: `Invalid measurement format: ${trimmedValue}`
      };
    }
    
    const errorMessage = validateMeasurementRange(mapping, singleValue);
    
    return {
      abbreviation: upperAbbrev,
      notionField: mapping,
      value: singleValue,
      isValid: errorMessage === null,
      errorMessage: errorMessage || undefined
    } as ParsedMeasurement;
  }
  
  return null;
}

/**
 * Parse a measurement message and extract all measurements
 * Example: "CH 39 ST 33 SL 23 SH 17 LT 27/31 RD 13/15 NK 16 WT 30.5 Kofi"
 */
export function parseMeasurementMessage(message: string): {
  measurements: Record<string, string>;
  customerName?: string;
  rawText: string;
} {
  const words = message.trim().split(/\s+/);
  let customerName: string | undefined;
  
  // Look for potential customer name (non-measurement word at the end)
  const lastWord = words[words.length - 1];
  if (lastWord && !lastWord.match(/^\d+(\.\d+)?(\/\d+(\.\d+)?)?$/)) {
    customerName = lastWord;
    words.pop(); // Remove customer name from processing
  }

  const measurements: Record<string, string> = {};
  
  // Parse measurement pairs (abbreviation followed by value)
  for (let i = 0; i < words.length - 1; i++) {
    const abbrev = words[i].toUpperCase().trim();
    const value = words[i + 1];
    
    // Check if this looks like a measurement abbreviation
    if (abbrev.match(/^[A-Z]{1,4}$/) && value.match(/^\d+(\.\d+)?(\/\d+(\.\d+)?)?$/)) {
      measurements[abbrev] = value;
      i++; // Skip the value in next iteration
    }
  }

  return {
    measurements,
    customerName,
    rawText: message
  };
}

/**
 * Validate all measurements for a customer
 */
export function validateCustomerMeasurements(
  measurementData: Record<string, string>
): ValidatedMeasurements {
  const singleMeasurements: ParsedMeasurement[] = [];
  const dualMeasurements: DualMeasurement[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse each measurement
  for (const [abbrev, value] of Object.entries(measurementData)) {
    const parsed = parseMeasurement(abbrev, value);
    
    if (parsed) {
      if ('firstField' in parsed) {
        // Dual measurement
        dualMeasurements.push(parsed);
        if (!parsed.isValid && parsed.errorMessage) {
          errors.push(parsed.errorMessage);
        }
      } else {
        // Single measurement
        singleMeasurements.push(parsed);
        if (!parsed.isValid && parsed.errorMessage) {
          errors.push(parsed.errorMessage);
        }
      }
    }
  }

  // Business logic warnings
  if (singleMeasurements.length + dualMeasurements.length < 3) {
    warnings.push('Very few measurements provided. Consider asking for more measurements for accurate clothing fit.');
  }

  // Check for essential measurements
  const essentialMeasurements = ['CH', 'ST', 'SL', 'SH'];
  const providedAbbrevs = [
    ...singleMeasurements.map(m => m.abbreviation),
    ...dualMeasurements.map(m => m.abbreviation)
  ];
  const missingEssential = essentialMeasurements.filter(em => !providedAbbrevs.includes(em));
  
  if (missingEssential.length > 0) {
    warnings.push(`Missing essential measurements: ${missingEssential.join(', ')}`);
  }

  return {
    singleMeasurements,
    dualMeasurements,
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Format measurements for Notion database storage
 */
export function formatMeasurementsForNotion(validated: ValidatedMeasurements): Record<string, string> {
  const notionData: Record<string, string> = {};
  
  // Add single measurements
  for (const measurement of validated.singleMeasurements) {
    if (measurement.isValid) {
      notionData[measurement.notionField] = measurement.value.toString();
    }
  }
  
  // Add dual measurements
  for (const dualMeasurement of validated.dualMeasurements) {
    if (dualMeasurement.isValid) {
      notionData[dualMeasurement.firstField] = dualMeasurement.firstValue.toString();
      notionData[dualMeasurement.secondField] = dualMeasurement.secondValue.toString();
    }
  }
  
  return notionData;
}

/**
 * Create validation instructions for the agent
 */
export function getMeasurementValidationInstructions(): string {
  return `
MEASUREMENT VALIDATION GUIDELINES:

📏 DUAL ENTRIES (Based on Notion Database):
- LT: If two values (e.g., "LT 31/37"), first is Top Length, second is Trouser Length
- RD: If two values (e.g., "RD 15/16"), first is Bicep Round, second is Ankle Round
- Single LT defaults to Top Length (LT)
- Single RD defaults to Bicep Round (RD)

📐 NOTION FIELD MAPPINGS:
- CH = Chest (CH): 20-70"
- SH = Shoulder (SH): 10-30"
- SL = Sleeve Length (SL): 12-40"
- WT = Waist (WT): 16-60"
- HP = Hip (HP): 20-65"
- LP = Lap (LP): 18-45"
- CF = Calf (CF): 8-25"
- NK = Neck (NK): 8-25"
- ST = Stomach (ST): 18-65"

⚠️ VALIDATION RULES:
1. All measurements must be positive numbers
2. Values outside realistic ranges will be flagged as errors
3. Essential measurements: Chest (CH), Stomach (ST), Sleeve Length (SL), Shoulder (SH)
4. Dual entries like "LT 31/37" mean: Top Length=31, Trouser Length=37
5. Ask for clarification if measurements seem unrealistic

🔍 EXAMPLE VALID MESSAGE:
"CH 39 ST 33 SL 23 SH 17 LT 27/31 RD 13/15 NK 16 WT 30.5 Kofi"
- This creates separate entries for Top Length (27) and Trouser Length (31)
- Plus separate entries for Bicep Round (13) and Ankle Round (15)
  `.trim();
}

/**
 * Get a summary of validation results for the agent
 */
export function getValidationSummary(validated: ValidatedMeasurements): string {
  const totalMeasurements = validated.singleMeasurements.length + validated.dualMeasurements.length;
  const validMeasurements = validated.singleMeasurements.filter(m => m.isValid).length + 
                           validated.dualMeasurements.filter(m => m.isValid).length;
  
  let summary = `📊 MEASUREMENT VALIDATION SUMMARY:\n`;
  summary += `✅ Valid measurements: ${validMeasurements}/${totalMeasurements}\n`;
  
  if (validated.errors.length > 0) {
    summary += `❌ Errors: ${validated.errors.length}\n`;
    validated.errors.forEach((error, i) => {
      summary += `   ${i + 1}. ${error}\n`;
    });
  }
  
  if (validated.warnings.length > 0) {
    summary += `⚠️ Warnings: ${validated.warnings.length}\n`;
    validated.warnings.forEach((warning, i) => {
      summary += `   ${i + 1}. ${warning}\n`;
    });
  }
  
  return summary;
}