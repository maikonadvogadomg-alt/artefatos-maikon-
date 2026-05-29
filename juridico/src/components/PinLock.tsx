import { useState } from "react";

interface Props {
  onUnlock: () => void;
}

const BG = "#111a0e";
const GREEN = "#4a7c3f";
const LIGHT = "#e8f0d8";
const MUTED = "#5a6e4a";

export default function PinLock({ onUnlock }: Props) {
  const stored = localStorage.getItem("sk_pin") || "";
  const hasPin = stored.length >= 4;
  const [mode, setMode] = useState<"enter" | "create" | "confirm">(hasPin ? "enter" : "create");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const doShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const press = (d: string) => {
    setError("");
    if (mode === "enter") {
      const next = pin + d;
      setPin(next);
      if (next.length === 4) {
        if (next === stored) { onUnlock(); }
        else { doShake(); setTimeout(() => setPin(""), 600); setError("PIN incorreto"); }
      }
    } else if (mode === "create") {
      const next = pin + d;
      setPin(next);
      if (next.length === 4) setMode("confirm");
    } else {
      const next = confirm + d;
      setConfirm(next);
      if (next.length === 4) {
        if (next === pin) { localStorage.setItem("sk_pin", pin); onUnlock(); }
        else { doShake(); setTimeout(() => { setConfirm(""); setMode("create"); setPin(""); }, 600); setError("PINs diferentes, tente novamente"); }
      }
    }
  };

  const del = () => {
    if (mode === "enter") setPin(p => p.slice(0, -1));
    else if (mode === "create") setPin(p => p.slice(0, -1));
    else setConfirm(c => c.slice(0, -1));
  };

  const current = mode === "confirm" ? confirm : pin;
  const title = mode === "enter" ? "🔐 SK Jurídico" : mode === "create" ? "Criar PIN de acesso" : "Confirmar PIN";
  const sub = mode === "enter" ? "Digite seu PIN" : mode === "create" ? "Escolha 4 dígitos" : "Repita o PIN";

  const skip = () => { localStorage.removeItem("sk_pin"); onUnlock(); };

  return (
    <div style={{ minHeight: "100dvh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontSize: 32, fontWeight: 800, color: GREEN, marginBottom: 4 }}>⚖ SK Jurídico</div>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 32 }}>Maikon Caldeira — OAB/MG 183712</div>

      <div style={{ background: "#1a2612", border: `1px solid ${GREEN}33`, borderRadius: 20, padding: 32, width: "100%", maxWidth: 340, boxShadow: "0 8px 32px #0008" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: LIGHT }}>{title}</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{sub}</div>
        </div>

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 8 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: "50%",
              background: i < current.length ? GREEN : "transparent",
              border: `2px solid ${i < current.length ? GREEN : MUTED}`,
              transition: "all 0.15s",
              transform: shake ? "translateX(4px)" : "none",
            }} />
          ))}
        </div>

        {error && <div style={{ textAlign: "center", color: "#ef4444", fontSize: 12, marginBottom: 12 }}>{error}</div>}

        {/* Keypad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 20 }}>
          {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
            k === "" ? <div key={i} /> :
            <button key={k} onClick={() => k === "⌫" ? del() : press(k)}
              style={{ padding: "18px 0", fontSize: k === "⌫" ? 20 : 22, fontWeight: 600, background: k === "⌫" ? "transparent" : "#253318", color: LIGHT, border: `1px solid ${GREEN}33`, borderRadius: 12, cursor: "pointer", transition: "background 0.1s" }}
              onMouseDown={e => (e.currentTarget.style.background = k === "⌫" ? "#1a2612" : GREEN)}
              onMouseUp={e => (e.currentTarget.style.background = k === "⌫" ? "transparent" : "#253318")}
            >{k}</button>
          ))}
        </div>

        {mode !== "enter" && (
          <button onClick={skip} style={{ width: "100%", marginTop: 20, padding: 10, background: "transparent", color: MUTED, border: "none", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
            Pular — usar sem PIN
          </button>
        )}
        {mode === "enter" && (
          <button onClick={() => { localStorage.removeItem("sk_pin"); setMode("create"); setPin(""); setError(""); }}
            style={{ width: "100%", marginTop: 16, padding: 10, background: "transparent", color: MUTED, border: "none", fontSize: 12, cursor: "pointer" }}>
            Esqueci o PIN
          </button>
        )}
      </div>
    </div>
  );
}
