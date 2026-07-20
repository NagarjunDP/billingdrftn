export async function extractProductNameFromImage(fileName: string): Promise<string> {
  const normalized = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  if (!normalized) {
    return "Untitled product";
  }
  return normalized;
}
