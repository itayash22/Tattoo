// Imports the ESM build of Cropper.js from CDN
import Cropper from 'https://cdn.jsdelivr.net/npm/cropperjs@1.5.13/dist/cropper.esm.js';

export function setupCropper(imgEl) {
  return new Cropper(imgEl, {
    viewMode: 1,
    dragMode: 'crop',
    autoCropArea: 0.7,
    movable: true,
    zoomable: true,
    zoomOnTouch: true,
    cropBoxMovable: true,
    cropBoxResizable: true,
    responsive: true,
  });
}
