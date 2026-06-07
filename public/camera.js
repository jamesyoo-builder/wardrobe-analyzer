/**
 * camera.js — WebRTC camera module
 */

const Camera = (() => {
  let stream = null;
  let capturedDataUrl = null;

  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  const preview = document.getElementById('preview-image');
  const deniedOverlay = document.getElementById('camera-denied');

  async function init() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' },
        audio: false
      });
      video.srcObject = stream;
      return true;
    } catch (err) {
      console.warn('Camera unavailable:', err.message);
      video.hidden = true;
      deniedOverlay.hidden = false;
      return false;
    }
  }

  function capture() {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Compress to JPEG
    capturedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

    // Show preview
    video.hidden = true;
    preview.src = capturedDataUrl;
    preview.hidden = false;

    return capturedDataUrl;
  }

  function retake() {
    capturedDataUrl = null;
    preview.hidden = true;
    preview.src = '';
    video.hidden = false;
  }

  function setPreviewFromFile(dataUrl) {
    capturedDataUrl = dataUrl;
    video.hidden = true;
    preview.src = dataUrl;
    preview.hidden = false;
  }

  function getCaptured() {
    return capturedDataUrl;
  }

  function stop() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  /**
   * Compress an image file to JPEG base64, resizing if needed.
   * Enforces max 200KB after compression for storage.
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const tmpCanvas = document.createElement('canvas');
          // Max dimension 1024px
          const maxDim = 1024;
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w >= h) { h = Math.round(h * maxDim / w); w = maxDim; }
            else { w = Math.round(w * maxDim / h); h = maxDim; }
          }
          tmpCanvas.width = w;
          tmpCanvas.height = h;
          tmpCanvas.getContext('2d').drawImage(img, 0, 0, w, h);

          // Try quality 0.82, then lower if needed to hit ~200KB
          let quality = 0.82;
          let dataUrl = tmpCanvas.toDataURL('image/jpeg', quality);
          // base64 length → bytes ≈ len * 0.75
          while (dataUrl.length * 0.75 > 200 * 1024 && quality > 0.3) {
            quality -= 0.1;
            dataUrl = tmpCanvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return { init, capture, retake, setPreviewFromFile, getCaptured, stop, fileToBase64 };
})();
