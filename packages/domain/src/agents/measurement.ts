import { z } from 'zod';

export const MeasurementDataSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  chest_ch: z.string().optional(),
  shoulder_sh: z.string().optional(),
  sleeve_length_sl: z.string().optional(),
  top_length_lt: z.string().optional(),  // LT abbreviation
  waist_wt: z.string().optional(),
  hip_hp: z.string().optional(),
  lap_lp: z.string().optional(),
  trouser_length_lt: z.string().optional(),
  ankle_round_rd: z.string().optional(),
  bicep_round_rd: z.string().optional(),
  calf_cf: z.string().optional(),
  neck_nk: z.string().optional(),
  stomach_st: z.string().optional(),
  notes: z.string().optional(),
});

export const MeasurementResponseSchema = z.object({
  success: z.boolean(),
  measurement_id: z.string().optional(),
  record_url: z.string().optional(),
  message: z.string(),
});

export type MeasurementData = z.infer<typeof MeasurementDataSchema>;
export type MeasurementResponse = z.infer<typeof MeasurementResponseSchema>;

// Measurement abbreviation mappings
export const MEASUREMENT_MAPPINGS = {
  'CH': 'chest_ch',
  'ST': 'stomach_st',
  'SL': 'sleeve_length_sl',
  'SH': 'shoulder_sh',
  'LT': 'top_length_lt',
  'WT': 'waist_wt',
  'HP': 'hip_hp',
  'LP': 'lap_lp',
  'RB': 'bicep_round_rd',
  'RD': 'bicep_round_rd',
  'CF': 'calf_cf',
  'NK': 'neck_nk',
  'LB': 'lap_lp',
};