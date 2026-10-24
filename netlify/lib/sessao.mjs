// Sessão e senhas da Central de Análise de Inventário (lado Node: função api + script
// de usuários). Mesmo mecanismo do Workspace Warehouse.
//
// Sessão = cookie HttpOnly "central_sessao" = base64url(JSON {u, exp}) + "." + HMAC-SHA256.
// O porteiro (edge function, Deno) confere a MESMA assinatura com Web Crypto.
// Senha  = PBKDF2-SHA256, 150.000 iterações, sal aleatório por usuário. Só o hash
//          fica guardado; a senha em si não é salva em lugar nenhum.
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

export const COOKIE = "central_sessao";
export const DURACAO_SEGUNDOS = 12 * 60 * 60; // 12 h, depois pede login de novo

const b64url = buf => Buffer.from(buf).toString("base64url");

export function assinarSessao(usuario, segredo) {
  const payload = b64url(JSON.stringify({ u: usuario, exp: Math.floor(Date.now() / 1000) + DURACAO_SEGUNDOS }));
  const assinatura = createHmac("sha256", segredo).update(payload).digest("base64url");
  return `${payload}.${assinatura}`;
}

export function lerSessao(cabecalhoCookie, segredo) {
  if (!cabecalhoCookie || !segredo) return null;
  const par = cabecalhoCookie.split(/;\s*/).find(c => c.startsWith(`${COOKIE}=`));
  if (!par) return null;
  const [payload, assinatura] = par.slice(COOKIE.length + 1).split(".");
  if (!payload || !assinatura) return null;
  const esperada = createHmac("sha256", segredo).update(payload).digest();
  const recebida = Buffer.from(assinatura, "base64url");
  if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) return null;
  try {
    const dados = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!dados.u || !dados.exp || dados.exp < Date.now() / 1000) return null;
    return { usuario: String(dados.u) };
  } catch {
    return null;
  }
}

export function cookieSessao(token) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DURACAO_SEGUNDOS}`;
}
export function cookieSair() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

const ITERACOES = 150000;
export function gerarHash(senha) {
  const sal = randomBytes(16);
  const hash = pbkdf2Sync(senha, sal, ITERACOES, 32, "sha256");
  return `pbkdf2$${ITERACOES}$${sal.toString("hex")}$${hash.toString("hex")}`;
}
export function conferirSenha(senha, guardado) {
  const [tipo, iter, salHex, hashHex] = String(guardado || "").split("$");
  if (tipo !== "pbkdf2" || !iter || !salHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, "hex");
  const calculado = pbkdf2Sync(String(senha), Buffer.from(salHex, "hex"), Number(iter), esperado.length, "sha256");
  return timingSafeEqual(calculado, esperado);
}

// Usuário = sem distinção de maiúsculas e sem espaços nas pontas.
export const normalizarUsuario = u => String(u || "").trim().toLowerCase();
