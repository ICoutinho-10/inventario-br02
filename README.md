# Central de Análise de Inventário · BR02

Portal do Warehouse. O **app operacional** (contagem/conferência) é público e lança na
planilha pela API do Apps Script. A **Administração** (`/admin/`) — dashboard, performance,
histórico, Contagem Kardex, **Usuários** e atalhos (planilha, contagem, robô, Apps Script,
scripts) — tem **login real** e é só para administradores.

## Hospedagem (2 lugares, de propósito)
- **Cloudflare Pages = site principal** (operacional público **+** `/admin/` trancado por senha).
  Grátis, permite uso comercial, muito estável, sem "pausa por crédito". O login roda em
  **Pages Functions** e os usuários ficam em **Cloudflare KV**.
- **GitHub Pages = rede de segurança dos coordenadores**: publica **só o app operacional**
  (sem o `/admin/`), via GitHub Action. Se o Cloudflare cair, a contagem continua no ar aqui.
  O admin **nunca** é publicado no GitHub Pages.

```
functions/
  _middleware.js        porteiro: tranca /admin e /scripts-publicados (redireciona pro login)
  api/[[path]].js       /api/*: login, logout, setup, sessão, trocar-senha, acessos (usuários)
  lib/                  sessao.js (HMAC+PBKDF2 via Web Crypto), usuarios.js (KV), acessos.js (KV)
_headers                no-store nas páginas
index.html              app operacional (público)
admin/index.html        Administração (login, gate fail-closed → só admin)
login.html              tela de login
.github/workflows/pages-operacional.yml   deploy do operacional no GitHub Pages
```

## Deploy no Cloudflare (Ivan faz o login; Claude guia)
1. Criar conta grátis em cloudflare.com (se não tiver).
2. **Workers & Pages → Create → Pages → Connect to Git** → escolher o repo `inventario-br02`.
   Build command: *(vazio)*. Output directory: `/` (raiz). Deploy.
3. **KV**: Storage & Databases → KV → Create namespace (ex.: `central`). Depois, no projeto
   Pages → Settings → Functions (ou Bindings) → **KV namespace binding**: variável
   `CENTRAL_KV` → o namespace criado.
4. **Variáveis** (Settings → Environment variables / Secrets), em Production:
   - `CENTRAL_SECRET` = `7pVG5VEqeiRufoGpTd1xUScUixjiPEw-q4m-XeDs7AE`  *(já gerado; pode trocar)*
   - `CENTRAL_SETUP` = um código curto só seu p/ criar o 1º admin (ex.: invente 8–12 caracteres)
5. Redeploy. Abrir `https://<seu-projeto>.pages.dev/login.html`, usar o `CENTRAL_SETUP` para
   criar o 1º administrador (`ivan.silva`). Pronto — em `/admin/` → aba **Usuários** cadastra os coordenadores.

## GitHub Pages (rede de segurança — só operacional) — opcional
O workflow que publica **só o operacional** está em **`pages-operacional-github.yml.txt`**
(não foi commitado em `.github/workflows/` porque o push automático não tem permissão de
workflow). Para ativar:
1. No GitHub, crie o arquivo `.github/workflows/pages-operacional.yml` (Add file → Create new
   file) com o conteúdo de `pages-operacional-github.yml.txt`.
2. **Settings → Pages → Build and deployment → Source = "GitHub Actions"**.

Isso publica só `index.html` + `sbf.json` e **para de servir o `/admin/`** pelo github.io.
⚠️ Enquanto o Source estiver em "Deploy from a branch", o `/admin/` fica acessível no github.io
(embora o gate fail-closed já mande pro login). Então, se for manter o GitHub Pages, faça o
passo acima; se não, **desligue o GitHub Pages** (Settings → Pages → Source = None) e use só o
Cloudflare.

## Segurança
- Senha = PBKDF2-SHA256 (20k iterações — calibrado pro limite de ~10 ms de CPU do Cloudflare
  grátis; o nº fica no hash, dá pra subir depois), só o hash no KV. Sessão = cookie HttpOnly
  assinado (HMAC-SHA256, 12 h).
- `CENTRAL_SECRET`/`CENTRAL_SETUP` ficam **no Cloudflare**, nunca no repositório.
- O `/admin/` é trancado no servidor (porteiro) **e** no cliente (gate fail-closed).

## Ligar o login dos coordenadores (depois)
Em `functions/_middleware.js`, ampliar a função `protegido()` para cobrir as rotas do app
operacional também (e liberar `/login.html`, `/api/*`, `/login/*`).
