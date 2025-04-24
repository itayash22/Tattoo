// js/pages/api/generate-tattoo.js
import { Configuration, OpenAIApi } from 'openai'
import supabase from '../../lib/supabaseClient'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(configuration)

export default async function handler(req, res) {
  const { userId, image, mask, style, cropCoords, skinTone } = req.body

  // 1️⃣ Generate the tattoo prompt via your ChatGPT agent
  const promptRes = await fetch('/api/generate-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      imageId:  image.id,
      style,
      cropCoords,
      skinTone
    })
  })
  if (!promptRes.ok) {
    const err = await promptRes.json()
    console.error('Prompt service error:', err)
    return res.status(500).json({ error: 'Failed to generate prompt', detail: err })
  }
  const { prompt } = await promptRes.json()

  // 2️⃣ Call your image engine (DALL·E example)
  const imgResp = await openai.createImage({
    prompt,
    n:    1,
    size: '1024x1024',
    user: userId
  })
  const imageUrl = imgResp.data[0].url

  // 3️⃣ Persist the final tattoo record
  await supabase
    .from('tattoos')
    .insert([{
      user_id:   userId,
      image_id:  image.id,
      prompt,
      image_url: imageUrl
    }])

  // 4️⃣ Return the generated image URL
  res.status(200).json({ imageUrl })
}
