# Central de Análise de Inventário · BR02

Portal do Warehouse. O **app operacional** (contagem/conferência) é público e lança na
planilha pela API do Apps Script. A **Administração** (`/admin/`) — dashboard, performance,
histórico, Contagem Kardex, **Usuários** e atalhos (planilha, contagem, robô, Apps Script,
scripts) — tem **login real** e é só para administradores.

## Hospedagem
Hospedado no **Netlify** (o login precisa de servidor — não funciona no GitHub Pages).
- App público: `/` · Login: `/login.html` · Administração: `/admin/`
- O porteiro protege só `/admin` e `/scripts-publicados`; o resto é público por enquanto.
- Enquanto estiver no GitHub Pages (sem backend), a Administração segue pública (como hoje);
  ao subir pro Netlify com as env vars, o login passa a valer automaticamente.

## Primeiro deploy (Netlify)
1. Criar um site novo no Netlify ligado a este repositório (`icoutinho-10/inventario-br02`).
2. Na raiz do projeto, instalar deps e gerar os segredos:
   ```
   npm install
   node scripts/usuarios.mjs segredo    # cria CENTRAL_SECRET no Netlify
   node scripts/usuarios.mjs setup       # cria CENTRAL_SETUP e mostra o código do 1º acesso
   ```
3. Deploy. Abrir `/login.html`, usar o código do passo 2 para criar o 1º administrador
   (`ivan.silva`). Depois disso a criação de administrador fecha.
4. Em `/admin/` → aba **Usuários**: cadastrar os coordenadores (eles passam o login).

## Variáveis de ambiente (Netlify → Site configuration → Environment variables)
- `CENTRAL_SECRET` — assina a sessão (`scripts/usuarios.mjs segredo`).
- `CENTRAL_SETUP` — código de uso único do 1º administrador (`... setup`).
- `CENTRAL_USERS` — opcional, bootstrap de usuários por env (`... publicar`).

## Ligar o login dos coordenadores (depois)
Em `netlify/edge-functions/porteiro.js`, trocar o `config.path` para `"/*"` e liberar as
rotas públicas (login/api/assets), como no Workspace Warehouse.
