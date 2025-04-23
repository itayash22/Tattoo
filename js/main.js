import { setupCropper } from './initCropper.js';
import { attachPromptButtons } from './promptHelpers.js';

const fileInput   = document.getElementById('fileInput');
const img         = document.getElementById('uploadedImage');
const promptInput = document.getElementById('promptInput');
const suggestions = document.getElementById('suggestions');
const submitBtn   = document.getElementById('submitBtn');
const uploadPage  = document.getElementById('uploadPage');
const resultPage  = document.getElementById('resultPage');
const resultImage = document.getElementById('resultImage');
const downloadBtn = document.getElementById('downloadBtn');

let cropper;

// allow native scroll when touching outside the crop box
document.addEventListener('touchstart', (e) => {
  if (!cropper) return;
  // only intercept if starting in the Cropper container
  if (!e.target.closest('.cropper-container')) return;
  // if touch is outside the crop box, disable cropper
  if (!e.target.closest('.cropper-crop-box')) {
    cropper.disable();
    const reenable = (e2) => {
      if (e2.target.closest('.cropper-crop-box')) {
        cropper.enable();
        document.removeEventListener('touchstart', reenable, true);
      }
    };
    document.addEventListener('touchstart', reenable, true);
  }
}, true);

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  img.src = URL.createObjectURL(file);
  img.classList.remove('hidden');

  cropper?.destroy();
  cropper = setupCropper(img);

  promptInput.classList.remove('hidden');
  suggestions.classList.remove('hidden');
  submitBtn.classList.remove('hidden');
});

// hook up the “best‐practice” buttons
attachPromptButtons(suggestions, promptInput);

submitBtn.addEventListener('click', async () => {
  submitBtn.disabled = true;
  submitBtn.textContent = 'Generating...';

  const cropData = cropper.getData(true);
  const blob = await new Promise(res => 
    cropper.getCroppedCanvas().toBlob(res, 'image/jpeg', 0.9)
  );

  const form = new FormData();
  form.append('image', blob, 'crop.jpg');
  form.append('prompt', promptInput.value);
  form.append('cropData', JSON.stringify(cropData));

  try {
    const resp = await fetch('/api/generate-tattoo', { method: 'POST', body: form });
    const { imageUrl } = await resp.json();
    uploadPage.classList.add('hidden');
    resultPage.classList.remove('hidden');
    resultImage.src = imageUrl;
    downloadBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = 'tattoo-preview.jpg';
      a.click();
    });
  } catch (err) {
    alert('Error generating preview');
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Generate Preview';
  }
});
