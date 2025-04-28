// js/main.js
import { setupCropper } from './initCropper.js';
import { attachPromptButtons } from './promptHelpers.js';

// Toggle fake API responses for development/demo
const USE_FAKE_API = true;

// DOM elements
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

// Fake API: returns a dummy tattoo preview + artist recommendations matching your DB schema
function fakeGenerateTattoo() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        imageUrl: 'assets/fake-preview.jpg',
        artists: [
          {
            artist_id: 1,
            name: 'Ink Masters',
            location: 'New York, NY',
            rating: 5,
            affiliate_url: 'https://affiliates.example.com/inkmasters',
            bio: 'Specializes in realistic tattoos'
          },
          {
            artist_id: 2,
            name: 'Tattoo Soul',
            location: 'Los Angeles, CA',
            rating: 4,
            affiliate_url: 'https://affiliates.example.com/tattoosoul',
            bio: 'Creative fine-line designs'
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

  // Build artist drawers with default summary info (name, location, rating)
  const artistContainer = document.createElement('div');
  artistContainer.id = 'artistList';
  artistContainer.style.marginTop = '1rem';

  const heading = document.createElement('h2');
  heading.textContent = 'Recommended Artists';
  artistContainer.appendChild(heading);

  data.artists.forEach(artist => {
    const drawer = document.createElement('details');
    drawer.style.marginBottom = '0.5rem';

    // Summary: name, location, rating
    const summary = document.createElement('summary');
    summary.style.cursor = 'pointer';
    summary.innerHTML = `
      <strong>${artist.name}</strong>
      <span style="margin-left:0.5rem;color:#666">${artist.location}</span>
      <span style="margin-left:0.5rem;color:#FFD700">★ ${artist.rating}</span>
    `;
    drawer.appendChild(summary);

    // Expanded info: bio + affiliate link
    const info = document.createElement('div');
    info.style.padding = '0.5rem 1rem';
    info.innerHTML = `
      <p>${artist.bio}</p>
      <p><a href="${artist.affiliate_url}" target="_blank">Visit Artist</a></p>
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
