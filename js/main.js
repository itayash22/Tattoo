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

// Fake API: returns a dummy tattoo preview + artist recommendations
function fakeGenerateTattoo() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        imageUrl: 'assets/fake-preview.jpg',
        artists: [
          {
            artist_id: 1,
            name: 'Ink Masters',
            affiliate_url: 'https://affiliates.example.com/inkmasters',
            thumbnail: 'assets/artists/inkmasters-thumb.jpg',
            bio: 'Specializes in realistic tattoos'
          },
          {
            artist_id: 2,
            name: 'Tattoo Soul',
            affiliate_url: 'https://affiliates.example.com/tattoosoul',
            thumbnail: 'assets/artists/tattoosoul-thumb.jpg',
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
    const reenable = ev => {
      if (ev.target.closest('.cropper-crop-box')) {
        cropper.enable();
        document.removeEventListener('touchstart', reenable, true);
      }
    };
    document.addEventListener('touchstart', reenable, true);
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
  document.getElementById('artistList')?.remove();

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

    // Summary: name only (clickable link)
    const summary = document.createElement('summary');
    summary.style.cursor = 'pointer';
    summary.innerHTML = `
      <a href="${artist.affiliate_url}" target="_blank" style="text-decoration:none;color:inherit;">
        ${artist.name}
      </a>
    `;
    drawer.appendChild(summary);

    // Expanded info: WhatsApp interaction box
    const info = document.createElement('div');
    info.style.padding = '0.5rem 1rem';
    info.innerHTML = `
      <div style="display:flex;align-items:center;margin-bottom:0.5rem;">
        <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="WhatsApp" 
          style="width:24px;height:24px;object-fit:contain;margin-right:0.5rem;">
        <span>Chat with ${artist.name} on WhatsApp:</span>
      </div>
      <textarea placeholder="Type your message..." 
        style="width:100%;height:60px;border:1px solid #ccc;border-radius:4px;padding:0.5rem;resize:none;"></textarea>
      <button style="margin-top:0.5rem;padding:0.5rem 1rem;background:#25D366;color:#fff;border:none;border-radius:4px;cursor:pointer;">
        Send Message
      </button>
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
