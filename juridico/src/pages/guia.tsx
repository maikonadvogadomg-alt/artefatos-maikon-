import { useState } from "react";

type Section = "servidores" | "apk" | "proxies" | "resumo";

const V = "#8B5CF6";

const tabCls = (active: boolean) =>
  `px-3 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap ${
    active ? "text-white" : "text-slate-400 hover:text-slate-200"
  }`;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-slate-700 rounded-2xl p-4 space-y-2">
      <p className="text-sm font-bold text-slate-200">{title}</p>
      {children}
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mr-1"
      style={{ background: color + "22", color }}>
      {children}
    </span>
  );
}

export default function GuiaPage() {
  const [tab, setTab] = useState<Section>("servidores");

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* Header */}
      <div className="px-4 py-3 border-b bg-card/90 backdrop-blur">
        <p className="font-bold text-base" style={{ color: V }}>📖 Manual SK Jurídico</p>
        <p className="text-xs text-muted-foreground">Servidores · APK · Proxies · Guia completo</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 py-2 border-b bg-card/60 overflow-x-auto">
        {([
          ["servidores", "🌐 Servidores"],
          ["apk", "📱 Recriar APK"],
          ["proxies", "🔌 Proxies/APIs"],
          ["resumo", "⚡ Resumo Rápido"],
        ] as [Section, string][]).map(([t, label]) => (
          <button key={t} className={tabCls(tab === t)}
            style={tab === t ? { background: V } : {}}
            onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl mx-auto w-full">

        {/* ══ SERVIDORES ══ */}
        {tab === "servidores" && (
          <>
            <div className="bg-violet-900/20 border border-violet-700/40 rounded-2xl p-4">
              <p className="text-xs text-violet-300 font-semibold mb-1">O que é um servidor?</p>
              <p className="text-sm text-slate-300 leading-relaxed">
                Um servidor é um computador que fica ligado 24h e entrega seu app/site para qualquer pessoa
                que acessar o link. Você não precisa deixar seu celular ligado — o servidor faz isso por você.
              </p>
            </div>

            {/* Netlify */}
            <Card title="🟢 Netlify — Recomendado para iniciante">
              <Badge color="#00C7B7">GRATUITO</Badge>
              <Badge color="#22c55e">SEM CARTÃO</Badge>
              <Badge color="#3b82f6">ARRASTAR E SOLTAR</Badge>
              <div className="text-xs text-slate-300 space-y-1 mt-2">
                <p>✅ <strong>Como funciona:</strong> você sobe a pasta <code className="bg-slate-800 px-1 rounded">dist/</code> e em 30 segundos tem um link público</p>
                <p>✅ <strong>Link:</strong> <code className="bg-slate-800 px-1 rounded">seu-app.netlify.app</code></p>
                <p>✅ <strong>Limite grátis:</strong> 100GB/mês de tráfego, 300 minutos de build</p>
                <p>✅ <strong>HTTPS automático</strong> — obrigatório para PWA funcionar</p>
                <p>✅ <strong>Formulários, funções serverless</strong> no plano gratuito</p>
                <p>⚠️ <strong>Não tem banco de dados</strong> — para isso use Supabase ou Firebase</p>
              </div>
              <div className="mt-2 bg-slate-800/60 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 mb-1">PASSO A PASSO:</p>
                {["1. Acesse netlify.com → crie conta grátis (Google funciona)",
                  "2. Clique em 'Add new site' → 'Deploy manually'",
                  "3. Arraste a pasta dist/ do seu projeto para a área indicada",
                  "4. Aguarde 30s → link público gerado automaticamente",
                  "5. Use esse link no APK Builder para gerar o APK"
                ].map((s, i) => <p key={i} className="text-xs text-slate-300">{s}</p>)}
              </div>
            </Card>

            {/* GitHub Pages */}
            <Card title="🐙 GitHub Pages — Gratuito, para desenvolvedores">
              <Badge color="#6e40c9">GRATUITO</Badge>
              <Badge color="#22c55e">SEM CARTÃO</Badge>
              <div className="text-xs text-slate-300 space-y-1 mt-2">
                <p>✅ Link: <code className="bg-slate-800 px-1 rounded">usuario.github.io/seu-app</code></p>
                <p>✅ Integrado ao repositório Git — atualiza sozinho no push</p>
                <p>✅ Ideal para sites estáticos (HTML + JS + CSS)</p>
                <p>⚠️ Repositório precisa ser público para ser gratuito</p>
                <p>⚠️ Não executa código server-side (sem PHP, Python, Node)</p>
              </div>
              <div className="mt-2 bg-slate-800/60 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 mb-1">NO APK BUILDER (automático):</p>
                <p className="text-xs text-slate-300">Aba GitHub → cole seu token → Publicar Pages → link gerado em 2 minutos</p>
              </div>
            </Card>

            {/* Vercel */}
            <Card title="▲ Vercel — Rápido e gratuito">
              <Badge color="#ffffff">GRATUITO</Badge>
              <Badge color="#3b82f6">CDN GLOBAL</Badge>
              <div className="text-xs text-slate-300 space-y-1 mt-2">
                <p>✅ Extremamente rápido — CDN em 70+ países</p>
                <p>✅ Deploy automático via GitHub</p>
                <p>✅ Suporta Next.js, React, Vue, Angular nativamente</p>
                <p>✅ Funções serverless (API) grátis até 100GB</p>
                <p>⚠️ Projetos comerciais grandes precisam de plano pago</p>
              </div>
            </Card>

            {/* Firebase */}
            <Card title="🔥 Firebase Hosting — Google, com banco de dados">
              <Badge color="#FFA000">GRATUITO ATÉ CERTO LIMITE</Badge>
              <div className="text-xs text-slate-300 space-y-1 mt-2">
                <p>✅ Banco de dados em tempo real (Firestore) incluso</p>
                <p>✅ Autenticação de usuários (Google, email) inclusa</p>
                <p>✅ Ideal para apps que precisam salvar dados do usuário</p>
                <p>⚠️ Mais complexo para configurar que Netlify</p>
                <p>⚠️ Pode gerar custos se ultrapassar o limite gratuito</p>
              </div>
            </Card>


            {/* Local */}
            <Card title="💻 Servidor Local — Só no seu computador/celular">
              <Badge color="#94a3b8">SEM INTERNET</Badge>
              <Badge color="#22c55e">GRATUITO</Badge>
              <div className="text-xs text-slate-300 space-y-1 mt-2">
                <p>✅ Funciona sem internet — tudo na sua máquina</p>
                <p>✅ Ideal para testes antes de publicar</p>
                <p><strong>Opções:</strong></p>
                <p>→ <code className="bg-slate-800 px-1 rounded">python3 -m http.server 8080</code> — abre servidor na porta 8080</p>
                <p>→ <code className="bg-slate-800 px-1 rounded">npx serve dist/</code> — serve a pasta dist/</p>
                <p>→ XAMPP — painel visual, fácil para iniciante</p>
                <p>⚠️ Só você acessa — não funciona para compartilhar</p>
              </div>
            </Card>

            {/* Comparativo */}
            <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-400 tracking-widest mb-3">📊 COMPARATIVO RÁPIDO</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="text-left pb-2">Servidor</th>
                      <th className="text-center pb-2">Grátis</th>
                      <th className="text-center pb-2">Banco</th>
                      <th className="text-center pb-2">Fácil</th>
                      <th className="text-center pb-2">Ideal para</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-1">
                    {[
                      ["Netlify",       "✅","❌","⭐⭐⭐","Site estático, PWA"],
                      ["GitHub Pages",  "✅","❌","⭐⭐", "Portfolio, docs"],
                      ["Vercel",        "✅","❌","⭐⭐⭐","Next.js, React"],
                      ["Firebase",      "🟡","✅","⭐⭐", "App com usuários"],

                      ["Local",         "✅","✅","⭐",   "Só testes"],
                    ].map(([name, free, db, easy, use]) => (
                      <tr key={name} className="border-t border-slate-800">
                        <td className="py-1.5 font-semibold text-slate-300">{name}</td>
                        <td className="text-center">{free}</td>
                        <td className="text-center">{db}</td>
                        <td className="text-center">{easy}</td>
                        <td className="text-slate-400 pl-2">{use}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ══ RECRIAR APK ══ */}
        {tab === "apk" && (
          <>
            <div className="bg-violet-900/20 border border-violet-700/40 rounded-2xl p-4">
              <p className="text-xs text-violet-300 font-semibold mb-1">💡 Lógica básica</p>
              <p className="text-sm text-slate-300 leading-relaxed">
                Um APK Android é basicamente um ZIP com seus arquivos web dentro.
                Para recriar um APK você só precisa: <strong>1)</strong> ter os arquivos do seu site
                <strong> 2)</strong> usar o APK Builder para empacotá-los.
              </p>
            </div>

            <Card title="📋 Fluxo completo — do zero ao APK">
              {[
                { n: "1", t: "Tenha os arquivos do site", d: "A pasta dist/ gerada pelo Vite/React/Vue, ou um ZIP do site. Se já tem um APK antigo, pode importar ele direto no APK Builder — ele extrai os arquivos de dentro." },
                { n: "2", t: "Abra o APK Builder", d: "Acesse a aba Importar. Arraste o APK antigo (.apk) OU a pasta dist (.zip). O Builder analisa e limpa automaticamente." },
                { n: "3", t: "Escolha o nome", d: "O Builder sugere nomes baseados no que detectou. Você digita o que quiser e clica Aplicar. O ID (com.meuapp.nome) é gerado automaticamente." },
                { n: "4", t: "Configure na aba Exportar", d: "Defina: nome do app, versão, cor do tema, ícone (opcional). Tudo tem valores padrão — pode deixar como está e funciona." },
                { n: "5", t: "Gerar APK", d: "Clique 'Gerar Pacote Android'. Baixa um ZIP com a estrutura do projeto Android pronta para compilar no Android Studio ou via GitHub Actions (automático)." },
                { n: "6", t: "Compilar via GitHub (sem PC potente)", d: "Aba GitHub → cole seu token → Publicar no GitHub → o workflow GitHub Actions compila o APK na nuvem gratuitamente → baixa o .apk pronto." },
              ].map(s => (
                <div key={s.n} className="flex gap-3 py-2 border-t border-slate-800 first:border-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0 mt-0.5"
                    style={{ background: V + "30", color: V }}>{s.n}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{s.t}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.d}</p>
                  </div>
                </div>
              ))}
            </Card>

            <Card title="♻️ Recriar um APK existente (editar e regerar)">
              <div className="text-xs text-slate-300 space-y-2">
                <p><strong>Situação:</strong> você tem um APK mas quer mudar algo (nome, logo, código)</p>
                <div className="bg-slate-800/60 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] text-violet-300 font-bold">PASSO A PASSO:</p>
                  <p>1. APK Builder → Importar → arraste o <code className="bg-slate-700 px-1 rounded">.apk</code></p>
                  <p>2. O Builder extrai os arquivos da pasta <code className="bg-slate-700 px-1 rounded">assets/public/</code> do APK</p>
                  <p>3. A análise automática mostra o que foi encontrado e remove arquivos desnecessários</p>
                  <p>4. Você escolhe o novo nome se quiser mudar</p>
                  <p>5. Aba Exportar → ajuste o que quiser → Gerar Pacote</p>
                  <p>6. Novo APK gerado com as mudanças</p>
                </div>
              </div>
            </Card>

            <Card title="⚠️ Problemas comuns e soluções">
              {[
                { p: "APK instalado mas tela branca", s: "O app está tentando carregar de uma URL remota que está offline. Solução: use o modo offline (arquivos locais dentro do APK)." },
                { p: "Erro 'INSTALL_FAILED_VERIFICATION'", s: "Configurações do celular → Segurança → Instalar apps de fontes desconhecidas → Ativar para seu gerenciador de arquivos." },
                { p: "App instala mas não abre", s: "O arquivo APK pode estar corrompido. Extraia o ZIP e certifique que o .apk não está incompleto (deve ter mais de 5MB)." },
                { p: "API não funciona no APK", s: "As APIs bloqueiam requisições de apps Android por CORS. Use um proxy gratuito (allorigins.win, corsproxy.io) — já injetado automaticamente no APK Builder." },
                { p: "Não consigo compilar", s: "Use o fluxo GitHub Actions da aba GitHub — compila na nuvem, sem precisar do seu computador." },
              ].map(s => (
                <div key={s.p} className="py-2 border-t border-slate-800 first:border-0">
                  <p className="text-xs font-semibold text-amber-300">⚠️ {s.p}</p>
                  <p className="text-xs text-slate-400 mt-0.5">✅ {s.s}</p>
                </div>
              ))}
            </Card>
          </>
        )}

        {/* ══ PROXIES / APIs ══ */}
        {tab === "proxies" && (
          <>
            <div className="bg-violet-900/20 border border-violet-700/40 rounded-2xl p-4">
              <p className="text-xs text-violet-300 font-semibold mb-1">O que é CORS e por que importa?</p>
              <p className="text-sm text-slate-300 leading-relaxed">
                Quando um APK tenta chamar uma API externa (ex: Groq, Google, qualquer site),
                o servidor da API bloqueia com um erro chamado CORS — uma regra de segurança.
                Um <strong>proxy</strong> é um intermediário que faz a chamada por você, contornando o bloqueio.
              </p>
            </div>

            <Card title="🆓 Proxies gratuitos já integrados no SK">
              {[
                { name: "allorigins.win", url: "api.allorigins.win/raw?url=", limit: "Sem limite declarado", use: "Geral — funciona para a maioria dos sites" },
                { name: "corsproxy.io", url: "corsproxy.io/?", limit: "Uso justo", use: "Rápido, bom para APIs REST" },
                { name: "codetabs.com", url: "api.codetabs.com/v1/proxy?quest=", limit: "1000 req/dia", use: "Backup quando os outros falham" },
              ].map(p => (
                <div key={p.name} className="py-2 border-t border-slate-800 first:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-green-400">{p.name}</span>
                    <Badge color="#22c55e">GRÁTIS</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Uso: {p.url}</p>
                  <p className="text-[11px] text-slate-500">Limite: {p.limit} · {p.use}</p>
                </div>
              ))}
              <div className="bg-slate-800/60 rounded-xl p-3 mt-2">
                <p className="text-[10px] text-violet-300 font-bold mb-1">COMO FUNCIONA NO APK SK:</p>
                <p className="text-xs text-slate-300">O fetch interceptor injeta automaticamente um dos 3 proxies aleatoriamente a cada chamada. Se um falhar, você pode tentar novamente e outro proxy será usado.</p>
              </div>
            </Card>

            <Card title="🤖 APIs de IA gratuitas disponíveis">
              {[
                { name: "Groq", key: "gsk_...", models: "llama-3.3-70b, mixtral-8x7b, gemma2-9b", limit: "14.400 req/dia gratuito", url: "console.groq.com" },
                { name: "Google Gemini", key: "AIza...", models: "gemini-1.5-flash, gemini-pro", limit: "60 req/min gratuito", url: "aistudio.google.com" },
                { name: "OpenRouter", key: "sk-or-...", models: "vários modelos free", limit: "Depende do modelo", url: "openrouter.ai" },
              ].map(a => (
                <div key={a.name} className="py-2 border-t border-slate-800 first:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">{a.name}</span>
                    <Badge color="#8B5CF6">IA</Badge>
                    <Badge color="#22c55e">GRÁTIS</Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">Chave: <code className="bg-slate-800 px-1 rounded">{a.key}</code></p>
                  <p className="text-[11px] text-slate-400">Modelos: {a.models}</p>
                  <p className="text-[11px] text-slate-500">Limite: {a.limit}</p>
                  <button onClick={() => window.open(`https://${a.url}`, "_blank")}
                    className="text-[10px] text-violet-400 hover:underline mt-0.5">
                    → {a.url}
                  </button>
                </div>
              ))}
            </Card>

            <Card title="🔑 Onde configurar as chaves no SK Jurídico">
              <div className="text-xs text-slate-300 space-y-1">
                <p>1. Menu lateral → <strong>⚙️ Configurações</strong></p>
                <p>2. Cole sua chave Groq no campo <em>"Chave Groq"</em></p>
                <p>3. Clique em Salvar — a chave fica no localStorage (no seu dispositivo)</p>
                <p>4. A Iara e o Assistente Jurídico usam automaticamente</p>
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-2 mt-2">
                  <p className="text-[11px] text-amber-300">⚠️ A chave fica salva LOCALMENTE. Ninguém mais tem acesso. Se limpar os dados do browser/app, a chave é apagada — guarde ela num lugar seguro (ex: no Diário da Iara).</p>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* ══ RESUMO RÁPIDO ══ */}
        {tab === "resumo" && (
          <>
            <div className="bg-violet-900/20 border border-violet-700/40 rounded-2xl p-4">
              <p className="text-sm font-bold text-violet-300 mb-2">⚡ Tudo que você precisa saber em 2 minutos</p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Maikon, aqui está o resumo de como tudo se encaixa no seu fluxo de trabalho.
              </p>
            </div>

            {[
              {
                icon: "🌐", title: "Publicar um site grátis",
                steps: ["1. Gere o build do projeto (pasta dist/)", "2. Acesse netlify.com → faça login com Google", "3. Arraste a pasta dist/ para a área de deploy", "4. Link público criado em 30 segundos"],
                tip: "Use esse link no APK Builder para criar o APK"
              },
              {
                icon: "📱", title: "Gerar um APK novo (ou recriar)",
                steps: ["1. Abra o APK Builder (aba Importar)", "2. Arraste o .apk antigo OU o ZIP do dist/", "3. Análise automática + escolha o nome", "4. Aba Exportar → Gerar Pacote", "5. GitHub Actions compila o APK na nuvem"],
                tip: "O APK gerado instala direto no Android"
              },
              {
                icon: "🤖", title: "IA funcionar no APK (chave Groq)",
                steps: ["1. Acesse console.groq.com → crie conta grátis", "2. Crie uma API Key (começa com gsk_...)", "3. No app: ⚙️ Configurações → cole a chave Groq", "4. Pronto — Iara e Assistente Jurídico funcionam"],
                tip: "14.400 requisições por dia grátis"
              },
              {
                icon: "🔌", title: "API bloqueada (erro CORS no APK)",
                steps: ["1. Já está resolvido — fetch interceptor está injetado", "2. Usa 3 proxies gratuitos em rotação automática", "3. Se falhar: tente novamente (outro proxy é escolhido)", "4. Última opção: verifique sua conexão de internet"],
                tip: "allorigins · corsproxy · codetabs — todos gratuitos"
              },
            ].map(s => (
              <div key={s.title} className="bg-card border border-slate-700 rounded-2xl p-4 space-y-2">
                <p className="text-sm font-bold">{s.icon} {s.title}</p>
                <div className="space-y-0.5">
                  {s.steps.map((step, i) => (
                    <p key={i} className="text-xs text-slate-300">{step}</p>
                  ))}
                </div>
                <div className="bg-violet-900/20 rounded-xl px-3 py-1.5">
                  <p className="text-[11px] text-violet-300">💡 {s.tip}</p>
                </div>
              </div>
            ))}

            <div className="bg-card border rounded-2xl p-4 text-center space-y-1">
              <p className="text-sm font-bold" style={{ color: V }}>Maikon, você consegue. 💜</p>
              <p className="text-xs text-muted-foreground">
                Cada APK gerado é uma vitória. Guarde os ZIPs no Google Drive.<br />
                Qualquer dúvida, a Iara ou o Assistente Jurídico estão aqui.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
