# Modificações — Gestão de Desempenho de Inventário (BR02)

## v0.9.3 — 27/10/2026 — Status do HISTÓRICO: Ajustado manualmente (sem saldo) + Verificar (erro)
- Adicionado **"Verificar"** à lista suspensa do Status do HISTÓRICO (`ST_HIST`).
- `roboResultado` passou a marcar o HISTÓRICO em todos os casos: **BAIXADO/ALTA FEITA → "Ajustado Robô"**
  (resolve, sai de DIVERGÊNCIAS), **"JA BAIXADO" → "Ajustado manualmente"** (endereço sem saldo = ajuste
  feito à mão, não é erro; também resolve), **erro → "Verificar"** (não resolve, fica pra revisar).
- Antes, baixa-feita e já-baixado gravavam o mesmo "BAIXADO"/"Ajustado Robô" (não dava pra distinguir);
  e erro não marcava nada no HISTÓRICO.
- Validado com produto fake (ajustado = True p/ BAIXADO e JA BAIXADO, False p/ ERRO). Publicado (V38, mesma /exec).
- Robô (rede) v1.9.3: caso sem saldo manda status "JA BAIXADO". Fora do Git (projeto Apps Script + rede).

## v0.9.2 — 27/10/2026 — HISTÓRICO: ordem cronológica + "Qtde a lançar" correta
- **Ordem cronológica (regra fixa):** o HISTÓRICO passou a ser ordenado por "Última contagem"
  **crescente** — mais antigo em cima, lançamentos de hoje embaixo. Antes ordenava por dia
  decrescente (novo em cima). Vale sempre, a cada recálculo.
- **Qtde a lançar corrigida:** estava copiando a "Qtde contada" (nas linhas OK aparecia a própria
  contagem em vez de 0). Agora **Qtde a lançar = |Saldo TOTVS − Qtde contada|** (a diferença, usando
  a contagem consolidada do Kardex). OK → 0; BAIXA/ALTA → a diferença.
- Validado em todos os 5.475 registros: 0 linhas com "a lançar" errada, 0 pares fora de ordem.
- Mudança no Apps Script `atualizarHistorico_` (col 7 e o `sort`); publicado (mesma URL /exec). Fora do Git.

## v0.9.1 — 26/10/2026 — Correções backend: Kardex por último dia + rota `jalido`
- **Kardex somava datas diferentes.** Causa: um arquivo esquecido no projeto Apps Script
  (`Sem título.gs`, experimento "V30") tinha uma cópia própria de `kardex`/`salvarLote` que,
  por carregar por último, sobrescrevia as funções corretas. A `kardex` dele somava todas as
  contagens da posição (ex.: 15 de 23/10 + 11 de 26/10 = 26). Corrigido: a função ativa passou
  a considerar **apenas o último dia com contagem** (zera o anterior quando há dia mais novo).
- **"Sempre perguntar substituir" não funcionava pelo link.** O app (commits anteriores) passou a
  consultar `jaLido` no servidor antes de lançar, mas a **rota `jalido` não existia no roteador** do
  Apps Script — o servidor respondia `Ação inválida: jaLido`, o que (pela ponte) **cancelava todo
  lançamento** com "não foi possível verificar". Adicionada a rota
  `acao === 'jaLido' || acao === 'jalido' → jaLido(d)`. Agora a posição já contada é detectada
  mesmo após recarregar a página e a pergunta **Substituir?** aparece.
- Backend Apps Script republicado (Versão 36, mesma URL `/exec`). Sem alteração em arquivos do repo
  além deste registro — as correções são no projeto Apps Script (fora do Git).

## v0.9.0 — 26/10/2026 — Estilo WS: botão de cores circular + fonte DM Sans na contagem
- Gestão: o seletor de tema virou um **botão circular (estilo WS)** no topo que abre um popover com as
  **5 cores** (azul/lime/cyan/teal/claro) — nada se perde; só o botão ficou no padrão WS.
- Contagem: fonte do corpo trocada para **DM Sans** (igual WS/Gestão); títulos seguem em Oxanium.
- Referência de estilo do WS (medido ao vivo): DM Sans · fundo #040A18 · cards #23384C (raio 9px) · texto #EDF7FF.

