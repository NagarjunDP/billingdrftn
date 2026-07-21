/**
 * Client-Side Canvas Image Preprocessor for Price Tag OCR
 * 
 * Pipeline:
 * 1. Crop to target guide box region
 * 2. Upscale small images (< 600px width)
 * 3. Convert to grayscale
 * 4. Contrast enhancement (linear stretching)
 * 5. Adaptive binarization (Otsu-style threshold)
 */

export interface CropBox {
  x: number;     // ratio 0 to 1
  y: number;     // ratio 0 to 1
  width: number;  // ratio 0 to 1
  height: number; // ratio 0 to 1
}

export function preprocessImage(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  cropBox?: CropBox
): HTMLCanvasElement {
  const sourceWidth = "videoWidth" in imageSource ? imageSource.videoWidth : imageSource.width;
  const sourceHeight = "videoHeight" in imageSource ? imageSource.videoHeight : imageSource.height;

  // 1. Calculate crop coordinates
  const cropX = cropBox ? Math.floor(cropBox.x * sourceWidth) : 0;
  const cropY = cropBox ? Math.floor(cropBox.y * sourceHeight) : 0;
  const cropW = cropBox ? Math.floor(cropBox.width * sourceWidth) : sourceWidth;
  const cropH = cropBox ? Math.floor(cropBox.height * sourceHeight) : sourceHeight;

  // 2. Upscale if cropped area is small
  const scale = cropW < 600 ? 600 / cropW : 1;
  const targetW = Math.round(cropW * scale);
  const targetH = Math.round(cropH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) return canvas;

  // Draw cropped & scaled image
  ctx.drawImage(imageSource, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

  // Get image pixel data
  const imageData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imageData.data;
  const totalPixels = targetW * targetH;

  // 3. Grayscale + Min/Max computation for contrast stretching
  let minGray = 255;
  let maxGray = 0;
  const grayBuffer = new Uint8Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    // Luminance formula
    const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    grayBuffer[i] = gray;
    if (gray < minGray) minGray = gray;
    if (gray > maxGray) maxGray = gray;
  }

  // 4. Linear Contrast Stretch + Simple Threshold
  const range = maxGray - minGray || 1;
  const threshold = minGray + range * 0.45; // slightly dark-skewed threshold for text

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const g = grayBuffer[i];
    // Contrast stretch
    const stretched = Math.min(255, Math.max(0, ((g - minGray) * 255) / range));
    // Binarize: text = black (0), background = white (255)
    const val = stretched < threshold ? 0 : 255;

    data[idx] = val;     // R
    data[idx + 1] = val; // G
    data[idx + 2] = val; // B
    data[idx + 3] = 255; // A
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
