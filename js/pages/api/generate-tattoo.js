// js/pages/api/generate-tattoo.js
import { Configuration, OpenAIApi } from 'openai'
import supabase from '../../lib/supabaseClient'   // adjust path if needed

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(configuration)

export default async function handler(req, res) {
  const { userId, image, mask, style, cropCoords, skinTone } = req.body

  // 1) ask your ChatGPT agent for the prompt
  const promptRes = await fetch('/api/generate-prompt', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      userId,
      imageId: image.id,
      style,
      cropCoords,
      skinTone
    })
  })
  if (!promptRes.ok) {
    const err = await promptRes.json()
    return res.status(500).json({ error: 'Prompt service failed', detail: err })
  }
  const { prompt } = await promptRes.json()

  // 2) call your image engine (DALL·E example)
  const imgResp = await openai.createImage({
    prompt,
    n:    1,
    size: '1024x1024',
    user: userId
    // for inpainting you’d also pass image.buffer + mask.buffer
  })
  const imageUrl = imgResp.data[0].url

  // 3) record the final tattoo entry (optional)
  await supabase
    .from('tattoos')
    .insert([{
      user_id:   userId,
      image_id:  image.id,
      prompt,
      image_url: imageUrl
    }])

  // 4) return the generated URL
  res.status(200).json({ imageUrl })
}
