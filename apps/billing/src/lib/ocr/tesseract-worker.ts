import { createWorker, Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

/**
 * Get or initialize singleton Tesseract.js worker (loaded once in memory)
 */
export async function getTesseractWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist:
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789₹Rs. -/:",
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Terminate worker if needed
 */
export async function terminateTesseractWorker() {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}
