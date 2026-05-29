import{q as x,a9 as b,ad as g,Q as r,I as e,y as U}from"./index-q_gTu9nj.js";import{B as t}from"./button-D5ZhSwEd.js";import{I as M}from"./input-BHYEJHxF.js";import{B as p}from"./badge-BCXvIIul.js";import{C as L,a as h}from"./card-BtrX4egs.js";import{T as F}from"./textarea-CCtB2qGH.js";import{A as B}from"./arrow-left-DYElIYXR.js";import{S as V}from"./scale-GBhUYU-E.js";import{G as j}from"./gavel-Dwyyfr6c.js";import{B as q}from"./briefcase-jFpqll2q.js";import{S as G}from"./shield-DrACl4xC.js";import{B as J}from"./building-2-ywDJkoHl.js";import{B as H}from"./book-open-CctBA1uj.js";import{S as X}from"./search-jJ27H8hL.js";import{F as D}from"./file-text-D5YgGlaO.js";import{C as w}from"./chevron-right-CedePU1E.js";import{C as Z}from"./copy-C0ymX2fa.js";/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=x("Heart",[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",key:"c3ymky"}]]),y=U(),$=[{id:"Cível",icon:V,color:"text-blue-400"},{id:"Criminal",icon:j,color:"text-red-400"},{id:"Trabalhista",icon:q,color:"text-yellow-400"},{id:"Família",icon:z,color:"text-pink-400"},{id:"Previdenciário",icon:G,color:"text-green-400"},{id:"Tributário",icon:J,color:"text-purple-400"},{id:"Constitucional",icon:H,color:"text-cyan-400"}],d=[{id:"civ-001",area:"Cível",subtipo:"Petição Inicial",titulo:"Ação de Cobrança",descricao:"Petição inicial para cobrança de dívida com documento comprobatório",variaveis:["AUTOR","CPF_AUTOR","RÉUS","VALOR","COMARCA"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA CÍVEL DA COMARCA DE {{COMARCA}}

{{AUTOR}}, brasileiro(a), portador(a) do CPF nº {{CPF_AUTOR}}, residente e domiciliado(a) nesta comarca, por seu advogado infra-assinado, vem respeitosamente à presença de Vossa Excelência propor

AÇÃO DE COBRANÇA

em face de {{RÉUS}}, pelos fatos e fundamentos a seguir expostos:

I — DOS FATOS

O(A) Autor(a) é credor(a) do(s) Réu(s) no valor de R$ {{VALOR}} ({{VALOR_EXTENSO}}), decorrente de {{ORIGEM_DÍVIDA}}, conforme documentos que instruem a presente.

Apesar de reiteradas cobranças extrajudiciais, o(s) Réu(s) quedou(aram)-se inerte(s), impondo ao Autor(a) o ajuizamento da presente demanda.

II — DO DIREITO

A pretensão do(a) Autor(a) encontra amparo nos artigos 315, 389, 394 e 395 do Código Civil, que tratam da obrigação de pagar e dos efeitos da mora.

III — DO PEDIDO

Ante o exposto, requer-se:

a) A citação do(s) Réu(s) para, querendo, contestar a ação no prazo legal, sob pena de revelia;

b) Seja o(s) Réu(s) condenado(s) ao pagamento do valor principal de R$ {{VALOR}}, acrescido de juros de mora de 1% ao mês desde a data do vencimento, correção monetária pelo IPCA e honorários advocatícios de 20% sobre o valor da condenação;

c) A condenação do(s) Réu(s) ao pagamento das custas processuais.

Dá-se à causa o valor de R$ {{VALOR}}.

Nestes termos, pede deferimento.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"civ-002",area:"Cível",subtipo:"Indenização",titulo:"Ação de Indenização por Danos Morais",descricao:"Ação de indenização por danos morais causados por ato ilícito",variaveis:["AUTOR","RÉU","FATO","VALOR_PEDIDO","COMARCA"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA CÍVEL DA COMARCA DE {{COMARCA}}

{{AUTOR}}, já qualificado(a) nos autos, por seu advogado, vem propor

AÇÃO DE INDENIZAÇÃO POR DANOS MORAIS

em face de {{RÉU}}, pelas razões seguintes:

I — DOS FATOS

Em {{DATA_FATO}}, o(a) Réu(é) praticou ato ilícito em desfavor do(a) Autor(a), consistente em {{FATO}}, causando-lhe severo abalo moral, angústia e sofrimento psicológico comprovados.

II — DOS DANOS MORAIS

A conduta do(a) Réu(é) ultrapassou o mero dissabor cotidiano, configurando efetivo dano à honra, dignidade e imagem do(a) Autor(a), nos termos do art. 5º, X, da Constituição Federal e arts. 186 e 927 do Código Civil.

III — DO PEDIDO

Requer a condenação do(a) Réu(é) ao pagamento de indenização por danos morais no valor de R$ {{VALOR_PEDIDO}}, corrigido monetariamente e acrescido de juros legais, além de honorários e custas.

Valor da causa: R$ {{VALOR_PEDIDO}}.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"civ-003",area:"Cível",subtipo:"Contestação",titulo:"Contestação Cível Genérica",descricao:"Contestação para ações cíveis em geral com arguição de preliminares",variaveis:["RÉU","AUTOR","PROCESSO","COMARCA"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO

Processo nº {{PROCESSO}}

{{RÉU}}, já qualificado(a) nos autos da ação movida por {{AUTOR}}, por seu advogado, vem tempestivamente apresentar

CONTESTAÇÃO

pelos motivos de fato e de direito a seguir expostos:

I — PRELIMINAR

1.1 INÉPCIA DA INICIAL

A petição inicial não observa os requisitos do art. 319 do CPC, devendo ser indeferida nos termos do art. 330, I, do mesmo diploma.

II — DO MÉRITO

Os fatos narrados pelo(a) Autor(a) não correspondem à realidade. {{DEFESA_MÉRITO}}

As provas acostadas aos autos não amparam a pretensão autoral, devendo a ação ser julgada improcedente.

III — DO PEDIDO

Ante o exposto, requer:

a) O acolhimento da preliminar de inépcia da inicial, com extinção do processo sem resolução do mérito;
b) No mérito, a total improcedência do pedido;
c) A condenação do(a) Autor(a) ao pagamento de honorários advocatícios e custas.

