# Modificações — Central de Análise de Inventário (BR02)

## v0.2.0 — 24/10/2026 — Login real + Usuários na Administração
Renomeado o produto para **Central de Análise de Inventário** e adicionado **login real**
(espelhando o Workspace Warehouse, hospedado no Netlify). O app operacional segue **público**;
a **Administração (`/admin/`)** passa a exigir login e é só de administrador. O gerenciador de
usuários foi integrado dentro do painel `/admin/` já existente (não um admin paralelo).

**Adicionado (infra de login, Netlify):**
- `netlify.toml` — deploy (publish na raiz, functions, edge function porteiro, headers no-store).
- `netlify/lib/sessao.mjs` — sessão HMAC-SHA256 (cookie `central_sessao`, 12 h) + senha PBKDF2-SHA256 (150k).
- `netlify/lib/usuarios.mjs` — store de usuários no Netlify Blobs (`central-usuarios`); criar/trocar/resetar/admin/remover; admin fixo `ivan.silva`.
- `netlify/lib/acessos.mjs` — histórico de acessos (Blobs `central-historico`).
- `netlify/functions/api.mjs` — `/api/*`: login, logout, setup, sessão, trocar-senha, acessos (usuários).
- `netlify/edge-functions/porteiro.js` — protege SÓ `/admin` e `/scripts-publicados` (resto público por ora).
- `login.html` — tela de login (marca Central); 1º acesso cria o administrador com código `CENTRAL_SETUP`.
- `scripts/usuarios.mjs` — CLI de bootstrap (segredo, setup, adicionar, publicar).
- `scripts-publicados/` — pasta das versões dos scripts (download só logado).
- `package.json`, `.gitignore`, assets `login/` (byd.png, fundo.webp).

**Alterado:**
- `admin/index.html` — gate de acesso (só admin; coordenador volta pro app; sem backend segue público),
  nova aba **Usuários** (criar/resetar/admin/remover + histórico), atalhos **Apps Script** e
  **Scripts publicados**, saudação + **Sair**; marca "Central de Análise · BR02".
- `index.html` — marca e título "Central de Análise de Inventário / · BR02".

**Pendente (Ivan):** criar o site no Netlify ligado a este repo e configurar `CENTRAL_SECRET` e
`CENTRAL_SETUP` (ver README). Até lá, no GitHub Pages, a Administração continua pública (sem regressão).
