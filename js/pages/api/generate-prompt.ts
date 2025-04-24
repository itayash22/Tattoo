// pages/api/generate-prompt.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Configuration, OpenAIApi } from 'openai'
import { savePrompt } from '../../lib/supabaseClient'

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY })
const openai = new OpenAIApi(configuration)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, imageId, style, cropCoords, skinTone } = req.body

  // 1) build your dynamic system + user messages
  const systemMsg = {
    role: 'system' as const,
    content: `You are a tattoo‐design assistant. Given image metadata, you produce a single prompt that guides an image model to draw a tattoo overlay that follows skin features.`
  }
  const userMsg = {
    role: 'user' as const,
    content: `
      Style: ${style}
      Crop: ${JSON.stringify(cropCoords)}
      Skin tone descriptor: ${skinTone}
      Instructions: Generate a concise prompt like "Create a ${style} tattoo of a rose vine following the scar’s curve with opacity matching olive skin."
    `.trim()
  }

  // 2) call ChatGPT
  const completion = await openai.createChatCompletion({
    model: 'gpt-4o-mini',   // or 'gpt-4-turbo'
    messages: [systemMsg, userMsg],
    temperature: 0.7
  })

  const promptText = completion.data.choices[0].message?.content?.trim()
  if (!promptText) return res.status(500).json({ error: 'No prompt generated' })

  // 3) persist the prompt
  await savePrompt(userId, imageId, style, promptText)

  // 4) return for your image‐generation step
  res.status(200).json({ prompt: promptText })
}
