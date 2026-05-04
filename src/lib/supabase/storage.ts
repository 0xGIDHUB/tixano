import { supabase } from './client';

export async function uploadEventImage(
  file: File,
  folder: 'covers' | 'banners'
): Promise<string> {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('event-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from('event-images')
    .getPublicUrl(fileName);

  return data.publicUrl;
}