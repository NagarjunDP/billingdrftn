/**
 * Parsing utilities for clothing price tag OCR output
 */

export interface ParsedTagResult {
  code: string;
  name: string;
  price: string; // e.g. "1199.00"
  pricePaise: number;
  size: string;
  rawText: string;
  confidence: number; // 0 to 100 overall
  fieldConfidence: {
    code: number;
    name: number;
    price: number;
    size: number;
  };
}

export function parseTagText(ocrText: string, tesseractConfidence: number = 80): ParsedTagResult {
  const lines = ocrText
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  let code = "";
  let name = "";
  let price = "";
  let pricePaise = 0;
  let size = "";

  let codeConf = tesseractConfidence;
  let nameConf = tesseractConfidence;
  let priceConf = tesseractConfidence;
  let sizeConf = tesseractConfidence;

  // 1. Extract Price (Look for ₹, Rs., MRP, or numeric values with 2 decimals or 3-5 digits)
  const priceRegexes = [
    /(?:₹|Rs\.?|MRP)\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)/i,
    /(\d{3,5}\.\d{2})/,
    /(?:PRICE|AMT)\s*[:\-]?\s*(\d+)/i,
  ];

  for (const line of lines) {
    for (const regex of priceRegexes) {
      const match = line.match(regex);
      if (match && match[1]) {
        const parsedVal = parseFloat(match[1]);
        if (!isNaN(parsedVal) && parsedVal >= 100 && parsedVal <= 50000) {
          pricePaise = Math.round(parsedVal * 100);
          price = (pricePaise / 100).toFixed(2);
          break;
        }
      }
    }
    if (price) break;
  }

  // Fallback price search if regex missed
  if (!price) {
    for (const line of lines) {
      const nums = line.match(/\b\d{3,5}\b/g);
      if (nums) {
        for (const numStr of nums) {
          const val = parseInt(numStr, 10);
          if (val >= 199 && val <= 29999) {
            pricePaise = val * 100;
            price = (pricePaise / 100).toFixed(2);
            priceConf = Math.max(30, tesseractConfidence - 30); // flag low confidence
            break;
          }
        }
      }
      if (price) break;
    }
  }

  // 2. Extract Code / SKU (e.g., TEE1, POLO-01, DRF-102, 4-8 alphanumeric chars)
  const codeRegexes = [
    /(?:SKU|CODE|STYLE|ART)\s*[:\-]?\s*([A-Z0-9\-]{3,12})/i,
    /\b([A-Z]{2,5}[0-9]{1,4}[A-Z0-9]*)\b/i,
  ];

  for (const line of lines) {
    for (const regex of codeRegexes) {
      const match = line.match(regex);
      if (match && match[1]) {
        code = match[1].toUpperCase();
        break;
      }
    }
    if (code) break;
  }

  if (!code) {
    // Look for first short uppercase word
    for (const line of lines) {
      const words = line.split(/\s+/);
      for (const w of words) {
        if (/^[A-Z0-9]{3,8}$/.test(w) && !/^(MRP|RS|SIZE|FREE|PRICE|INDIA)$/i.test(w)) {
          code = w.toUpperCase();
          codeConf = Math.max(40, tesseractConfidence - 25);
          break;
        }
      }
      if (code) break;
    }
  }

  // 3. Extract Size (S, M, L, XL, XXL, 3XL, 28, 30, 32, 34, 36, 38, 40, 42)
  const sizeRegex = /(?:SIZE|SZ)\s*[:\-]?\s*(XS|S|M|L|XL|2XL|3XL|XXL|28|30|32|34|36|38|40|42)\b/i;
  for (const line of lines) {
    const match = line.match(sizeRegex);
    if (match && match[1]) {
      size = match[1].toUpperCase();
      break;
    }
  }

  if (!size) {
    // Standalone size search
    for (const line of lines) {
      const match = line.match(/\b(XS|S|M|L|XL|XXL|2XL|3XL)\b/i);
      if (match) {
        size = match[1].toUpperCase();
        sizeConf = Math.max(50, tesseractConfidence - 20);
        break;
      }
    }
  }

  // 4. Extract Product Name (First line or line containing Tee, Shirt, Polo, Pants, Denim, Hoodie, Oversized)
  const apparelKeywords = /(Tee|Shirt|Polo|Pants|Hoodie|Oversized|Sweatshirt|Shorts|Cargo|Jacket|Denim|Top|Dress)/i;

  for (const line of lines) {
    if (apparelKeywords.test(line)) {
      name = line.replace(/(?:SKU|CODE|MRP|RS|SIZE|PRICE).*$/i, "").trim();
      break;
    }
  }

  if (!name && lines.length > 0) {
    // Use first non-code, non-price line as name
    for (const line of lines) {
      if (line !== code && !line.includes(price) && line.length >= 3) {
        name = line;
        nameConf = Math.max(40, tesseractConfidence - 25);
        break;
      }
    }
  }

  if (!name) name = "Scanned Apparel Item";

  // Flag missing/uncertain fields
  if (!code) codeConf = 30;
  if (!price) priceConf = 20;
  if (!size) sizeConf = 50;

  return {
    code: code || "SKU-AUTO",
    name,
    price: price || "0.00",
    pricePaise,
    size: size || "M",
    rawText: ocrText,
    confidence: Math.round(tesseractConfidence),
    fieldConfidence: {
      code: Math.round(codeConf),
      name: Math.round(nameConf),
      price: Math.round(priceConf),
      size: Math.round(sizeConf),
    },
  };
}
