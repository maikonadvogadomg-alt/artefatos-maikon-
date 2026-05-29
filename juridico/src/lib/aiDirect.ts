const FORMATO_JURIDICO = `
REGRAS OBRIGATÓRIAS DE FORMATAÇÃO — SIGA SEMPRE:
- Use espaçamento brasileiro padrão forense: parágrafos separados por linha em branco
- Cabeçalhos de seção em MAIÚSCULAS seguidos de dois-pontos ou em linha própria
- Numeração de itens: I – II – III ou 1. 2. 3. conforme o tipo de documento
- Fundamentos legais: cite o artigo completo (ex: "nos termos do art. 5º, inciso LV, da Constituição Federal")
- Encerramento formal: "Termos em que, Pede deferimento." ou equivalente
- Nunca use markdown com # ## *** — use texto puro com maiúsculas para ênfase
- Separe claramente: FATOS → FUNDAMENTOS JURÍDICOS → PEDIDO(S)
- Datas por extenso: "Belo Horizonte, 27 de maio de 2026"
- Linguagem formal forense brasileira (TJMG, STJ, STF)
`;

const MODE_PROMPTS: Record<string, string> = {
  corrigir: `Você é um revisor forense especializado no direito brasileiro (OAB/MG). Corrija o texto jurídico a seguir: erros gramaticais, ortográficos, concordância, pontuação e estilo forense. Mantenha o sentido original integralmente. Retorne APENAS o texto corrigido, pronto para protocolo.\n${FORMATO_JURIDICO}`,

  redacao: `Você é um advogado sênior especialista em redação forense brasileira (padrão TJMG/STJ). Reescreva o texto a seguir em linguagem jurídica formal, técnica e persuasiva. Eleve a qualidade da argumentação mantendo o conteúdo. Retorne o texto reescrito completo, pronto para protocolo.\n${FORMATO_JURIDICO}`,

  lacunas: `Você é um advogado experiente (OAB/MG). Analise o texto jurídico a seguir e identifique:\n1. LACUNAS: informações faltantes que enfraquecem a peça\n2. INCONSISTÊNCIAS: contradições internas\n3. RISCOS: pontos que podem ser atacados pela parte contrária\n4. SUGESTÕES: o que incluir para fortalecer\nSeja específico e prático. Use a estrutura acima com números.`,

  chat: `Você é um assistente jurídico especializado no direito brasileiro, com foco em direito civil, processual civil e trabalhista. Responda de forma clara, objetiva e fundamentada na legislação e jurisprudência brasileira (STF, STJ, TJMG). Quando pertinente, cite o dispositivo legal exato.\n${FORMATO_JURIDICO}`,

  resumir: `Você é um assistente jurídico forense. Faça um resumo estruturado do texto jurídico a seguir usando OBRIGATORIAMENTE este formato:\n\nIDENTIFICAÇÃO DO DOCUMENTO:\n[tipo, número, partes, juízo]\n\nFATOS PRINCIPAIS:\n[lista numerada]\n\nPEDIDOS:\n[lista numerada]\n\nDECISÃO/RESULTADO (se houver):\n[resumo]\n\nPRAZOS/PROVIDÊNCIAS:\n[se aplicável]\n\nUse texto puro, sem markdown.`,

  revisar: `Você é um revisor jurídico sênior (padrão STJ). Revise o texto a seguir apontando OBRIGATORIAMENTE:\n\n1. ERROS TÉCNICO-JURÍDICOS: dispositivos mal citados, teses equivocadas\n2. ERROS DE ARGUMENTAÇÃO: lógica falha, contradições\n3. ERROS FORMAIS: estrutura, nomenclatura processual\n4. SUGESTÕES DE MELHORIA: recomendações concretas\n\nPara cada problema: cite o trecho exato → explique o erro → sugira a correção.`,

  refinar: `Você é um advogado sênior com 20 anos de experiência forense (TJMG/STJ). Refine e melhore o texto a seguir:\n- Torne a argumentação mais persuasiva e sólida\n- Adicione fundamentos legais e jurisprudenciais pertinentes\n- Melhore a estrutura lógica\n- Eleve o nível técnico sem perder a clareza\nRetorne o texto completo refinado, pronto para protocolo.\n${FORMATO_JURIDICO}`,

  linguagem_simples: `Você é um comunicador jurídico especializado em traduzir documentos legais para linguagem acessível. Reescreva o texto jurídico a seguir em linguagem simples que qualquer pessoa leiga entenda:\n- Substitua termos técnicos por palavras comuns\n- Use frases curtas e diretas\n- Explique o que cada parte significa na prática\n- Mantenha o significado completo\n- Estruture com: O QUE É → O QUE DIZ → O QUE SIGNIFICA PARA VOCÊ`,

  gerar_minuta: `Você é um advogado especialista em elaboração de minutas e peças processuais (padrão TJMG). Com base nas informações fornecidas, gere uma minuta jurídica COMPLETA incluindo:\n- Cabeçalho com qualificação das partes\n- Exposição dos fatos\n- Fundamentos jurídicos (com artigos de lei)\n- Pedidos numerados\n- Encerramento formal\n- Local, data e espaço para assinatura\nUse formatação forense brasileira padrão.\n${FORMATO_JURIDICO}`,

  analisar: `Você é um analista jurídico estratégico (padrão STJ/STF). Faça uma análise jurídica COMPLETA do texto a seguir usando esta estrutura:\n\nQUALIFICAÇÃO DO CASO:\n[tipo de ação, partes, juízo]\n\nFUNDAMENTOS LEGAIS APLICÁVEIS:\n[artigos, leis, códigos]\n\nJURISPRUDÊNCIA RELEVANTE:\n[STF, STJ, TJMG — citar súmulas e precedentes]\n\nPONTOS FORTES DA TESE:\n[lista]\n\nPONTOS VULNERÁVEIS:\n[lista]\n\nESTRATÉGIA RECOMENDADA:\n[ação concreta]\n\nPROBABILIDADE DE ÊXITO:\n[baixa/média/alta + justificativa]`,

  pesquisa_web: `Você é um pesquisador jurídico especializado no direito brasileiro. Pesquise e compile informações sobre o tema a seguir:\n\nLEGISLAÇÃO APLICÁVEL:\n[leis, códigos, regulamentos]\n\nJURISPRUDÊNCIA DOS TRIBUNAIS SUPERIORES:\n[STF, STJ — súmulas e leading cases]\n\nJURISPRUDÊNCIA REGIONAL (TJMG/TRT-MG):\n[se aplicável]\n\nDOUTRINA RELEVANTE:\n[autores e obras]\n\nTENDÊNCIA ATUAL:\n[como os tribunais têm decidido recentemente]`,

  precedentes: `Você é um especialista em jurisprudência forense brasileira. Para o caso descrito, levante OBRIGATORIAMENTE:\n\nSÚMULAS APLICÁVEIS:\n[STF, STJ, TST — número e texto]\n\nLEADING CASES — STF:\n[caso + tese fixada + ano]\n\nLEADING CASES — STJ:\n[caso + tese fixada + ano]\n\nPRECEDENTES TJMG:\n[se disponível]\n\nTESE JURÍDICA PREDOMINANTE:\n[resumo do entendimento atual]\n\nCOMO USAR ESSES PRECEDENTES:\n[estratégia prática para a peça]`,
};

