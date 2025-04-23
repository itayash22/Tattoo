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

// Enable native page scroll when touching outside the crop box
document.addEventListener('touchstart', (e) => {
  if (!cropper) return;
  // Only intercept touches within Cropper's overlay
  if (!e.target.closest('.cropper-container')) return;
  // If touch starts outside the crop box, disable Cropper
  if (!e.target.closest('.cropper-crop-box')) {
    cropper.disable();
    // Re-enable on next touch inside the crop box
    const handleReenable = (ev) => {
      if (ev.target.closest('.cropper-crop-box')) {
        cropper.enable();
        document.removeEventListener('touchstart', handleReenable, true);
      }
    };
    document.addEventListener('touchstart', handleReenable, true);
  }
}, true);

// Initialize Cropper when a file is selected
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  img.src = url;
  img.classList.remove('hidden');

  cropper?.destroy();
  cropper = setupCropper(img);

  promptInput.classList.remove('hidden');
  suggestions.classList.remove('hidden');
  submitBtn.classList.remove('hidden');
});

// Attach keyword helper buttons
attachPromptButtons(suggestions, promptInput);

// Handle the Generate Preview button
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
