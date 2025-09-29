import { getSupabaseServiceClient } from '../../supabaseClient';
import type { FileRecord } from '../types';

const FILES_TABLE = 'files';

export interface CreateFileInput {
  cloudinary_public_id: string;
  cloudinary_url: string;
  file_type: 'photo' | 'document' | 'other';
  telegram_file_id?: string | null;
  chat_id?: number | null;
  caption?: string | null;
}

export async function recordFile(input: CreateFileInput): Promise<FileRecord> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from(FILES_TABLE)
    .insert({
      cloudinary_public_id: input.cloudinary_public_id,
      cloudinary_url: input.cloudinary_url,
      file_type: input.file_type,
      telegram_file_id: input.telegram_file_id ?? null,
      chat_id: input.chat_id ?? null,
      caption: input.caption ?? null,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to record file metadata: ${error.message}`);
  }

  if (!data) {
    throw new Error('Supabase returned no file data after insert');
  }

  return data as FileRecord;
}
