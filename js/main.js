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

// Fake API: returns a dummy tattoo preview + detailed artist info
function fakeGenerateTattoo() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        imageUrl: 'assets/fake-preview.jpg',
        artists: [
          {
            name: 'Ari Tattoo',
            link: 'https://ari-inks.example.com',
            thumbnail: 'assets/artists/ari-thumb.jpg',
            rating: 4.8,
            description: 'Expert in tribal and geometric designs.'
          },
          {
            name: 'Skin Story',
            link: 'https://skinstory.example.com',
            thumbnail: 'assets/artists/skinstory-thumb.jpg',
            rating: 4.5,
            description: 'Specializes in watercolor and fine-line tattoos.'
          },
          {
            name: 'Ink & Soul',
            link: 'https://inkandsoul.example.com',
            thumbnail: 'assets/artists/inksoul-thumb.jpg',
            rating: 4.9,
            description: 'Renowned for portrait and realism work.'
          }
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
submitBtn.addEventListener('click', async () => {
  submitBtn.disabled = true;
  submitBtn.textContent = 'Generating...';

  // Gather cropped image data
  const cropData = cropper.getData(true);
  const blob = await new Promise(res =>
    cropper.getCroppedCanvas().toBlob(res, 'image/jpeg', 0.9)
  );

  // Fetch from real or fake API
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

  // Remove any existing artist list
  const existing = document.getElementById('artistList');
  if (existing) existing.remove();

  // Build artist drawers
  const artistContainer = document.createElement('div');
  artistContainer.id = 'artistList';
  artistContainer.style.marginTop = '1rem';

  const heading = document.createElement('h2');
  heading.textContent = 'Recommended Artists';
  artistContainer.appendChild(heading);

  data.artists.forEach(artist => {
    const drawer = document.createElement('details');
    drawer.style.marginBottom = '0.5rem';

    // Summary: thumbnail + name
    const summary = document.createElement('summary');
    summary.style.cursor = 'pointer';
    summary.innerHTML = `
      <img src="${artist.thumbnail}" alt="${artist.name}" 
        style="width:40px;height:40px;object-fit:cover;border-radius:4px;margin-right:0.5rem;vertical-align:middle;">
      <span>${artist.name}</span>
    `;
    drawer.appendChild(summary);

    // Expanded info
    const info = document.createElement('div');
    info.style.padding = '0.5rem 1rem';
    info.innerHTML = `
      <p><strong>Rating:</strong> ${artist.rating} / 5</p>
      <p>${artist.description}</p>
      <p><a href="${artist.link}" target="_blank">Visit Artist</a></p>
    `;
    drawer.appendChild(info);

    artistContainer.appendChild(drawer);
  });

  resultPage.appendChild(artistContainer);

  // Download button action
  downloadBtn.onclick = () => {
    const a = document.createElement('a');
    a.href = data.imageUrl;
    a.download = 'tattoo-preview.jpg';
    a.click();
  };

  submitBtn.disabled = false;
  submitBtn.textContent = 'Generate Preview';
});
