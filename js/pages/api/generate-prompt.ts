// pages/api/generate-prompt.ts
console.log('🔑 OPENAI_API_KEY =', process.env.OPENAI_API_KEY)

import type { NextApiRequest, NextApiResponse } from 'next'
import { Configuration, OpenAIApi } from 'openai'
import { savePrompt } from '../../lib/supabaseClient'

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY })
const openai = new OpenAIApi(configuration)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, imageId, style, cropCoords: originalCropCoords, skinTone, scarBboxCropped } = req.body

  // 1) build your dynamic system + user messages
  const systemMsg = {
    role: 'system' as const,
    content: `You are a tattoo‐design assistant. Given image metadata, you produce a single prompt that guides an image model to draw a tattoo overlay that follows skin features, potentially integrating with or covering scars.`
  }

  let userMessageContent: string;

  if (scarBboxCropped && 
      typeof scarBboxCropped.xmin === 'number' &&
      typeof scarBboxCropped.ymin === 'number' &&
      typeof scarBboxCropped.xmax === 'number' &&
      typeof scarBboxCropped.ymax === 'number') {
    userMessageContent = `
      Style: ${style}
      Original image crop coordinates (where user selected on the original image): ${JSON.stringify(originalCropCoords)}
      Skin tone descriptor: ${skinTone}
      A scar is present in the user's selected skin area. This scar is located within the bounding box (relative to the cropped image section that will be edited): xmin=${scarBboxCropped.xmin}, ymin=${scarBboxCropped.ymin}, xmax=${scarBboxCropped.xmax}, ymax=${scarBboxCropped.ymax}.
      Instructions: Generate a concise prompt for an image model to create a ${style} tattoo that artfully integrates with, covers, or is placed thoughtfully in relation to the scar within this specific bounding box. The design should be suitable for the specified skin tone. For example, "A ${style} ${style === 'realistic' ? 'serpent' : 'design'} coiling around the scar at (xmin:${scarBboxCropped.xmin}, ymin:${scarBboxCropped.ymin}, xmax:${scarBboxCropped.xmax}, ymax:${scarBboxCropped.ymax}), matching ${skinTone} skin."
    `.trim();
  } else {
    userMessageContent = `
      Style: ${style}
      Crop (original selection on image): ${JSON.stringify(originalCropCoords)}
      Skin tone descriptor: ${skinTone}
      Instructions: Generate a concise prompt like "Create a ${style} tattoo of a rose vine, with opacity matching ${skinTone} skin, within the specified crop area."
    `.trim();
  }

  const userMsg = {
    role: 'user' as const,
    content: userMessageContent
  }

  // 2) call ChatGPT
  const completion = await openai.createChatCompletion({
    model: 'gpt-4o-mini',
    messages: [systemMsg, userMsg],
    temperature: 0.7
  })

  const promptText = completion.data.choices[0].message?.content?.trim()
  if (!promptText) {
    return res.status(500).json({ error: 'No prompt generated' })
  }

  // 3) persist the prompt
  await savePrompt(userId, imageId, style, promptText)

  // 4) return for your image-generation step
  res.status(200).json({ prompt: promptText })
}
