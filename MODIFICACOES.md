# Modificações — Central de Análise de Inventário (BR02)

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