Protesta pela produção de todas as provas admitidas em direito.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"civ-004",area:"Cível",subtipo:"Recurso",titulo:"Apelação Cível",descricao:"Recurso de apelação contra sentença cível",variaveis:["APELANTE","APELADO","PROCESSO","JUÍZO"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DO(A) {{JUÍZO}}

Processo nº {{PROCESSO}}

{{APELANTE}}, por seu advogado infra-assinado, inconformado com a r. sentença de fls. {{FLS}}, que {{TEOR_SENTENÇA}}, vem interpor

RECURSO DE APELAÇÃO

pelos seguintes fundamentos:

I — TEMPESTIVIDADE

O recurso é tempestivo, pois o(a) Recorrente foi intimado(a) em {{DATA_INTIMAÇÃO}}, e o prazo de 15 (quinze) dias vence em {{DATA_PRAZO}} (art. 1.003, § 5º, CPC).

II — CABIMENTO

Contra sentença definitiva que põe fim à fase cognitiva, cabe Apelação nos termos do art. 1.009 do CPC.

III — DAS RAZÕES

A sentença merece reforma por {{FUNDAMENTOS_RECURSO}}.

IV — DO PEDIDO

Requer o conhecimento e provimento do recurso, para que seja reformada a sentença atacada, julgando-se {{PEDIDO_RECURSO}}.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"civ-005",area:"Cível",subtipo:"Embargos",titulo:"Embargos de Declaração",descricao:"Embargos de declaração por omissão, contradição ou obscuridade",variaveis:["EMBARGANTE","PROCESSO"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO

Processo nº {{PROCESSO}}

{{EMBARGANTE}}, por seu advogado, vem apresentar

EMBARGOS DE DECLARAÇÃO

em face do acórdão/sentença de {{DATA_DECISÃO}}, pelos seguintes motivos:

I — CABIMENTO

Os presentes embargos são cabíveis nos termos do art. 1.022 do CPC, pois a decisão embargada contém {{VÍCIO}}.

II — DA OMISSÃO/CONTRADIÇÃO/OBSCURIDADE

A decisão foi omissa/contraditória/obscura quanto a {{PONTO_OMISSO}}, pois {{JUSTIFICATIVA}}.

III — DO PEDIDO

Requer o conhecimento e provimento dos embargos, suprindo-se a omissão/contradição/obscuridade apontada, com efeitos infringentes se for o caso.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"crim-001",area:"Criminal",subtipo:"Habeas Corpus",titulo:"Habeas Corpus Preventivo",descricao:"HC preventivo para evitar prisão ilegal iminente",variaveis:["PACIENTE","CPF_PACIENTE","AUTORIDADE_COATORA","FUNDAMENTO"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) DESEMBARGADOR(A) PRESIDENTE DO TRIBUNAL DE JUSTIÇA DO ESTADO

{{ADVOGADO}}, inscrito(a) na OAB/{{UF}} nº {{OAB}}, vem impetrar

HABEAS CORPUS PREVENTIVO

em favor de {{PACIENTE}}, CPF nº {{CPF_PACIENTE}}, em face de ato da autoridade coatora {{AUTORIDADE_COATORA}}, pelos seguintes fundamentos:

I — DO CABIMENTO

O Habeas Corpus preventivo (salvo-conduto) é cabível quando há ameaça iminente à liberdade de locomoção do(a) Paciente, nos termos do art. 5º, LXVIII, da Constituição Federal e art. 647 do CPP.

II — DA ILEGALIDADE

A prisão que se pretende efetuar é manifestamente ilegal porque {{FUNDAMENTO}}.

III — DO PERICULUM IN MORA

Há risco iminente de concretização da ameaça, impondo-se a concessão liminar da ordem.

IV — DO PEDIDO

Requer:

a) A concessão de LIMINAR, expedindo-se salvo-conduto em favor do(a) Paciente;
b) No mérito, a confirmação da ordem de Habeas Corpus, declarando-se a ilegalidade da prisão ameaçada.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"crim-002",area:"Criminal",subtipo:"Resposta à Acusação",titulo:"Resposta à Acusação (art. 396-A CPP)",descricao:"Resposta preliminar à acusação com arguição de preliminares e mérito",variaveis:["RÉU","PROCESSO","CRIME_IMPUTADO"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO

Processo nº {{PROCESSO}}

{{RÉU}}, nos autos da ação penal em que figura como Acusado(a) pelo suposto crime de {{CRIME_IMPUTADO}}, por seu advogado, vem apresentar

RESPOSTA À ACUSAÇÃO

(art. 396-A do Código de Processo Penal)

I — PRELIMINARES

1.1 INÉPCIA DA DENÚNCIA

A denúncia não descreve com clareza o fato criminoso e suas circunstâncias, em flagrante violação ao art. 41 do CPP, razão pela qual deve ser rejeitada.

II — DO MÉRITO

Ao contrário do que alega o Ministério Público, o(a) Acusado(a) {{DEFESA_MÉRITO}}.

Inexistem provas suficientes da autoria e materialidade delitivas, não podendo a acusação prevalecer.

III — DAS PROVAS

Protesta pela produção de todas as provas admitidas, especialmente: {{PROVAS}}.

IV — DO PEDIDO

Requer a absolvição sumária do(a) Acusado(a) nos termos do art. 397 do CPP, ou, subsidiariamente, o prosseguimento do feito com a produção das provas requeridas.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"crim-003",area:"Criminal",subtipo:"Liberdade Provisória",titulo:"Pedido de Liberdade Provisória",descricao:"Pedido de liberdade provisória com ou sem fiança",variaveis:["PRESO","PROCESSO","DELEGACIA_PRISÃO"],conteudo:`MERITÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO

Processo nº {{PROCESSO}}

{{ADVOGADO}}, inscrito(a) na OAB/{{UF}} nº {{OAB}}, advogado(a) de {{PRESO}}, preso(a) em flagrante delito em {{DATA_PRISÃO}} perante {{DELEGACIA_PRISÃO}}, vem requerer

LIBERDADE PROVISÓRIA SEM FIANÇA

com fundamento no art. 310, III e parágrafo único, do CPP, pelos seguintes fundamentos:

I — DOS FATOS

O(a) Requerente foi preso(a) em flagrante pelo crime de {{CRIME}}, conforme Auto de Prisão em Flagrante em anexo.

II — DOS REQUISITOS

Ausentes os requisitos da prisão preventiva (art. 312 CPP):
- Não há risco à ordem pública;
- Não há perigo de fuga — o(a) Acusado(a) é residente fixo(a) nesta comarca, conforme comprovante em anexo;
- Não há risco à instrução criminal.

III — DO PEDIDO

Requer a concessão de liberdade provisória sem fiança, com ou sem medidas cautelares alternativas (art. 319 CPP), expedindo-se o competente alvará de soltura.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"trab-001",area:"Trabalhista",subtipo:"Reclamação Trabalhista",titulo:"Reclamação Trabalhista — Verbas Rescisórias",descricao:"Reclamação trabalhista para cobrança de verbas rescisórias não pagas",variaveis:["RECLAMANTE","CPF_REC","RECLAMADA","CNPJ_REC","ADMISSÃO","DEMISSÃO","SALÁRIO"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DO TRABALHO

{{RECLAMANTE}}, CPF nº {{CPF_REC}}, residente e domiciliado(a) em {{ENDEREÇO}}, por seu advogado, vem propor

RECLAMAÇÃO TRABALHISTA

em face de {{RECLAMADA}}, CNPJ nº {{CNPJ_REC}}, pelos fundamentos seguintes:

I — DA RELAÇÃO DE EMPREGO

O(a) Reclamante trabalhou para a Reclamada de {{ADMISSÃO}} a {{DEMISSÃO}}, na função de {{FUNÇÃO}}, percebendo salário mensal de R$ {{SALÁRIO}}, cumprindo jornada de {{JORNADA}}.

II — DAS VERBAS PLEITEADAS

Com o término do contrato, a Reclamada não quitou as verbas rescisórias devidas:

a) Saldo de salário: R$ {{SALDO_SALÁRIO}};
b) Férias proporcionais + 1/3: R$ {{FÉRIAS}};
c) 13º salário proporcional: R$ {{DÉCIMO_TERCEIRO}};
d) FGTS + multa de 40%: R$ {{FGTS}};
e) Aviso prévio: R$ {{AVISO}};
f) Horas extras (se houver): R$ {{HORAS_EXTRAS}}.

Total pleiteado: R$ {{TOTAL}}.

III — DO DIREITO

Os arts. 477 e 487 da CLT, bem como a Súmula nº 305 do TST, amparam o pleito.

IV — DOS PEDIDOS

Requer a condenação da Reclamada ao pagamento de todas as verbas acima discriminadas, com juros e correção monetária, além de honorários advocatícios de 15% sobre o valor da condenação (art. 791-A CLT).

Dá-se à causa o valor de R$ {{TOTAL}}.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"trab-002",area:"Trabalhista",subtipo:"Reconhecimento de Vínculo",titulo:"Ação de Reconhecimento de Vínculo Empregatício",descricao:"Ação para reconhecimento de vínculo e pagamento de verbas",variaveis:["RECLAMANTE","RECLAMADA","PERÍODO_TRABALHO"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DO TRABALHO

{{RECLAMANTE}}, qualificado(a) nos autos, por seu advogado, vem propor

AÇÃO DE RECONHECIMENTO DE VÍNCULO EMPREGATÍCIO C/C PAGAMENTO DE VERBAS

em face de {{RECLAMADA}}, pelos seguintes fundamentos:

I — DOS FATOS

O(a) Reclamante prestou serviços à Reclamada durante o período de {{PERÍODO_TRABALHO}}, na função de {{FUNÇÃO}}, mediante salário mensal de R$ {{SALÁRIO}}, com habitualidade, subordinação, pessoalidade e onerosidade.

A Reclamada fraudou a relação empregatícia, fazendo o(a) Reclamante trabalhar como {{FORMA_FRAUDE}} (autônomo, MEI, etc.), sem reconhecer os direitos trabalhistas.

II — DO DIREITO

Presentes os elementos do art. 3º da CLT (subordinação, pessoalidade, habitualidade, onerosidade), impõe-se o reconhecimento do vínculo empregatício.

A fraude perpetrada pela Reclamada não afasta os direitos do(a) trabalhador(a), conforme Súmula nº 363 do TST.

III — DOS PEDIDOS

a) Reconhecimento do vínculo empregatício no período indicado;
b) Pagamento de todas as verbas trabalhistas e rescisórias devidas;
c) Registro do contrato de trabalho na CTPS;
d) Recolhimento do FGTS não depositado + multa de 40%.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"trab-003",area:"Trabalhista",subtipo:"Defesa",titulo:"Contestação Trabalhista (Defesa do Reclamado)",descricao:"Defesa do empregador em reclamação trabalhista",variaveis:["RECLAMADO","RECLAMANTE","PROCESSO"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DO TRABALHO

Processo nº {{PROCESSO}}

{{RECLAMADO}}, já qualificado(a), por seu advogado, vem apresentar

CONTESTAÇÃO

em face da reclamação proposta por {{RECLAMANTE}}, pelos seguintes fundamentos:

I — PREJUDICIAL DE MÉRITO — PRESCRIÇÃO

Declara-se a prescrição dos créditos anteriores a {{DATA_PRESCRIÇÃO}}, nos termos do art. 7º, XXIX, da Constituição Federal e art. 11 da CLT.

II — DO MÉRITO

Os fatos narrados na peça inicial não espelham a realidade. O(a) Reclamado(a) sempre cumpriu rigorosamente todas as obrigações trabalhistas, conforme documentos em anexo.

{{DEFESA_ESPECÍFICA}}

III — DAS PROVAS

Protesta pela produção de todas as provas admitidas em direito, especialmente documental, testemunhal e pericial.

IV — DO PEDIDO

Requer a improcedência total dos pedidos formulados na petição inicial, com condenação do(a) Reclamante em honorários sucumbenciais (art. 791-A, § 3º, CLT).

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"fam-001",area:"Família",subtipo:"Divórcio",titulo:"Divórcio Consensual Extrajudicial",descricao:"Escritura de divórcio consensual sem filhos menores perante cartório",variaveis:["CÔNJUGE_1","CPF_1","CÔNJUGE_2","CPF_2","DATA_CASAMENTO"],conteudo:`REQUERIMENTO DE DIVÓRCIO CONSENSUAL EXTRAJUDICIAL

AO SENHOR(A) TABELIÃO(Ã) DO CARTÓRIO DE NOTAS

{{CÔNJUGE_1}}, CPF nº {{CPF_1}}, e {{CÔNJUGE_2}}, CPF nº {{CPF_2}}, casados sob o regime de {{REGIME_BENS}} desde {{DATA_CASAMENTO}}, vêm requerer a lavratura de

ESCRITURA PÚBLICA DE DIVÓRCIO CONSENSUAL

pelos seguintes fundamentos:

I — DOS FATOS

Os Requerentes encontram-se separados de fato desde {{DATA_SEPARAÇÃO}}, não possuindo filhos menores ou incapazes, e tendo acordado sobre a partilha de bens conforme abaixo discriminado.

II — DOS BENS

{{RELAÇÃO_BENS_E_PARTILHA}}

III — DO PEDIDO

Requerem a lavratura da escritura pública de divórcio, com a devida averbação nos registros civis e, se houver imóveis, nos Cartórios de Registro de Imóveis.

{{CIDADE}}, {{DATA}}.

_________________________
{{CÔNJUGE_1}}
CPF: {{CPF_1}}

_________________________
{{CÔNJUGE_2}}
CPF: {{CPF_2}}

_________________________
{{NOME_ADVOGADO}} — Advogado(a) Comum
OAB/{{UF}} nº {{OAB}}`},{id:"fam-002",area:"Família",subtipo:"Alimentos",titulo:"Ação de Alimentos",descricao:"Ação de alimentos para fixação de pensão alimentícia",variaveis:["ALIMENTANDO","ALIMENTANTE","VALOR_PEDIDO"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA DE FAMÍLIA

{{ALIMENTANDO}}, representado(a) por {{REPRESENTANTE}}, por seu advogado, vem propor

AÇÃO DE ALIMENTOS

em face de {{ALIMENTANTE}}, com base na Lei nº 5.478/68 e arts. 1.694 e seguintes do Código Civil.

I — DOS FATOS

O(a) Alimentante é pai/mãe/cônjuge do(a) Alimentando(a) e possui capacidade financeira para prestar os alimentos requeridos, conforme se demonstrará.

As necessidades do(a) Alimentando(a) incluem: {{NECESSIDADES}}.

II — DO PEDIDO LIMINAR

Requer a fixação de alimentos provisórios no valor de R$ {{VALOR_PEDIDO}} mensais, nos termos do art. 4º da Lei nº 5.478/68.

III — DO PEDIDO FINAL

Requer a fixação definitiva dos alimentos em {{VALOR_PEDIDO}} ({{PORCENTAGEM}}% do salário mínimo), com reajuste anual pelo INPC.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"fam-003",area:"Família",subtipo:"Guarda",titulo:"Regulamentação de Guarda e Visitas",descricao:"Ação para regulamentação de guarda compartilhada e visitas",variaveis:["REQUERENTE","REQUERIDO","FILHO"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA DE FAMÍLIA

{{REQUERENTE}}, por seu advogado, vem propor

AÇÃO DE REGULAMENTAÇÃO DE GUARDA E VISITAS

em face de {{REQUERIDO}}, em relação ao(à) menor {{FILHO}}, pelos seguintes fundamentos:

I — DOS FATOS

{{REQUERENTE}} e {{REQUERIDO}} são pais do(a) menor {{FILHO}}, nascido(a) em {{DATA_NASCIMENTO}}, e encontram-se separados desde {{DATA_SEPARAÇÃO}}, sem regulamentação formal da guarda.

II — DO INTERESSE DO MENOR

Em atenção ao princípio do melhor interesse da criança (ECA, art. 3º; CC, art. 1.583), requer-se a regulamentação da guarda compartilhada com residência primária junto ao(à) Requerente.

III — DAS VISITAS

As visitas do(a) Requerido(a) poderão ocorrer: {{REGIME_VISITAS}}.

IV — DO PEDIDO

Requer a fixação da guarda compartilhada, com residência do(a) menor junto ao(à) Requerente, e regulamentação das visitas conforme acima proposto.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"prev-001",area:"Previdenciário",subtipo:"Aposentadoria",titulo:"Ação de Concessão de Aposentadoria por Tempo de Contribuição",descricao:"Ação contra o INSS para concessão de aposentadoria por tempo de contribuição",variaveis:["SEGURADO","CPF","NIT_PIS_PASEP","TEMPO_CONTRIBUIÇÃO"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) FEDERAL

{{SEGURADO}}, CPF nº {{CPF}}, NIT/PIS/PASEP nº {{NIT_PIS_PASEP}}, por seu advogado, vem propor

AÇÃO DE CONCESSÃO DE APOSENTADORIA POR TEMPO DE CONTRIBUIÇÃO

em face do INSTITUTO NACIONAL DO SEGURO SOCIAL — INSS, pelos seguintes fundamentos:

I — DOS FATOS

O(a) Autor(a) requereu administrativamente a concessão de aposentadoria por tempo de contribuição (Processo INSS nº {{NB}}), que foi indeferida sob o fundamento de {{FUNDAMENTO_INDEFERIMENTO}}.

O(a) Segurado(a) possui {{TEMPO_CONTRIBUIÇÃO}} de contribuição, devidamente comprovados, sendo {{TEMPO_ESPECIAL}} destes em atividade especial, convertível para tempo comum pelo fator {{FATOR_CONVERSÃO}}.

II — DO DIREITO

Nos termos do art. 201, § 7º, I, da Constituição Federal (redação original, com direito adquirido), o(a) Segurado(a) preenche os requisitos para a aposentadoria por tempo de contribuição.

A atividade especial é comprovada por {{DOCUMENTOS}}, nos termos do Decreto nº 3.048/99.

III — DO PEDIDO

Requer:
a) A concessão da aposentadoria por tempo de contribuição com DIB em {{DATA_DER}};
b) O pagamento das parcelas em atraso, corrigidas pelo INPC e juros moratórios;
c) Honorários advocatícios de 10% sobre as parcelas vencidas (Súmula nº 111/STJ).

Valor da causa: R$ {{VALOR_CAUSA}}.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"prev-002",area:"Previdenciário",subtipo:"BPC/LOAS",titulo:"Ação de Concessão de BPC/LOAS",descricao:"Ação para concessão do Benefício de Prestação Continuada",variaveis:["REQUERENTE","CPF","RENDA_FAMILIAR","DEFICIÊNCIA_OU_IDADE"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) FEDERAL

{{REQUERENTE}}, CPF nº {{CPF}}, por seu advogado, vem propor

AÇÃO DE CONCESSÃO DO BENEFÍCIO DE PRESTAÇÃO CONTINUADA — BPC/LOAS

em face do INSS, pelos seguintes fundamentos:

I — DOS FATOS

O(a) Requerente é {{DEFICIÊNCIA_OU_IDADE}} e teve seu pedido administrativo de BPC/LOAS indeferido (NB nº {{NB}}) sob o fundamento de {{FUNDAMENTO_NEGATIVA}}.

A renda familiar per capita do(a) Requerente é de R$ {{RENDA_FAMILIAR}}, inferior a 1/4 do salário mínimo, conforme comprovantes em anexo.

II — DO DIREITO

O art. 203, V, da Constituição e o art. 20 da Lei nº 8.742/93 (LOAS) garantem o BPC ao idoso com 65 anos ou ao deficiente que não possua meios de prover sua subsistência.

A renda per capita de 1/4 do salário mínimo não é requisito absoluto, devendo ser analisada a situação de vulnerabilidade do núcleo familiar (STJ, REsp 1.112.557/MG — Recurso Repetitivo).

III — DO PEDIDO

Requer a concessão do BPC/LOAS com DIB na data do requerimento administrativo ({{DATA_DER}}), com pagamento dos atrasados corrigidos pelo INPC.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"prev-003",area:"Previdenciário",subtipo:"Auxílio-Doença",titulo:"Ação de Concessão de Auxílio-Doença / Aposentadoria por Invalidez",descricao:"Ação contra INSS para concessão de auxílio-doença ou aposentadoria por invalidez",variaveis:["SEGURADO","CPF","NB","DOENÇA_CID"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) FEDERAL

{{SEGURADO}}, CPF nº {{CPF}}, por seu advogado, vem propor

AÇÃO DE CONCESSÃO DE AUXÍLIO-DOENÇA / APOSENTADORIA POR INVALIDEZ

em face do INSS, pelos seguintes fundamentos:

I — DOS FATOS

O(a) Segurado(a) sofre de {{DOENÇA_CID}} (CID: {{CID}}), doença incapacitante diagnosticada em {{DATA_DIAGNÓSTICO}}.

O(a) Requerente teve o benefício indeferido/cessado (NB nº {{NB}}) após perícia médica administrativa que concluiu pela capacidade laborativa, em evidente contradição com os laudos médicos particulares acostados.

II — DO DIREITO

O art. 59 da Lei nº 8.213/91 prevê o auxílio-doença para o segurado que ficar incapacitado por mais de 15 dias consecutivos. O art. 42 prevê a aposentadoria por invalidez quando a incapacidade for total e permanente.

III — DO PEDIDO

Requer:
a) Tutela de urgência para implantação imediata do benefício;
b) A concessão do auxílio-doença com DIB na cessação indevida ({{DATA_CESSAÇÃO}});
c) Pagamento das parcelas em atraso, corrigidas monetariamente.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"trib-001",area:"Tributário",subtipo:"Mandado de Segurança",titulo:"Mandado de Segurança Tributário",descricao:"MS para suspensão de exigibilidade de tributo indevido",variaveis:["IMPETRANTE","CNPJ","AUTORIDADE_COATORA","TRIBUTO"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) FEDERAL

{{IMPETRANTE}}, pessoa jurídica de direito privado, CNPJ nº {{CNPJ}}, por seu advogado, vem impetrar

MANDADO DE SEGURANÇA COM PEDIDO LIMINAR

em face do(a) {{AUTORIDADE_COATORA}}, pelos seguintes fundamentos:

I — DO ATO COATOR

O(a) Impetrante é contribuinte do {{TRIBUTO}} e está sofrendo a exigência ilegal de {{DESCRIÇÃO_EXIGÊNCIA}}, em flagrante ofensa ao princípio da legalidade tributária (art. 150, I, CF).

II — DO DIREITO LÍQUIDO E CERTO

O direito do(a) Impetrante é líquido e certo, pois {{FUNDAMENTO_JURÍDICO}}.

A inconstitucionalidade/ilegalidade da exigência é evidente, conforme precedentes do STJ/STF: {{PRECEDENTES}}.

III — DA LIMINAR

Presentes o fumus boni iuris (demonstrado acima) e o periculum in mora (risco de inscrição em dívida ativa e protestos), requer-se a liminar para suspensão da exigibilidade do crédito tributário (art. 151, IV, CTN).

IV — DO PEDIDO

Requer a concessão da segurança para declarar a inexigibilidade do {{TRIBUTO}} na forma questionada, com expedição de certidão negativa de débitos.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"trib-002",area:"Tributário",subtipo:"Exceção de Pré-Executividade",titulo:"Exceção de Pré-Executividade",descricao:"Exceção de pré-executividade em execução fiscal",variaveis:["EXECUTADO","EXEQUENTE","PROCESSO","FUNDAMENTO"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO / FEDERAL

Processo nº {{PROCESSO}}

{{EXECUTADO}}, já qualificado(a) nos autos da execução fiscal movida por {{EXEQUENTE}}, por seu advogado, vem apresentar

EXCEÇÃO DE PRÉ-EXECUTIVIDADE

pelos seguintes fundamentos:

I — CABIMENTO

A exceção de pré-executividade é admitida quando a questão invocada for de ordem pública, não exigir dilação probatória e puder ser conhecida de ofício pelo juízo (STJ, Súmula nº 393).

II — DA MATÉRIA DE ORDEM PÚBLICA

{{FUNDAMENTO}} constitui matéria de ordem pública, cognoscível de plano, sem necessidade de embargar, porquanto {{JUSTIFICATIVA}}.

III — DO PEDIDO

Requer o acolhimento da exceção para extinguir a execução fiscal, condenando-se o(a) Exequente ao pagamento de honorários advocatícios.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"const-001",area:"Constitucional",subtipo:"Mandado de Segurança",titulo:"Mandado de Segurança Individual",descricao:"MS individual para proteção de direito líquido e certo",variaveis:["IMPETRANTE","AUTORIDADE_COATORA","ATO_COATOR"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO / FEDERAL / DESEMBARGADOR(A)

{{IMPETRANTE}}, por seu advogado, vem impetrar

MANDADO DE SEGURANÇA COM PEDIDO LIMINAR

em face do(a) {{AUTORIDADE_COATORA}}, apontada como autoridade coatora, pelos seguintes fundamentos:

I — DA AUTORIDADE COATORA

O(a) {{AUTORIDADE_COATORA}} praticou o ato coator consistente em {{ATO_COATOR}}, que viola direito líquido e certo do(a) Impetrante.

II — DO DIREITO LÍQUIDO E CERTO VIOLADO

O direito do(a) Impetrante decorre de {{FUNDAMENTO_LEGAL}}, sendo líquido e certo por estar comprovado de plano, sem necessidade de dilação probatória.

III — DA LIMINAR

Presentes o fumus boni iuris e o periculum in mora ({{URGÊNCIA}}), requer-se a suspensão imediata dos efeitos do ato coator.

IV — DO PEDIDO

Requer:
a) A concessão de liminar para suspender o ato coator;
b) No mérito, a concessão definitiva da segurança, tornando definitiva a liminar.

{{CIDADE}}, {{DATA}}.

_________________________
{{NOME_ADVOGADO}}
OAB/{{UF}} nº {{OAB}}`},{id:"const-002",area:"Constitucional",subtipo:"Ação Popular",titulo:"Ação Popular",descricao:"Ação popular para anulação de ato lesivo ao patrimônio público",variaveis:["AUTOR_POPULAR","CPF","RÉU","ATO_IMPUGNADO"],conteudo:`EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO / FEDERAL

{{AUTOR_POPULAR}}, cidadão(ã) brasileiro(a), CPF nº {{CPF}}, título de eleitor nº {{TÍTULO_ELEITOR}}, por seu advogado, vem propor

AÇÃO POPULAR

(Lei nº 4.717/65 e art. 5º, LXXIII, CF)

em face de {{RÉU}}, para anulação de ato lesivo ao patrimônio público.

I — DOS FATOS

O(a) Réu(é) praticou o ato administrativo consistente em {{ATO_IMPUGNADO}}, que causou lesão ao patrimônio público no valor estimado de R$ {{VALOR_PREJUÍZO}}.

II — DA ILEGALIDADE E LESIVIDADE

O ato é ilegal porque {{FUNDAMENTO_ILEGALIDADE}} e lesivo ao patrimônio público porque {{FUNDAMENTO_LESIVIDADE}}.

III — DO PEDIDO LIMINAR

Requer a suspensão imediata dos efeitos do ato impugnado para evitar dano irreparável ao patrimônio público.

IV — DO MÉRITO

Requer a anulação do ato impugnado e a condenação do(a) Réu(é) à reparação integral do dano causado ao erário.

{{CIDADE}}, {{DATA}}.

_________________________
{{AUTOR_POPULAR}}
CPF: {{CPF}}`}];function Oe(){const[,l]=b(),{toast:n}=g(),[A,R]=r.useState(""),[s,m]=r.useState(null),[o,T]=r.useState(null),[c,E]=r.useState(!1),[i,u]=r.useState(""),I=r.useMemo(()=>d.filter(a=>{const _=!s||a.area===s,O=!A||[a.titulo,a.descricao,a.area,a.subtipo].join(" ").toLowerCase().includes(A.toLowerCase());return _&&O}),[s,A]);function C(a){T(a),u(a.conteudo),E(!1)}function S(){o&&(navigator.clipboard.writeText(i),n({title:"Copiado!",description:"Template copiado para a área de transferência."}))}function v(){o&&(localStorage.setItem("sk-template-para-editor",i),n({title:"Template carregado!",description:"Abrindo o editor com o template..."}),setTimeout(()=>l("/"),800))}async function N(){if(o)try{await fetch(`${y}/doc-templates`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({titulo:o.titulo,categoria:o.area,conteudo:i})}),n({title:"Salvo!",description:"Template salvo na sua biblioteca."})}catch{n({title:"Erro",description:"Não foi possível salvar.",variant:"destructive"})}}return e.jsxs("div",{className:"min-h-screen bg-[#0f172a] text-slate-100 flex flex-col",children:[e.jsxs("header",{className:"border-b border-slate-700 px-4 py-3 flex items-center gap-3 bg-[#0f172a]",children:[e.jsx(t,{variant:"ghost",size:"icon",onClick:()=>l("/"),children:e.jsx(B,{className:"h-4 w-4"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"font-bold text-base",children:"Templates Jurídicos"}),e.jsxs("p",{className:"text-xs text-slate-400",children:[d.length," modelos por área do direito"]})]})]}),e.jsxs("div",{className:"flex flex-1 overflow-hidden",children:[e.jsxs("aside",{className:"w-48 border-r border-slate-700 bg-slate-900 flex flex-col py-2 shrink-0",children:[e.jsxs("button",{className:`text-left px-4 py-2 text-sm rounded mx-1 mb-1 transition-colors ${s?"text-slate-300 hover:bg-slate-800":"bg-blue-600 text-white"}`,onClick:()=>m(null),children:["Todas as áreas",e.jsxs("span",{className:"ml-1 text-xs opacity-70",children:["(",d.length,")"]})]}),$.map(({id:a,icon:_,color:O})=>{const P=d.filter(f=>f.area===a).length;return e.jsxs("button",{className:`text-left px-4 py-2 text-sm rounded mx-1 mb-1 flex items-center gap-2 transition-colors ${s===a?"bg-blue-600 text-white":"text-slate-300 hover:bg-slate-800"}`,onClick:()=>m(a),children:[e.jsx(_,{className:`h-3.5 w-3.5 ${s===a?"text-white":O}`}),e.jsx("span",{className:"flex-1",children:a}),e.jsxs("span",{className:"text-xs opacity-60",children:["(",P,")"]})]},a)})]}),e.jsxs("div",{className:"w-64 border-r border-slate-700 bg-slate-900 flex flex-col shrink-0",children:[e.jsx("div",{className:"p-2 border-b border-slate-700",children:e.jsxs("div",{className:"relative",children:[e.jsx(X,{className:"absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500"}),e.jsx(M,{placeholder:"Buscar templates...",value:A,onChange:a=>R(a.target.value),className:"pl-8 h-8 text-xs bg-slate-800 border-slate-600 text-slate-200"})]})}),e.jsxs("div",{className:"flex-1 overflow-y-auto",children:[I.length===0&&e.jsx("p",{className:"text-slate-500 text-xs text-center mt-8",children:"Nenhum template encontrado"}),I.map(a=>e.jsxs("button",{className:`w-full text-left px-3 py-3 border-b border-slate-700/50 hover:bg-slate-800 transition-colors flex items-start gap-2 ${(o==null?void 0:o.id)===a.id?"bg-slate-800 border-l-2 border-l-blue-500":""}`,onClick:()=>C(a),children:[e.jsx(D,{className:"h-4 w-4 text-slate-500 mt-0.5 shrink-0"}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("p",{className:"text-sm font-medium text-slate-200 truncate",children:a.titulo}),e.jsxs("div",{className:"flex items-center gap-1.5 mt-0.5",children:[e.jsx(p,{className:"text-[10px] px-1 py-0 h-4 bg-slate-700 text-slate-400 border-0",children:a.area}),e.jsx("span",{className:"text-[10px] text-slate-500",children:a.subtipo})]}),e.jsx("p",{className:"text-[11px] text-slate-500 mt-1 line-clamp-2",children:a.descricao})]}),e.jsx(w,{className:"h-3 w-3 text-slate-600 mt-1 shrink-0"})]},a.id))]})]}),e.jsx("div",{className:"flex-1 flex flex-col overflow-hidden",children:o?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"border-b border-slate-700 px-4 py-3 bg-slate-900 flex items-start justify-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"font-semibold text-sm",children:o.titulo}),e.jsxs("div",{className:"flex items-center gap-2 mt-1",children:[e.jsx(p,{className:"text-xs bg-blue-900 text-blue-300 border-0",children:o.area}),e.jsx("span",{className:"text-xs text-slate-400",children:o.subtipo})]}),o.variaveis.length>0&&e.jsxs("p",{className:"text-xs text-slate-500 mt-1",children:["Variáveis: ",o.variaveis.map(a=>`{{${a}}}`).join(", ")]})]}),e.jsxs("div",{className:"flex items-center gap-2 shrink-0",children:[e.jsx(t,{size:"sm",variant:"outline",className:"h-7 text-xs border-slate-600",onClick:()=>E(!c),children:c?"Visualizar":"Editar"}),e.jsxs(t,{size:"sm",variant:"outline",className:"h-7 text-xs border-slate-600",onClick:S,children:[e.jsx(Z,{className:"h-3 w-3 mr-1"}),"Copiar"]}),e.jsx(t,{size:"sm",variant:"outline",className:"h-7 text-xs border-slate-600 text-green-400 border-green-700",onClick:N,children:"Salvar na Biblioteca"}),e.jsx(t,{size:"sm",className:"h-7 text-xs bg-blue-600 hover:bg-blue-700",onClick:v,children:"Usar no Editor"})]})]}),e.jsx("div",{className:"flex-1 overflow-auto p-4",children:c?e.jsx(F,{value:i,onChange:a=>u(a.target.value),className:"w-full h-full min-h-[500px] font-mono text-xs bg-slate-800 border-slate-600 text-slate-100 resize-none"}):e.jsx(L,{className:"bg-slate-800 border-slate-700 max-w-3xl mx-auto",children:e.jsx(h,{className:"p-6",children:e.jsx("pre",{className:"text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed",children:i})})})})]}):e.jsxs("div",{className:"flex-1 flex flex-col items-center justify-center gap-4 text-slate-500",children:[e.jsx(D,{className:"h-16 w-16 opacity-20"}),e.jsx("p",{className:"text-sm",children:"Selecione um template para visualizar"}),e.jsxs("p",{className:"text-xs",children:[d.length," modelos prontos para usar"]})]})})]})]})}export{Oe as default};
