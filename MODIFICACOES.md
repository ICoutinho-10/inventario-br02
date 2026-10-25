# Modificações — Gestão de Desempenho de Inventário (BR02)

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
