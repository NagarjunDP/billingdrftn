"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Upload, X, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTesseractWorker } from "@/lib/ocr/tesseract-worker";
import { preprocessImage } from "@/lib/ocr/image-preprocessor";
import { parseTagText, ParsedTagResult } from "@/lib/ocr/tag-parser";
import { ScanConfirmSheet } from "./scan-confirm-sheet";

interface OCRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (item: { code: string; name: string; price: string; size: string }) => void;
  onAddToLibrary?: (item: { code: string; name: string; price: string; size: string }) => void;
}

export function OCRScannerModal({
  isOpen,
  onClose,
  onAddToCart,
  onAddToLibrary,
}: OCRScannerModalProps) {
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [parsedResult, setParsedResult] = useState<ParsedTagResult | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [existingMatch, setExistingMatch] = useState<{ id: string; name: string; price: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-load worker
  useEffect(() => {
    if (isOpen) {
      void getTesseractWorker();
    }
  }, [isOpen]);

  // Start live camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera error:", err);
      setCameraError("Camera unavailable. Use file upload or tap button below.");
      setMode("upload");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen && mode === "camera") {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, mode, startCamera, stopCamera]);

  // Run OCR on preprocessed canvas
  const processImageSource = async (
    source: HTMLImageElement | HTMLVideoElement,
    cropBox?: { x: number; y: number; width: number; height: number }
  ) => {
    setIsProcessing(true);
    setStatusText("Preprocessing image...");

    try {
      // 1. Preprocess client-side on canvas
      const canvas = preprocessImage(source, cropBox);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setImagePreviewUrl(dataUrl);

      // 2. Run Tesseract worker
      setStatusText("Reading price tag with AI...");
      const worker = await getTesseractWorker();
      const { data } = await worker.recognize(canvas);

      // 3. Parse tag text
      setStatusText("Extracting product info...");
      const parsed = parseTagText(data.text, data.confidence);
      setParsedResult(parsed);

      // 4. Check matching product in DB
      if (parsed.code) {
        try {
          const r = await fetch(`/api/products?code=${encodeURIComponent(parsed.code)}`);
          if (r.ok) {
            const d = await r.json();
            if (d.product) {
              setExistingMatch({
                id: d.product.id,
                name: d.product.name,
                price: (d.product.pricePaise / 100).toFixed(2),
              });
            } else {
              setExistingMatch(null);
            }
          }
        } catch {
          setExistingMatch(null);
        }
      }
    } catch (err) {
      console.error("OCR Error:", err);
      alert("Failed to process tag image. Please try again.");
    } finally {
      setIsProcessing(false);
      setStatusText("");
    }
  };

  // Capture frame from video stream
  const handleCaptureVideo = () => {
    if (!videoRef.current) return;
    // Frame guide box is centered, 70% width, 50% height
    const cropBox = {
      x: 0.15,
      y: 0.25,
      width: 0.70,
      height: 0.50,
    };
    void processImageSource(videoRef.current, cropBox);
  };

  // Handle file input upload / camera input fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        void processImageSource(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--accent)]" />
            <h2 className="text-sm font-bold text-[var(--text)]">OCR Tag Scanner</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="relative bg-black flex-1 min-h-[300px] flex items-center justify-center overflow-hidden">
          {mode === "camera" && !cameraError && (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Frame Guide Box Overlay */}
              <div className="absolute inset-0 border-40 border-black/50 pointer-events-none flex items-center justify-center">
                <div className="w-[70%] h-[55%] border-2 border-[var(--accent)] rounded-lg relative shadow-[0_0_20px_rgba(108,99,255,0.4)]">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-[var(--accent)]" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-[var(--accent)]" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-[var(--accent)]" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-[var(--accent)]" />
                  <p className="text-[10px] font-bold text-center text-white bg-black/60 px-2 py-1 rounded-full absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    Align price tag inside box
                  </p>
                </div>
              </div>
            </div>
          )}

          {(mode === "upload" || cameraError) && (
            <div className="p-8 text-center flex flex-col items-center gap-3">
              {cameraError && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--amber)] bg-[var(--amber-bg)] px-3 py-2 rounded-lg mb-2">
                  <AlertCircle size={14} /> {cameraError}
                </div>
              )}
              <Upload size={36} className="text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-muted)]">Upload a clear photo of the price tag</p>
              <label htmlFor="modal-file-upload" className="btn-primary px-4 py-2 text-xs">
                Select Photo
                <input
                  id="modal-file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          )}

          {/* Processing spinner overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
              <Loader2 size={32} className="text-[var(--accent)] animate-spin" />
              <p className="text-xs font-semibold text-white">{statusText}</p>
            </div>
          )}
        </div>

        {/* Mode Switcher + Snap Button */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between">
          <div className="flex gap-2">
            <button
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                mode === "camera"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              )}
              onClick={() => setMode("camera")}
            >
              <Camera size={14} className="inline mr-1" /> Live Camera
            </button>

            <label
              htmlFor="mode-file-upload"
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors",
                mode === "upload"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              )}
            >
              <Upload size={14} className="inline mr-1" /> File Upload
              <input
                id="mode-file-upload"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {mode === "camera" && !cameraError && (
            <button
              className="btn-primary h-10 px-5 text-xs rounded-full font-bold shadow-accent"
              onClick={handleCaptureVideo}
              disabled={isProcessing}
            >
              📷 Snap Tag
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Sheet Overlay after parsing */}
      {parsedResult && (
        <ScanConfirmSheet
          parsed={parsedResult}
          imagePreviewUrl={imagePreviewUrl}
          existingProductMatch={existingMatch}
          onDismiss={() => {
            setParsedResult(null);
            setImagePreviewUrl(null);
          }}
          onConfirmAddToCart={(item) => {
            if (onAddToCart) onAddToCart(item);
            setParsedResult(null);
            setImagePreviewUrl(null);
            onClose();
          }}
          onConfirmAddToLibrary={(item) => {
            if (onAddToLibrary) onAddToLibrary(item);
            setParsedResult(null);
            setImagePreviewUrl(null);
            onClose();
          }}
          onUpdateStock={async (productId) => {
            try {
              await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  code: parsedResult.code,
                  name: parsedResult.name,
                  stock: 1, // increment stock by 1
                }),
              });
              alert("Stock updated!");
            } catch {
              alert("Failed to update stock");
            }
            setParsedResult(null);
            onClose();
          }}
        />
      )}
    </div>
  );
}