## v0.8.6 — 25/10/2026 — Cenários imutáveis SBF/MB52
- Cada clique em **Atualizar SBF/MB52** cria um cenário identificado por dia, turno e horário.
- Cada novo lançamento grava o cenário e a fotografia usada no cálculo: saldo SBF, armazém e MB52.
- Lançamentos anteriores não mudam quando outro turno é atualizado ou quando há nova atualização no meio do turno.
- Uma atualização adicional no mesmo turno abre um novo cenário; somente os lançamentos posteriores usam a nova base.
- HISTÓRICO, DIVERGÊNCIAS e filas ROBÔ BAIXA/ALTA passaram a carregar a identificação do cenário.
- Registros anteriores à implantação foram preservados e identificados como `LEGADO`.
- Backend Apps Script publicado como **Versão 27**.

## v0.8.5 — 25/10/2026 — Quantidades com milhar e decimal
- Corrigida a leitura de quantidade no lançamento avulso e no Kardex: `10.520`/`10,520` passa a
  significar `10520`, em vez de `10,52`.
- Decimais reais de até duas casas continuam permitidos (`1,2` para itens em KG, por exemplo).
- Formatos ambíguos ou inválidos são bloqueados antes do envio para a planilha.

## v0.8.4 — 25/10/2026 — Destino de impressão Expedição Auto
- O botão da ficha Kardex agora identifica explicitamente **Expedição Auto** como destino.
- Impressora de rede cadastrada no ambiente: `\\10.42.1.253\Expedição_Auto` (`10.42.11.189`).
- A impressão continua usando a janela nativa do sistema (`window.print()`), compatível com computador e
  celular. Por segurança, navegadores não permitem ao site selecionar silenciosamente a impressora;
  no celular ela precisa estar disponível via serviço de impressão da rede (Mopria/AirPrint ou equivalente).

## v0.8.3 — 25/10/2026 — Nomes multi-seleção + trava ligável no painel + botão "Atualizar"
- App de contagem: o **Conferente** virou **lista suspensa multi-seleção** (estilo Google Sheets): abre a
  lista de nomes já usados (`api=conferentes`, nomes distintos separando por "/") com ✓, dá pra marcar
  vários, filtrar digitando e **"Adicionar"** nome novo. Chips continuam mostrando os escolhidos. Vale nos 2 modos.
- **Trava agora é uma chave no painel** (ADM liga/desliga no modal → `api=trava`, ScriptProperties
  `trava_ativa`; padrão **desligada**). Ligada, bloqueia o lançar com a mensagem (seg–sex por turno, sáb 1ª,
  dom liberado) — o app mostra o aviso do servidor ao tentar lançar. Backend Apps Script **V26**. Motivo da
  mudança: o classificador bloqueou ligar a flag no código; chave no painel é melhor (quem liga é o ADM).
- Botões de atualizar SBF/MB52 passaram a dizer **"Atualizar"** (era "Resetar").

## v0.8.2 — 25/10/2026 — Reset sem aba CONTROLE + rastreio na coluna "Atualizado em:" (hist)
- Backend (Apps Script **V25**): o reset deixou de usar a aba CONTROLE — agora fica em **ScriptProperties**
  (`resets_turno`, JSON por dia, poda ~120 dias). `status_turnos`/`resetar_base`/`checarTrava_` iguais, só mudou onde guarda.
- **HISTÓRICO ganhou a coluna "Atualizado em:"** (Ivan criou em R): por linha contada, mostra
  *data/hora · turno · responsável* do(s) reset(s) do dia daquela linha (achada por nome). Preenche no
  recálculo do histórico. ⚠️ Mudou o storage → resets antigos (aba CONTROLE) não valem; resetar de novo.

## v0.8.1 — 25/10/2026 — Perfis: Administrador / Coordenador / Time Inventário
- Perfis passam a ser **ADMINISTRADOR**, **COORDENADOR** e **TIME INVENTÁRIO** (Time = igual Coordenador:
  dashboards + reset, sem Usuários/Scripts). "Analista" antigo vira Coordenador (compat em `papelDe`).
- O **perfil aparece ao lado do nome** ("Olá, Fulano · Administrador"). Seletores de perfil (criar + por
  usuário) e a tabela de Usuários atualizados. Todos os perfis veem o botão Resetar SBF/MB52.

## v0.8.0 — 25/10/2026 — Trava SBF/MB52 por turno + botão Resetar (chave DESLIGADA)
- Backend (Apps Script **V24**): aba **CONTROLE** registra o reset por (dia, turno) com data/hora + usuário.
  Rotas `api=status_turnos` e `api=resetar_base`. `checarTrava_` em salvarContagem/salvarLote bloqueia com
  **"Aguardando atualização SBF e MB52 pelo time de inventário."** — seg–sex por turno, **sáb** basta o 1º reset,
  **dom** liberado. ⚠️ **`TRAVA_ATIVA=false`** por enquanto (NÃO bloqueia ainda) — ligar só após validar o reset,
  senão travaria TODA contagem na hora. O reset também limpa o cache da base (relê a SBF/MB52 recém-coladas).
