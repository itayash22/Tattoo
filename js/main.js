// js/main.js
import { setupCropper } from './initCropper.js';
import { attachPromptButtons } from './promptHelpers.js';

// Toggle fake API responses for development/demo
const USE_FAKE_API = true;

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

// Fake API: returns a dummy tattoo preview + artist recommendations
function fakeGenerateTattoo() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        imageUrl: 'assets/fake-preview.jpg',
        artists: [
          { name: 'Ari Tattoo', link: 'https://ari-inks.example.com' },
          { name: 'Skin Story', link: 'https://skinstory.example.com' },
          { name: 'Ink & Soul', link: 'https://inkandsoul.example.com' }
        ]
      });
    }, 1200);
  });
}

// Enable native page scroll when touching outside the crop box
document.addEventListener('touchstart', (e) => {
  if (!cropper) return;
  if (!e.target.closest('.cropper-container')) return;
  if (!e.target.closest('.cropper-crop-box')) {
    cropper.disable();
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
  img.src = URL.createObjectURL(file);
  img.classList.remove('hidden');

  cropper?.destroy();
  cropper = setupCropper(img);

  promptInput.classList.remove('hidden');
  suggestions.classList.remove('hidden');
  submitBtn.classList.remove('hidden');
});

// Attach keyword helper buttons
attachPromptButtons(suggestions, promptInput);

// Handle the Generate Preview button click
typeof submitBtn === 'object' && submitBtn.addEventListener('click', async () => {
  submitBtn.disabled = true;
  submitBtn.textContent = 'Generating...';

  const cropData = cropper.getData(true);
  const blob = await new Promise(res => cropper.getCroppedCanvas().toBlob(res, 'image/jpeg', 0.9));

  // In real mode, you would append form data and call your backend.
  let data;
  if (USE_FAKE_API) {
    data = await fakeGenerateTattoo();
  } else {
    const form = new FormData();
    form.append('image', blob, 'crop.jpg');
    form.append('prompt', promptInput.value);
    form.append('cropData', JSON.stringify(cropData));

    const resp = await fetch('/api/generate-tattoo', { method: 'POST', body: form });
    data = await resp.json();
  }

  // Show preview image
  uploadPage.classList.add('hidden');
  resultPage.classList.remove('hidden');
  resultImage.src = data.imageUrl;

  // Render artist recommendations
  const list = document.createElement('div');
  list.id = 'artistList';
  list.style.marginTop = '1rem';
  list.innerHTML = '<h2>Recommended Artists</h2>' + 
    data.artists.map(a => `<p><a href="${a.link}" target="_blank">${a.name}</a></p>`).join('');
  resultPage.appendChild(list);

  // Download button
  downloadBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = data.imageUrl;
    a.download = 'tattoo-preview.jpg';
    a.click();
  });

  submitBtn.disabled = false;
  submitBtn.textContent = 'Generate Preview';
});
