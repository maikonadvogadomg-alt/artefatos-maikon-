export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".csv") || name.endsWith(".md") || name.endsWith(".json")) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  if (name.endsWith(".html") || name.endsWith(".htm") || type.includes("html")) {
    const html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      ["script", "style", "noscript"].forEach(tag => {
        doc.querySelectorAll(tag).forEach(el => el.remove());
      });
      return (doc.body?.innerText || doc.documentElement?.innerText || html).trim();
    } catch {
      return html;
    }
  }

  if (name.endsWith(".pdf") || type.includes("pdf")) {
    return extractPdfText(bytes);
  }

  if (name.endsWith(".docx") || type.includes("wordprocessingml")) {
    return extractDocxText(bytes) || new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function extractPdfText(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 32 && b < 127) str += String.fromCharCode(b);
    else if (b === 10 || b === 13) str += " ";
  }
  const blocks: string[] = [];
  const re = /BT([\s\S]*?)ET/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    const parts = m[1].match(/\(([^)]{1,500})\)/g) || [];
    for (const p of parts) {
      const t = p.slice(1, -1).replace(/\\n/g, " ").replace(/\\\(/g, "(").replace(/\\\)/g, ")").trim();
      if (t.length > 1) blocks.push(t);
    }
  }
  let result = blocks.join(" ").replace(/\s+/g, " ").trim();
  if (result.length < 30) {
    const readable = str.match(/[A-Za-zÀ-ÿ0-9\s,.;:!?\-/]{10,}/g) || [];
    result = readable.join(" ").replace(/\s+/g, " ").trim();
  }
  return result.substring(0, 200000) || "[PDF sem texto selecionável — use um PDF com texto, não escaneado]";
}

function extractDocxText(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 32 && b < 127) str += String.fromCharCode(b);
    else str += " ";
  }
  const parts = str.match(/<w:t[^>]*>([^<]{1,2000})<\/w:t>/g) || [];
  if (parts.length > 0) {
    return parts
      .map(p => p.replace(/<[^>]+>/g, "").trim())
      .filter(t => t.length > 0)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return "";
}