function demoResult(text: string, mode: string): string {
  const demos: Record<string, string> = {
    corrigir: `[DEMO] Texto corrigido:\n\n${text}\n\n⚠ Configure uma chave de API em Configurações.`,
    chat: `[DEMO] Para respostas com IA real, configure uma chave em Configurações.\n\nGroq é gratuito: console.groq.com`,
    resumir: `[DEMO] Resumo: O texto trata de matéria jurídica relevante.\n\n⚠ Configure uma chave de API.`,
  };
  return demos[mode] || `[DEMO] ${text}\n\n⚠ Configure uma chave de API em Configurações.\n\nGroq é gratuito: console.groq.com`;
}

function getTimeoutMs(): number {
  const stored = localStorage.getItem("sk_timeout_ms");
  if (stored) {
    const n = parseInt(stored, 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return 120_000;
}

async function fetchWithTimeout(url: string, opts: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), getTimeoutMs());
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(tid);
  }
}

function resolveEndpoint(model: string, apiKey: string): { url: string; isOpenAICompat: boolean } {
  if (model.startsWith("gemini")) {
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      isOpenAICompat: false,
    };
  }
  if (model.startsWith("sonar") || model.startsWith("llama-3.1-sonar")) {
    return { url: "https://api.perplexity.ai/chat/completions", isOpenAICompat: true };
  }
  if (
    model.startsWith("llama") ||
    model.startsWith("mixtral") ||
    model.startsWith("gemma") ||
    model.startsWith("deepseek") ||
    model.startsWith("qwen") ||
    apiKey.startsWith("gsk_")
  ) {
    return { url: "https://api.groq.com/openai/v1/chat/completions", isOpenAICompat: true };
  }
  return { url: "https://api.openai.com/v1/chat/completions", isOpenAICompat: true };
}

export async function aiRequest({
  systemPrompt,
  messages,
}: {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const apiKey =
    localStorage.getItem("sk_api_key") ||
    localStorage.getItem("sk_groq_key") ||
    "";
  const model =
    localStorage.getItem("sk_model") || "llama-3.3-70b-versatile";

  if (!apiKey || apiKey === "demo" || apiKey.trim() === "") {
    return "Configure uma chave Groq (grátis) em ⚙️ Configurações para eu poder responder. Acesse: console.groq.com";
  }

  const { url, isOpenAICompat } = resolveEndpoint(model, apiKey);

  if (!isOpenAICompat) {
    const lastUser = messages.filter(m => m.role === "user").at(-1)?.content || "";
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: lastUser }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 8192 },
      }),
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(data.error?.message || "Erro Gemini API");
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.85,
      max_tokens: 8192,
    }),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(data.error?.message || `Erro API (${res.status})`);
  return data.choices?.[0]?.message?.content || "";
}

export async function callAI(
  text: string,
  mode: string,
  apiKey: string,
  model: string,
  customPrompt?: string | null
): Promise<string> {
  const isDemo = !apiKey || apiKey === "demo" || apiKey.trim() === "";
  if (isDemo) return demoResult(text, mode);

  const systemPrompt = customPrompt || MODE_PROMPTS[mode] || MODE_PROMPTS.chat;
  const { url, isOpenAICompat } = resolveEndpoint(model, apiKey);

  if (!isOpenAICompat) {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(data.error?.message || "Erro Gemini API");
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(data.error?.message || `Erro API (${res.status})`);
  return data.choices?.[0]?.message?.content || "";
}
