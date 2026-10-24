// PORTEIRO da Central (Cloudflare Pages middleware — roda antes de tudo). Protege SÓ a
// área de ADM e os scripts publicados; o resto (app operacional, login, assets) é público.
// Sem sessão válida numa página de ADM → manda pro /login.html. Confere a MESMA assinatura
// HMAC do functions/lib/sessao.js.
import { lerSessao } from "./lib/sessao.js";

function protegido(p) {
  return p === "/admin" || p === "/admin/" || p.startsWith("/admin/") ||
         p === "/scripts-publicados" || p.startsWith("/scripts-publicados/");
}

export const onRequest = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  if (!protegido(url.pathname)) return next();

  const sessao = await lerSessao(request.headers.get("cookie"), env.CENTRAL_SECRET);
  if (sessao) return next();

  const volta = url.pathname + url.search;
  return Response.redirect(new URL(`/login.html?volta=${encodeURIComponent(volta)}`, url), 302);
};
