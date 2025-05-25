// js/pages/api/generate-tattoo.js
import { Configuration, OpenAIApi } from 'openai'
import supabase from '../../lib/supabaseClient'
import fs from 'fs'
import path from 'path'
import { parseStringPromise } from 'xml2js'
import sharp from 'sharp'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(configuration)

export default async function handler(req, res) {
  // Ensure that the request body is parsed correctly, especially if using FormData
  // For this example, assuming req.body is already parsed by a middleware
  // If using formidable or similar, you might need to handle file streams and fields differently

  const { userId, image, style, skinTone, originalFilename, cropData: cropDataString } = req.body;

  if (!image || !originalFilename || !cropDataString) {
    return res.status(400).json({ error: 'Missing required parameters: image, originalFilename, or cropData' });
  }

  let cropData;
  try {
    cropData = JSON.parse(cropDataString);
  } catch (error) {
    console.error('Failed to parse cropData:', error);
    return res.status(400).json({ error: 'Invalid cropData format. Expected a JSON string.' });
  }

  // 1️⃣ Generate the tattoo prompt via your ChatGPT agent
  // Note: cropCoords might need to be derived from cropData or passed explicitly if different
  const cropCoords = { x: cropData.x, y: cropData.y, width: cropData.width, height: cropData.height };

  const promptRes = await fetch('/api/generate-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      // Assuming image.id is available; if image is a File object, you might not have image.id
      // imageId: image.id, // This might need adjustment based on how 'image' is passed
      style,
      cropCoords, // ensure cropCoords is what generate-prompt expects
      skinTone
    })
  })
  if (!promptRes.ok) {
    const err = await promptRes.json()
    console.error('Prompt service error:', err)
    return res.status(500).json({ error: 'Failed to generate prompt', detail: err })
  }
  const { prompt } = await promptRes.json()

  // Scar label processing
  const originalFilenameWithoutExtension = originalFilename.includes('.') ? originalFilename.substring(0, originalFilename.lastIndexOf('.')) : originalFilename;
  const scarLabelPath = path.join(process.cwd(), 'assets', 'ai_data', 'scar_labels', `${originalFilenameWithoutExtension}.xml`);

  let scarBoundingBox = null;
  let maskImageBuffer = null; // This will hold the buffer for the mask image

  try {
    if (fs.existsSync(scarLabelPath)) {
      const xmlData = fs.readFileSync(scarLabelPath, 'utf-8');
      const parsedXml = await parseStringPromise(xmlData);

      if (parsedXml.annotation && parsedXml.annotation.object) {
        const scarObject = parsedXml.annotation.object.find(obj => obj.name && obj.name[0] === 'scar');
        if (scarObject && scarObject.bndbox && scarObject.bndbox[0]) {
          scarBoundingBox = {
            xmin: parseInt(scarObject.bndbox[0].xmin[0], 10),
            ymin: parseInt(scarObject.bndbox[0].ymin[0], 10),
            xmax: parseInt(scarObject.bndbox[0].xmax[0], 10),
            ymax: parseInt(scarObject.bndbox[0].ymax[0], 10),
          };
        }
      }
    }
  } catch (error) {
    console.error('Error processing scar label XML:', error);
    // Proceed without scar information if XML processing fails
    scarBoundingBox = null;
  }

  // Convert uploaded image (which is likely a string path or a File object) to a Buffer
  // This part is crucial and depends on how 'image' is received.
  // If 'image' is a path to a temporary file uploaded:
  // const imageBuffer = fs.readFileSync(image.filepath); // example if image is {filepath: '...'}
  // If 'image' is a base64 string or another format, adjust accordingly.
  // For this example, let's assume 'image' is a path to the uploaded cropped image file.
  // This needs to be robustly handled based on your setup (e.g., using formidable to parse FormData).
  // Let's assume 'image' is an object like { path: 'path/to/tmp/file' } from a previous middleware.
  // If req.body.image is a File object from client-side FormData, it needs to be handled by server-side parsing.
  // Next.js API routes typically parse FormData, making file objects available.
  // To use with sharp, you might need the file's path or to read it into a buffer.

  // For the sake of this example, let's assume 'image' is a file path that can be read.
  // This is a placeholder and needs to be correctly implemented based on your file upload handling.
  // If image is a data URL or Buffer already, this step would be different.
  // If image is passed as a File object from the client (e.g. via FormData)
  // Next.js/Vercel might store it in a temporary location, or you might need a library like `formidable`.
  // Let's assume `image` is an object with a `filepath` property, like: `image = { filepath: '/tmp/uploaded_file.png' }`
  // THIS IS A CRITICAL PART TO GET RIGHT BASED ON YOUR ACTUAL FILE UPLOAD MECHANISM
  
  // Assuming `req.body.image` is an object with a `path` or `filepath` property after being processed by a prior middleware (e.g., formidable).
  // If `req.body.image` is a `File` object from `FormData` directly in a Next.js API route,
  // you might need to read its contents into a buffer. Example:
  // const imageFile = req.body.image; // This is a File object
  // const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
  // For now, we will assume `image` itself is the buffer or can be directly used by sharp.
  // This part needs to be adapted to how the image data is actually received.
  
  // Let's assume `req.body.image` is a `File` object. We need its buffer.
  // This is a common pattern if you're using a modern setup that parses FormData.
  let imageBuffer;
  if (req.body.image.path) { // Example if using something like formidable that puts file at a path
      imageBuffer = fs.readFileSync(req.body.image.path);
  } else if (typeof req.body.image.arrayBuffer === 'function') { // Standard File object
      imageBuffer = Buffer.from(await req.body.image.arrayBuffer());
  } else {
      // Fallback or error if image format is not recognized
      console.error("Unrecognized image format in request body:", req.body.image);
      return res.status(400).json({ error: "Unrecognized image format for 'image' field." });
  }


  // Get dimensions of the cropped image
  const croppedImageMetadata = await sharp(imageBuffer).metadata();
  const croppedWidth = croppedImageMetadata.width;
  const croppedHeight = croppedImageMetadata.height;

  if (scarBoundingBox) {
    // Transform scar coordinates and generate mask
    const scar_xmin_abs = scarBoundingBox.xmin;
    const scar_ymin_abs = scarBoundingBox.ymin;
    const scar_xmax_abs = scarBoundingBox.xmax;
    const scar_ymax_abs = scarBoundingBox.ymax;

    // Calculate intersection
    const intersect_xmin = Math.max(scar_xmin_abs, cropData.x);
    const intersect_ymin = Math.max(scar_ymin_abs, cropData.y);
    const intersect_xmax = Math.min(scar_xmax_abs, cropData.x + cropData.width);
    const intersect_ymax = Math.min(scar_ymax_abs, cropData.y + cropData.height);

    if (intersect_xmax > intersect_xmin && intersect_ymax > intersect_ymin) {
      // Scar is visible in the cropped area
      const scar_xmin_cropped = intersect_xmin - cropData.x;
      const scar_ymin_cropped = intersect_ymin - cropData.y;
      const scar_width_cropped = intersect_xmax - intersect_xmin;
      const scar_height_cropped = intersect_ymax - intersect_ymin;

      // Create a mask: black background, white rectangle for the scar
      // OpenAI requires the mask to be a RGBA PNG where transparent areas are edited.
      // So, we make the scar area transparent (or white, depending on interpretation - docs say "alpha channel")
      // Let's create a black image and make the scar area transparent.
      maskImageBuffer = await sharp({
        create: {
          width: croppedWidth,
          height: croppedHeight,
          channels: 4, // RGBA
          background: { r: 0, g: 0, b: 0, alpha: 1 } // Opaque black
        }
      })
      .composite([{
        input: Buffer.from(
          `<svg><rect x="${scar_xmin_cropped}" y="${scar_ymin_cropped}" width="${scar_width_cropped}" height="${scar_height_cropped}" fill="white"/></svg>`
        ),
        // The blend mode 'dest-out' uses the input image (SVG rect) as an alpha mask.
        // Where the input is white, the output alpha becomes 0 (transparent).
        // Where the input is black (or transparent), the output alpha is preserved.
        // Since our SVG rect is white, this will make the scar area transparent.
        blend: 'dest-out' 
      }])
      .png()
      .toBuffer();
    } else {
      // Scar is not in the cropped area, treat as no scar
      scarBoundingBox = null; // fall through to full mask
    }
  }

  if (!scarBoundingBox) { // No scar label found or scar outside crop
    // Create a mask that makes the entire image editable (fully transparent or fully white, depending on OpenAI's mask interpretation)
    // OpenAI: "The transparent areas of the mask are those that will be edited."
    // So, a fully transparent mask means the whole image is edited.
    maskImageBuffer = await sharp({
      create: {
        width: croppedWidth,
        height: croppedHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Fully transparent
      }
    })
    .png()
    .toBuffer();
  }
  
  // Ensure imageBuffer is in a format OpenAI accepts (e.g., PNG)
  // If imageBuffer is already a PNG, this might be redundant but ensures consistency.
  // DALL-E expects a square PNG image less than 4MB.
  // The size parameter for createImageEdit should match the actual image dimensions.
  const preparedImageBuffer = await sharp(imageBuffer).resize(1024, 1024, { fit: 'contain', background: {r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  const preparedMaskBuffer = await sharp(maskImageBuffer).resize(1024, 1024, { fit: 'contain', background: {r:0,g:0,b:0,alpha:0}}).png().toBuffer();


  // 2️⃣ Call OpenAI's createImageEdit
  // Ensure image and mask are passed as File-like objects or Buffers OpenAI SDK can handle.
  // The SDK typically handles Buffers by converting them internally.
  // The `image` and `mask` parameters expect a file (like `fs.createReadStream` or a Buffer in newer SDK versions).
  // Forcing a filename for the buffer helps the SDK determine the type.
  
  // Hack to make buffer look like a file for older openai versions if needed
  // preparedImageBuffer.path = 'image.png'; 
  // preparedMaskBuffer.path = 'mask.png';

  const imgResp = await openai.createImageEdit(
    // @ts-ignore - The OpenAI SDK v4 expects a `FileReadStream` or similar, but Buffers work.
    // The SDK internally converts the buffer to a stream.
    // Providing a "filename" helps the SDK determine the content type if it were ambiguous.
    Object.defineProperty(preparedImageBuffer, 'name', { value: 'image.png', writable: false });
    Object.defineProperty(preparedMaskBuffer, 'name', { value: 'mask.png', writable: false });

    preparedImageBuffer, // image file/buffer
    prompt,
    // @ts-ignore
    preparedMaskBuffer, // mask file/buffer
    1, // n
    '1024x1024', // size must be one of "256x256", "512x512", "1024x1024" for DALL-E 2
    // If using DALL-E 3, this parameter might be different or support other resolutions.
    // We are resizing to 1024x1024, so this is consistent.
    undefined, // response_format
    userId
  );
  const imageUrl = imgResp.data.data[0].url;


  // 3️⃣ Persist the final tattoo record
  await supabase
    .from('tattoos')
    .insert([{
      user_id:   userId,
      // image_id: image.id, // As discussed, image.id is likely not available from File object.
      // Ensure your DB schema for 'tattoos' table allows nullable image_id or remove it.
      prompt,
      image_url: imageUrl,
      original_filename: originalFilename,
      crop_data: cropData // cropData is already a JS object here
    }])

  // 4️⃣ Return the generated image URL
  res.status(200).json({ imageUrl })
}
