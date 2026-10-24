// PORTEIRO da Central (edge function, Deno) — roda SÓ na frente da área de ADM e dos
// scripts publicados. As telas operacionais (dashboards/conferência) ficam PÚBLICAS por
// enquanto (pedido do Ivan); quando o login dos coordenadores entrar, é só ampliar o
// `config.path` abaixo para "/*". Confere a MESMA assinatura HMAC do netlify/lib/sessao.mjs.
const COOKIE = "central_sessao";

const enc = new TextEncoder();
function b64urlParaBytes(texto) {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((texto.length + 3) % 4);
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function sessaoValida(cookieHeader, segredo) {
  if (!cookieHeader || !segredo) return false;
  const par = cookieHeader.split(/;\s*/).find(c => c.startsWith(`${COOKIE}=`));
  if (!par) return false;
  const [payload, assinatura] = par.slice(COOKIE.length + 1).split(".");
  if (!payload || !assinatura) return false;
  try {
    const chave = await crypto.subtle.importKey("raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("HMAC", chave, b64urlParaBytes(assinatura), enc.encode(payload));
    if (!ok) return false;
    const dados = JSON.parse(new TextDecoder().decode(b64urlParaBytes(payload)));
    return Boolean(dados.u && dados.exp && dados.exp > Date.now() / 1000);
  } catch {
    return false;
  }
}

export default async (request, context) => {
  const url = new URL(request.url);
  const segredo = Netlify.env.get("CENTRAL_SECRET");
  if (await sessaoValida(request.headers.get("cookie"), segredo)) return context.next();

  const volta = url.pathname + url.search;
  return Response.redirect(new URL(`/login.html?volta=${encodeURIComponent(volta)}`, url), 302);
};

// Só a área de ADM e os scripts publicados passam pelo porteiro; o resto é público.
export const config = { path: ["/admin", "/admin/*", "/scripts-publicados", "/scripts-publicados/*"] };
