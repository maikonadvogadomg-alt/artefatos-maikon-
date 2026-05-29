export class SpeechService {
  private recognition: any = null;
  private isActive = false;

  constructor() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      this.recognition = new SR();
      this.recognition.lang = "pt-BR";
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
    }
  }

  get supported() { return !!this.recognition; }
  get listening() { return this.isActive; }

  start(onResult: (text: string, final: boolean) => void, onError: (msg: string) => void) {
    if (!this.recognition) { onError("Microfone não suportado neste navegador"); return; }
    if (this.isActive) return;
    this.recognition.onresult = (e: any) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      onResult(final || interim, !!final);
    };
    this.recognition.onerror = (e: any) => { this.isActive = false; onError(e.error || "Erro no microfone"); };
    this.recognition.onend = () => { this.isActive = false; };
    try { this.recognition.start(); this.isActive = true; } catch {}
  }

  stop() {
    if (this.recognition && this.isActive) {
      try { this.recognition.stop(); } catch {}
      this.isActive = false;
    }
  }
}

export const speechSvc = new SpeechService();

export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/_{1,2}(.+?)_{1,2}/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitChunks(text: string, maxLen = 220): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [text];
  let cur = "";
  for (const s of sentences) {
    const t = s.trim();
    if (!t) continue;
    if ((cur + " " + t).trim().length <= maxLen) {
      cur = (cur + " " + t).trim();
    } else {
      if (cur) chunks.push(cur);
      cur = t.length > maxLen
        ? (chunks.push(...(t.match(/.{1,220}/g) || [t])), "")
        : t;
    }
  }
  if (cur) chunks.push(cur);
  return chunks.filter(c => c.trim());
}

let _speakChunks: string[] = [];
let _speakIdx = 0;
let _speakRate = 1;
let _speakPitch = 1;
let _keepalive: ReturnType<typeof setInterval> | null = null;

function _nextChunk() {
  if (_speakIdx >= _speakChunks.length) {
    if (_keepalive) { clearInterval(_keepalive); _keepalive = null; }
    return;
  }
  const u = new SpeechSynthesisUtterance(_speakChunks[_speakIdx]);
  u.lang = "pt-BR";
  u.rate = _speakRate;
  u.pitch = _speakPitch;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(v => v.lang === "pt-BR" && v.name.toLowerCase().includes("google"))
    || voices.find(v => v.lang.startsWith("pt-BR") || v.lang.startsWith("pt_BR"));
  if (v) u.voice = v;
  u.onend = () => { _speakIdx++; _nextChunk(); };
  u.onerror = (e) => { if (e.error !== "interrupted") { _speakIdx++; _nextChunk(); } };
  window.speechSynthesis.speak(u);
}

export function speakText(text: string, rate = 1.15, pitch = 1.05) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  if (_keepalive) { clearInterval(_keepalive); _keepalive = null; }
  const clean = stripMarkdown(text);
  _speakChunks = splitChunks(clean);
  _speakIdx = 0;
  _speakRate = rate;
  _speakPitch = pitch;
  _keepalive = setInterval(() => {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  }, 5000);
  const go = () => { setTimeout(_nextChunk, 120); };
  window.speechSynthesis.getVoices().length ? go() : (window.speechSynthesis.onvoiceschanged = go);
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
