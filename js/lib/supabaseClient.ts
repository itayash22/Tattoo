// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // or anon key if using RLS
)

export async function savePrompt(userId: string, imageId: string, style: string, promptText: string) {
  const { data, error } = await supabase
    .from('prompts')
    .insert([{ user_id: userId, image_id: imageId, style, prompt_text: promptText }])

  if (error) throw error
  return data
}

export default supabase
