// /api/* da Gestão de Desempenho (Cloudflare Pages Function, catch-all). Login, sessão e administração
// (usuários). Tudo exige sessão, menos login/logout/setup. Os dados de inventário NÃO
// passam por aqui: o app (index.html / admin) continua lendo/gravando direto no Apps Script
// da planilha. Storage de usuários/histórico = Cloudflare KV (binding CENTRAL_KV).
import { assinarSessao, lerSessao, cookieSessao, cookieSair, conferirSenha, normalizarUsuario, igualSeguro } from "../lib/sessao.js";
import { lerUsuarios, criarUsuario, trocarSenha, definirAdmin, removerUsuario, autoCadastrar, definirPropriaSenha, resetarSenha, SENHA_PADRAO, ADMINS_FIXOS, USUARIO_DE_PC } from "../lib/usuarios.js";
import { registrarAcesso, lerHistorico } from "../lib/acessos.js";

const json = (corpo, status = 200, extra = {}) => new Response(JSON.stringify(corpo), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra }
});
const esperar = ms => new Promise(r => setTimeout(r, ms));

export const onRequest = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const rota = (params && params.path ? [].concat(params.path).join("/") : url.pathname.replace(/^\/api\/?/, "")).replace(/\/+$/, "");
  const segredo = env.CENTRAL_SECRET;
  const kv = env.CENTRAL_KV;
  if (!segredo) return json({ ok: false, message: "Gestão de Desempenho sem CENTRAL_SECRET configurado." }, 500);
  if (!kv) return json({ ok: false, message: "Gestão de Desempenho sem KV (CENTRAL_KV) configurado." }, 500);

  // ---------- login / logout (públicos) ----------
  if (rota === "login" && request.method === "POST") {
    let corpo = {};
    try { corpo = await request.json(); } catch { /* vazio */ }
    const usuario = normalizarUsuario(corpo.usuario);
    let guardado = (await lerUsuarios(kv, env))[usuario];
    if (!guardado && corpo.senha === SENHA_PADRAO && USUARIO_DE_PC.test(usuario)) guardado = await autoCadastrar(kv, env, usuario);
    if (!usuario || !guardado || !(await conferirSenha(corpo.senha ?? "", guardado.hash))) {
      await esperar(900);
      return json({ ok: false, message: "Usuário ou senha inválidos." }, 401);
    }
    await registrarAcesso(kv, usuario, { forcar: true });
    return json({ ok: true, trocarSenha: Boolean(guardado.trocarSenha) }, 200, { "Set-Cookie": cookieSessao(await assinarSessao(usuario, segredo)) });
  }
  if (rota === "logout") return json({ ok: true }, 200, { "Set-Cookie": cookieSair() });

  // ---------- PRIMEIRO ACESSO (só enquanto não existe nenhum usuário) ----------
  if (rota === "setup-status") {
    return json({ primeiroAcesso: Object.keys(await lerUsuarios(kv, env)).length === 0 });
  }
  if (rota === "setup" && request.method === "POST") {
    if (Object.keys(await lerUsuarios(kv, env)).length > 0) return json({ ok: false, message: "O primeiro acesso já foi feito." }, 403);
    let corpo = {};
    try { corpo = await request.json(); } catch { /* vazio */ }
    const esperado = String(env.CENTRAL_SETUP || "");
    if (!esperado || !igualSeguro(String(corpo.codigo || "").trim(), esperado)) {
      await esperar(900);
      return json({ ok: false, message: "Código de primeiro acesso inválido." }, 401);
    }
    try {
      const usuario = await criarUsuario(kv, env, corpo.usuario, corpo.senha, true);
      return json({ ok: true }, 200, { "Set-Cookie": cookieSessao(await assinarSessao(usuario, segredo)) });
    } catch (erro) {
      return json({ ok: false, message: String(erro.message) }, 400);
    }
  }

  // ---------- daqui para baixo, só com sessão ----------
  const sessao = await lerSessao(request.headers.get("cookie"), segredo);
  if (!sessao) return json({ ok: false, login: true, message: "Faça login." }, 401);
  const cadastro = (await lerUsuarios(kv, env))[sessao.usuario];
  if (!cadastro) return json({ ok: false, login: true, message: "Acesso removido." }, 401, { "Set-Cookie": cookieSair() });
  const ehAdmin = ADMINS_FIXOS.includes(sessao.usuario) || Boolean(cadastro.admin);
  if (cadastro.trocarSenha && !["sessao", "trocar-senha"].includes(rota)) {
    return json({ ok: false, trocarSenha: true, message: "Crie sua nova senha para continuar." }, 403);
  }

  try {
    switch (rota) {
      case "sessao":
        return json({ ok: true, usuario: sessao.usuario, admin: ehAdmin, trocarSenha: Boolean(cadastro.trocarSenha) });
      case "trocar-senha": {
        let corpo = {};
        try { corpo = await request.json(); } catch { /* vazio */ }
        try { await definirPropriaSenha(kv, env, sessao.usuario, corpo.nova); return json({ ok: true }); }
        catch (erro) { return json({ ok: false, message: String(erro.message) }, 400); }
      }
      case "acessos": {
        if (!ehAdmin) return json({ ok: false, message: "Só administradores." }, 403);
        if (request.method === "GET" && url.searchParams.get("historico")) {
          return json({ ok: true, ...(await lerHistorico(kv, normalizarUsuario(url.searchParams.get("historico")))) });
        }
        if (request.method === "GET") {
          const lista = await lerUsuarios(kv, env);
          return json({ ok: true, usuarios: Object.entries(lista).map(([u, d]) => ({ usuario: u, admin: Boolean(d.admin) || ADMINS_FIXOS.includes(u), criadoEm: d.criadoEm ?? null, trocarSenha: Boolean(d.trocarSenha), origem: d.origem ?? null })).sort((a, b) => a.usuario.localeCompare(b.usuario)) });
        }
        let corpo = {};
        try { corpo = await request.json(); } catch { /* vazio */ }
        try {
          if (corpo.acao === "criar") await criarUsuario(kv, env, corpo.usuario, corpo.senha, Boolean(corpo.admin));
          else if (corpo.acao === "senha") await trocarSenha(kv, env, corpo.usuario, corpo.senha);
          else if (corpo.acao === "admin") await definirAdmin(kv, env, corpo.usuario, Boolean(corpo.admin));
          else if (corpo.acao === "resetar") await resetarSenha(kv, env, corpo.usuario);
          else if (corpo.acao === "remover") {
            if (normalizarUsuario(corpo.usuario) === sessao.usuario) throw new Error("Você não pode remover o seu próprio acesso.");
            await removerUsuario(kv, env, corpo.usuario);
          } else throw new Error("Ação inválida.");
          return json({ ok: true });
        } catch (erro) {
          return json({ ok: false, message: String(erro.message) }, 400);
        }
      }
      case "health":
        return json({ ok: true, central: true });
      default:
        return json({ ok: false, message: "Rota não encontrada." }, 404);
    }
  } catch (erro) {
    return json({ ok: false, message: "Falha ao processar.", detail: String(erro && erro.message ? erro.message : erro) }, 503);
  }
};
