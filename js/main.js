import { setupCropper } from './initCropper.js';
import { attachPromptButtons } from './promptHelpers.js';

const fileInput     = document.getElementById('fileInput');
const img           = document.getElementById('uploadedImage');
const promptInput   = document.getElementById('promptInput');
const suggestions   = document.getElementById('suggestions');
const submitBtn     = document.getElementById('submitBtn');
const uploadPage    = document.getElementById('uploadPage');
const resultPage    = document.getElementById('resultPage');
const resultImage   = document.getElementById('resultImage');
const downloadBtn   = document.getElementById('downloadBtn');

let cropper;

// Enable page scroll when touching outside the crop box
```js
document.addEventListener('touchstart', (e) => {
  if (!cropper) return;
  if (!e.target.closest('.cropper-container')) return;
  if (!e.target.closest('.cropper-crop-box')) {
    cropper.disable();
    const onInside = (e2) => {
      if (e2.target.closest('.cropper-crop-box')) {
        cropper.enable();
        document.removeEventListener('touchstart', onInside, true);
      }
    };
    document.addEventListener('touchstart', onInside, true);
  }
}, true);
