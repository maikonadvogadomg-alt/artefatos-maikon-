import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Props { onBack: () => void; }

const UF_LIST = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export default function ComunicacoesProcessuais({ onBack }: Props) {
  const { toast } = useToast();
  const [oab, setOab] = useState("183712");
  const [uf, setUf] = useState("MG");
  const [processo, setProcesso] = useState("");
  const [advogado, setAdvogado] = useState("");
  const [parte, setParte] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<any[]>([]);

  const dateOptions = (() => {
    const opts: string[] = [];
    for (let y = 2024; y <= 2026; y++) for (let m = 1; m <= 12; m++) opts.push(`${y}-${String(m).padStart(2,"0")}-01`);
    return opts;
  })();

  const handleBuscar = async () => {
    setLoading(true);
    setResultados([]);
    try {
      const params = new URLSearchParams();
      if (oab) params.set("numeroOAB", oab);
      if (uf) params.set("siglaUF", uf);
      if (processo) params.set("numeroProcesso", processo);
      if (advogado) params.set("nomeAdvogado", advogado);
      if (parte) params.set("nomeParte", parte);
      if (dataInicio) params.set("dataDisponibilizacaoInicio", dataInicio);
      if (dataFim) params.set("dataDisponibilizacaoFim", dataFim);
      params.set("pagina", "0");
      params.set("itensPorPagina", "20");

      let data: any = null;
      try {
        const res = await fetch(`https://gateway.api.cnj.jus.br/public/api/v1/comunicacao?${params}`, {
          headers: { "Accept": "application/json" }
        });
        if (res.ok) data = await res.json();
      } catch {}

      if (!data) {
        const res2 = await fetch(`/api/db/proxy-cnj?${params}`);
        if (res2.ok) data = await res2.json();
      }

      if (data && data.items) {
        setResultados(data.items);
        toast({ title: `✓ ${data.items.length} comunicações encontradas` });
      } else {
        setResultados([]);
        toast({ title: "Nenhum resultado", description: "Tente outros filtros.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro na busca", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const s = {
    page: { display: "flex", flexDirection: "column" as const, height: "100dvh", background: "hsl(120 22% 7%)", color: "hsl(55 25% 88%)", fontFamily: "'Inter',sans-serif" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid hsl(120 15% 16%)", background: "hsl(120 20% 9%)" },
    card: { background: "hsl(120 20% 10%)", border: "1px solid hsl(120 15% 18%)", borderRadius: 12, padding: 16, marginBottom: 12 },
    label: { fontSize: 12, color: "hsl(120 8% 60%)", display: "block" as const, marginBottom: 4, marginTop: 12 },
    input: { width: "100%", background: "hsl(120 18% 13%)", border: "1px solid hsl(120 15% 20%)", borderRadius: 8, padding: "10px 12px", color: "hsl(55 25% 88%)", fontSize: 14, boxSizing: "border-box" as const, outline: "none" },
    select: { width: "100%", background: "hsl(120 18% 13%)", border: "1px solid hsl(120 15% 20%)", borderRadius: 8, padding: "10px 12px", color: "hsl(55 25% 88%)", fontSize: 14, boxSizing: "border-box" as const },
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "hsl(55 25% 75%)", cursor: "pointer", fontSize: 22 }}>←</button>
          <span style={{ fontSize: 16 }}>⚖</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: "hsl(45 70% 60%)" }}>Comunicações Processuais</span>
        </div>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "hsl(55 25% 65%)", cursor: "pointer", fontSize: 18 }}>☀</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div style={s.card}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <span>🔍</span> Buscar Intimações, Citações e Publicações
          </div>

          <label style={s.label}>Número OAB</label>
          <input value={oab} onChange={e => setOab(e.target.value)} placeholder="183712" style={s.input} />

          <label style={s.label}>UF da OAB</label>
          <select value={uf} onChange={e => setUf(e.target.value)} style={s.select}>
            <option value="">Selecione</option>
            {UF_LIST.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          <label style={s.label}>Número do Processo</label>
          <input value={processo} onChange={e => setProcesso(e.target.value)} placeholder="0000000-00.0000.0.00.0000" style={s.input} />

          <label style={s.label}>Nome do Advogado</label>
          <input value={advogado} onChange={e => setAdvogado(e.target.value)} placeholder="Ex: MAIKON DA ROCHA CALDEIRA" style={s.input} />

          <label style={s.label}>Nome da Parte</label>
          <input value={parte} onChange={e => setParte(e.target.value)} placeholder="Ex: JOSE MARIO NUNES" style={s.input} />

          <label style={s.label}>Data Início (yyyy-mm-dd)</label>
          <select value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={s.select}>
            <option value="">Selecione</option>
            {dateOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <label style={s.label}>Data Fim (yyyy-mm-dd)</label>
          <select value={dataFim} onChange={e => setDataFim(e.target.value)} style={s.select}>
            <option value="">Selecione</option>
            {dateOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <button
            onClick={handleBuscar}
            disabled={loading}
            style={{ width: "100%", marginTop: 16, padding: "14px", background: loading ? "#3a6232" : "#4a7c3f", color: "#111", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <span>🔍</span>{loading ? "Buscando..." : "Buscar"}
          </button>
          <div style={{ fontSize: 11, color: "hsl(120 8% 52%)", marginTop: 8, display: "flex", alignItems: "flex-start", gap: 4 }}>
            <span>ⓘ</span>
            <span>Busca primeiro na API de produção do CNJ (seu navegador). Se não alcançar, usa homologação pelo servidor.</span>
          </div>
        </div>

        {/* Resultados */}
        {resultados.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 10, color: "hsl(45 70% 60%)" }}>Resultados ({resultados.length})</div>
            {resultados.map((r, i) => (
              <div key={i} style={{ background: "hsl(120 20% 10%)", border: "1px solid hsl(120 15% 18%)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{r.numeroProcesso || r.processo || "Processo não informado"}</div>
                <div style={{ fontSize: 12, color: "hsl(120 8% 60%)", marginBottom: 4 }}>{r.dataDisponibilizacao || r.data || ""}</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{r.texto || r.conteudo || JSON.stringify(r).slice(0, 200)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