- Painel (`admin`): botão **"Resetar SBF/MB52"** (todos os perfis) abre modal com os 3 turnos, última
  data/hora + quem resetou, e um Resetar por turno. Usa o usuário logado.
- **Pendente:** ligar `TRAVA_ATIVA`; mostrar a trava/mensagem no app de contagem; perfis
  ADMINISTRADOR/COORDENADOR/TIME INVENTÁRIO; snapshot SBF/MB52 por turno no histórico; impressora
  Expedição Auto (ficha Kardex).

## v0.7.2 — 25/10/2026 — Autocomplete de código na contagem avulsa
- App: o campo **Código** no avulso ganhou **autocomplete por prefixo** (igual ao endereço):
  digita 1+ número → lista SKUs que começam com aquilo (descrição abaixo); Enter/clique escolhe,
  setas navegam. Não atrapalha o leitor: Enter sem navegar na lista = busca o que foi digitado/bipado.
- Backend (Apps Script **Versão 23**): nova rota **api=skus** → `listarSkus()` devolve código+descrição
  **SEM saldo** (mantém a contagem às cegas). O cliente carrega a lista 1× e recarrega quando a base (SBF/MB52) muda.

## v0.7.1 — 25/10/2026 — Conferente: múltiplos nomes (chips editáveis/removíveis)
O campo **Conferente** virou **chips**: digite o nome + **Enter** (ou vírgula) pra adicionar; dá pra
pôr **2+ pessoas**; **clicar no nome edita** (volta pro campo), **× remove**. Vale nos dois modos
(avulsa e Kardex), **sincronizado**, e mantém o Turno. O `responsavel` enviado é a junção por `" / "`
(mesmo formato já usado na planilha, ex. `WEVERTON / VICTOR`). `estado.resp`/`inv_resp` continuam
string unida (compatível com todo o resto do código). Fecha o pedido "nome acrescentável/editável/
excluir + `+` pra 2 pessoas".

## v0.7.0 — 25/10/2026 — Origem + Turno (ponta a ponta: contagem → planilha → Gestão)
Captura a **Origem** (Kardex/Avulsa) e o **Turno** (1º/2º/3º) de cada contagem, grava na planilha
e deixa a Gestão filtrar por turno (para KPIs).

- **Nomes das colunas (achadas por nome, posição não importa):** na aba **Lançamentos** o Ivan
  criou `Origem do Lançamento` (G) e `Turno` (I); na aba **HISTÓRICO**, `Origem da contagem` (E)
  e `Turno` (N). São nomes **diferentes** p/ origem em cada aba — é de propósito, cada CAB casa com a sua.
- **Apps Script (Versão 22, mesma URL `/exec`):** `CAB_LANC` += `Origem do Lançamento`,`Turno`;
  `CAB_HIST` += `Origem da contagem`,`Turno`. `salvarContagem` (default Avulsa) e `salvarLote`
  (default Kardex) gravam origem+turno. O `atualizarHistorico_` agrega origem/turno por posição
  (lista distinta) e o `dadosAdmin` devolve origem+turno por lançamento. Editado direto no editor
  (Monaco) e republicado. Validado: `api=admin` → `ok:true`, HISTÓRICO com 19 colunas.
- **App de contagem (`index.html`):** seletor de **Turno** ao lado do Conferente nos dois modos
  (avulsa e Kardex), salvo em `localStorage` (`inv_turno`) e enviado em cada lançamento. Corrigido
  o fallback do Kardex que salvava sem `origem` (agora manda `origem:'Kardex'` + turno).
- **Gestão (`admin/index.html`):** filtro **Turno** (3 turnos) na barra, aplicado a H e L;
  "Limpar filtro" zera o turno; parse de origem/turno em H e L.
- Nota: lançamentos antigos ficam com origem/turno vazios (normal); passam a preencher a partir de agora.

## v0.6.0 — 24/10/2026 — Perfis (ADM/Analista/Coordenador) + botão de tema moderno
- **Perfis com senha** no gestão: **ADM** (tudo), **Analista** (dashboards + mensagens, sem Usuários/Scripts),
  **Coordenador** (só dashboards). Campo `papel` no KV (compat: `admin:true`→adm, resto→coordenador); admin
  fixo `ivan.silva`. API: `/api/sessao` retorna `papel`; `/api/acessos` cria/altera por `papel` (ação `papel`),
  só ADM. Tela ADM: gate libera qualquer perfil nos dashboards e **esconde Usuários/Scripts** pra não-ADM;
  seletor de perfil ao criar e por usuário. Validado no `wrangler` (criação/login/papel/bloqueio).
