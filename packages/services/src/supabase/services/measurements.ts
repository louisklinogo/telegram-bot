import { getSupabaseServiceClient } from '../../supabaseClient';
import type { MeasurementRecord, MeasurementValueRecord } from '../types';

const MEASUREMENTS_TABLE = 'measurements';
const MEASUREMENT_VALUES_TABLE = 'measurement_values';

export interface MeasurementValueInput {
  key: string;
  value: string | number;
}

export interface CreateMeasurementInput {
  clientId: string;
  recordName: string;
  notes?: string | null;
  takenAt?: string | null;
  values: MeasurementValueInput[];
}

const NUMERIC_KEYS = new Set(['chest', 'shoulder', 'sleeves', 'neck', 'waist', 'lap', 'stomach', 'hip']);

export async function createMeasurement(input: CreateMeasurementInput): Promise<{
  measurement: MeasurementRecord;
  values: MeasurementValueRecord[];
}> {
  const supabase = getSupabaseServiceClient();

  const { data: measurement, error: measurementError } = await supabase
    .from(MEASUREMENTS_TABLE)
    .insert({
      client_id: input.clientId,
      record_name: input.recordName,
      notes: input.notes || null,
      taken_at: input.takenAt || null,
    })
    .select('*')
    .maybeSingle();

  if (measurementError) {
    throw new Error(`Failed to create measurement: ${measurementError.message}`);
  }

  if (!measurement) {
    throw new Error('Supabase returned no measurement data after insert');
  }

  const measurementRecord = measurement as MeasurementRecord;

  if (input.values.length === 0) {
    return { measurement: measurementRecord, values: [] };
  }

  const payload = input.values.map(({ key, value }) => {
    const keyNormalized = key.toLowerCase();
    const numeric = typeof value === 'number' ? value : parseFloat(String(value));
    const isNumericKey = NUMERIC_KEYS.has(keyNormalized) && !Number.isNaN(numeric);

    return {
      measurement_id: measurement.id,
      key: keyNormalized,
      value_text: isNumericKey ? null : String(value),
      value_num: isNumericKey ? numeric : null,
    };
  });

  const { data: values, error: valuesError } = await supabase
    .from(MEASUREMENT_VALUES_TABLE)
    .insert(payload)
    .select('*');

  if (valuesError) {
    throw new Error(`Failed to create measurement values: ${valuesError.message}`);
  }

  return {
    measurement: measurementRecord,
    values: (values as MeasurementValueRecord[] | null) ?? [],
  };
}
