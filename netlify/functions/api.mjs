// /api/* da Central de Análise de Inventário. Login, sessão e administração (usuários +
// central dos ambientes). Tudo exige sessão (o porteiro já barra as telas de ADM, e aqui
// confere de novo), menos login/logout/setup. Os dados de inventário NÃO passam por aqui:
// o app (index.html) continua lendo/gravando direto no Apps Script da planilha.
import { assinarSessao, lerSessao, cookieSessao, cookieSair, conferirSenha, normalizarUsuario } from "../lib/sessao.mjs";
import { lerUsuarios, criarUsuario, trocarSenha, definirAdmin, removerUsuario, autoCadastrar, definirPropriaSenha, resetarSenha, SENHA_PADRAO, ADMINS_FIXOS, USUARIO_DE_PC } from "../lib/usuarios.mjs";
import { timingSafeEqual } from "node:crypto";
import { registrarAcesso, lerHistorico } from "../lib/acessos.mjs";

const json = (corpo, status = 200, extra = {}) => new Response(JSON.stringify(corpo), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra }
});
const esperar = ms => new Promise(r => setTimeout(r, ms));

export default async (request) => {
  const url = new URL(request.url);
  const rota = url.pathname.replace(/^\/api\/?/, "");
  const segredo = process.env.CENTRAL_SECRET;
  if (!segredo) return json({ ok: false, message: "Central sem CENTRAL_SECRET configurado." }, 500);

  // ---------- login / logout (públicos) ----------
  if (rota === "login" && request.method === "POST") {
    let corpo = {};
    try { corpo = await request.json(); } catch { /* corpo vazio */ }
    const usuario = normalizarUsuario(corpo.usuario);
    let guardado = (await lerUsuarios())[usuario];
    // fallback: usuário do PC + senha padrão → cadastra sozinho (aparece na Administração)
    if (!guardado && corpo.senha === SENHA_PADRAO && USUARIO_DE_PC.test(usuario)) guardado = await autoCadastrar(usuario);
    if (!usuario || !guardado || !conferirSenha(corpo.senha ?? "", guardado.hash)) {
      await esperar(900); // atrasa tentativa errada (força bruta fica lenta)
      return json({ ok: false, message: "Usuário ou senha inválidos." }, 401);
    }
    await registrarAcesso(usuario, { forcar: true });
    return json({ ok: true, trocarSenha: Boolean(guardado.trocarSenha) }, 200, { "Set-Cookie": cookieSessao(assinarSessao(usuario, segredo)) });
  }
  if (rota === "logout") return json({ ok: true }, 200, { "Set-Cookie": cookieSair() });

  // ---------- PRIMEIRO ACESSO (só enquanto não existe nenhum usuário) ----------
  // Cria o 1º administrador pela tela de login, com o código de uso único CENTRAL_SETUP.
  if (rota === "setup-status") {
    return json({ primeiroAcesso: Object.keys(await lerUsuarios()).length === 0 });
  }
  if (rota === "setup" && request.method === "POST") {
    if (Object.keys(await lerUsuarios()).length > 0) return json({ ok: false, message: "O primeiro acesso já foi feito." }, 403);
    let corpo = {};
    try { corpo = await request.json(); } catch { /* vazio */ }
    const codigo = Buffer.from(String(corpo.codigo || "").trim());
    const esperado = Buffer.from(String(process.env.CENTRAL_SETUP || ""));
    if (!esperado.length || codigo.length !== esperado.length || !timingSafeEqual(codigo, esperado)) {
      await esperar(900);
      return json({ ok: false, message: "Código de primeiro acesso inválido." }, 401);
    }
    try {
      const usuario = await criarUsuario(corpo.usuario, corpo.senha, true);
      return json({ ok: true }, 200, { "Set-Cookie": cookieSessao(assinarSessao(usuario, segredo)) });
    } catch (erro) {
      return json({ ok: false, message: String(erro.message) }, 400);
    }
  }

  // ---------- daqui para baixo, só com sessão ----------
  const sessao = lerSessao(request.headers.get("cookie"), segredo);
  if (!sessao) return json({ ok: false, login: true, message: "Faça login." }, 401);
  const cadastro = (await lerUsuarios())[sessao.usuario];
  if (!cadastro) return json({ ok: false, login: true, message: "Acesso removido." }, 401, { "Set-Cookie": cookieSair() });
  const ehAdmin = ADMINS_FIXOS.includes(sessao.usuario) || Boolean(cadastro.admin);
  // Ainda com a senha inicial: só pode criar a própria senha.
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
        try { await definirPropriaSenha(sessao.usuario, corpo.nova); return json({ ok: true }); }
        catch (erro) { return json({ ok: false, message: String(erro.message) }, 400); }
      }
      case "acessos": {
        // Administração de usuários: só administrador.
        if (!ehAdmin) return json({ ok: false, message: "Só administradores." }, 403);
        if (request.method === "GET" && url.searchParams.get("historico")) {
          return json({ ok: true, ...(await lerHistorico(normalizarUsuario(url.searchParams.get("historico")))) });
        }
        if (request.method === "GET") {
          const lista = await lerUsuarios();
          return json({ ok: true, usuarios: Object.entries(lista).map(([u, d]) => ({ usuario: u, admin: Boolean(d.admin) || ADMINS_FIXOS.includes(u), criadoEm: d.criadoEm ?? null, trocarSenha: Boolean(d.trocarSenha), origem: d.origem ?? null })).sort((a, b) => a.usuario.localeCompare(b.usuario)) });
        }
        let corpo = {};
        try { corpo = await request.json(); } catch { /* vazio */ }
        try {
          if (corpo.acao === "criar") await criarUsuario(corpo.usuario, corpo.senha, Boolean(corpo.admin));
          else if (corpo.acao === "senha") await trocarSenha(corpo.usuario, corpo.senha);
          else if (corpo.acao === "admin") await definirAdmin(corpo.usuario, Boolean(corpo.admin));
          else if (corpo.acao === "resetar") await resetarSenha(corpo.usuario);
          else if (corpo.acao === "remover") {
            if (normalizarUsuario(corpo.usuario) === sessao.usuario) throw new Error("Você não pode remover o seu próprio acesso.");
            await removerUsuario(corpo.usuario);
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
    return json({ ok: false, message: "Falha ao processar.", detail: String(erro?.message ?? erro) }, 503);
  }
};

export const config = { path: "/api/*" };