- **Botão de tema**: trocado o dropdown por **fileira de bolinhas** (mais moderno).

## v0.5.0 — 24/10/2026 — Gráficos seguem o tema + logo BYD consistente
- `admin/index.html`: **gráficos tematizados** — trilhos, barras de accent e heatmap passaram a
  usar `var(--trilho)/var(--acento)/var(--azul)/var(--acento-rgb)`, então recolorem junto com o tema
  (as cores de status verde/amarelo/vermelho continuam fixas, por serem semânticas). Redesenha na
  troca de tema. Novo var `--acento-rgb` por tema (pro heatmap).
- **Logo BYD consistente**: menu do admin (branco no escuro, vermelho no claro), `login.html`
  (BYD branco no card escuro) e cabeçalho da contagem `index.html` (BYD branco no header).
- Nota: a contagem pública (`index.html`) segue com tema único (claro) — seletor multi-tema lá
  seria refatoração maior de uma ferramenta crítica; fazer em passo separado com teste.

## v0.4.0 — 24/10/2026 — Seletor de temas + logo do WS no painel
- `admin/index.html`: **seletor de tema** (botão com degradê na barra superior) com 5 temas —
  **Azul-marinho** (atual), **Cyber Lime** (neon), **Electric Cyan** (neon), **Deep Teal** e
  **Claro** (modo claro). Escolha salva em `localStorage` (`central_tema`) e aplicada antes de
  pintar (sem flash).
- Refatoração: cores fixas do CSS viraram **variáveis** (`--ctrl`, `--ctrl2`, `--row-alt`,
  `--row-hover`, `--on-accent`, `--tese1/2`, `--glow1/2`, `--grad`, `--accent-weak`), pra os
  temas (inclusive claro) ficarem corretos. Degradês no chip ativo e no botão de tema.
- **Logo**: trocado o BYD plano pelo **ícone do Workspace Warehouse** (prédio BYD neon) na barra
  lateral + favicon (`login/ws-logo.png`).
- Nota: os gráficos SVG ainda usam a paleta azul fixa (dá pra tematizar depois).

## v0.3.0 — 24/10/2026 — Migração do login para Cloudflare (admin trancado por senha)
Decisão do Ivan: admin **100% com senha** e coordenadores **sem risco de ficar sem acesso**.
Trocamos o host do login de Netlify para **Cloudflare** (grátis, permite uso comercial, muito
estável, sem "pausa por crédito"). Operacional ganha **redundância** via GitHub Pages.

**Arquitetura:**
- **Cloudflare Pages** = site principal (operacional público + `/admin/` trancado). Login em
  Pages Functions; usuários/histórico em **Cloudflare KV**.
- **GitHub Pages** = fallback só do operacional (sem `/admin/`), via GitHub Action.

**Adicionado:**
- `functions/_middleware.js` — porteiro (tranca `/admin` e `/scripts-publicados`).
- `functions/api/[[path]].js` — `/api/*` (login/logout/setup/sessao/trocar-senha/acessos).
- `functions/lib/sessao.js` — sessão HMAC-SHA256 + senha PBKDF2-SHA256 (150k) via **Web Crypto**.
- `functions/lib/usuarios.js` — store de usuários no **Cloudflare KV** (`CENTRAL_KV`).
- `functions/lib/acessos.js` — histórico de acessos (KV).
- `_headers` — no-store/segurança nas páginas.
- `.github/workflows/pages-operacional.yml` — publica só o operacional no GitHub Pages.

**Alterado:**
- `admin/index.html` — gate **fail-closed**: qualquer falha → login (admin nunca público).

**Removido (eram do Netlify):**
- `netlify.toml`, `netlify/` (libs/functions/edge), `package.json`, `scripts/usuarios.mjs`.

**Pendente (Ivan — eu guio):** criar/conectar o projeto no Cloudflare, criar o KV `CENTRAL_KV`,
setar `CENTRAL_SECRET` e `CENTRAL_SETUP`; e em Settings → Pages trocar o Source para "GitHub
Actions" (fecha a exposição do /admin/ no github.io). Ver README.

---

## v0.2.0 — 24/10/2026 — Login real + Usuários (versão Netlify, substituída pela v0.3.0)
Primeira versão do login (porteiro + sessão + usuários) feita para Netlify e a aba **Usuários**
integrada no painel `/admin/` existente. Arquivos do Netlify removidos na v0.3.0; a UI (login.html,
aba Usuários no admin, atalhos Apps Script/Scripts, Sair) permaneceu.
