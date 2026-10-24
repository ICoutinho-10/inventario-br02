// Sessão e senhas da Central (Cloudflare Pages Functions / Workers — Web Crypto).
//
// Sessão = cookie HttpOnly "central_sessao" = base64url(JSON {u, exp}) + "." + HMAC-SHA256.
// O porteiro (_middleware.js) e a API conferem a MESMA assinatura.
// Senha  = PBKDF2-SHA256, 150.000 iterações, sal aleatório por usuário. Só o hash fica
//          guardado (Cloudflare KV); a senha em si não é salva em lugar nenhum.
const ENC = new TextEncoder();

export const COOKIE = "central_sessao";
export const DURACAO_SEGUNDOS = 12 * 60 * 60; // 12 h
// 20.000 iterações: o plano grátis do Cloudflare dá só ~10 ms de CPU por requisição, e
// PBKDF2 a 150k estoura isso (~40 ms). 20k roda em ~5–6 ms (cabe com folga) e segue seguro
// pro uso interno (salt por usuário + atraso de 900 ms em erro + HTTPS). O nº de iterações
// fica gravado no próprio hash, então dá pra aumentar depois sem invalidar os existentes.
const ITER = 20000;

function bytesParaB64url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlParaBytes(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function textoParaB64url(texto) { return bytesParaB64url(ENC.encode(texto)); }

function tempoConstante(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

async function hmac(segredo, dados) {
  const chave = await crypto.subtle.importKey("raw", ENC.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", chave, ENC.encode(dados));
  return new Uint8Array(sig);
}

export async function assinarSessao(usuario, segredo) {
  const payload = textoParaB64url(JSON.stringify({ u: usuario, exp: Math.floor(Date.now() / 1000) + DURACAO_SEGUNDOS }));
  const assinatura = bytesParaB64url(await hmac(segredo, payload));
  return `${payload}.${assinatura}`;
}

export async function lerSessao(cabecalhoCookie, segredo) {
  if (!cabecalhoCookie || !segredo) return null;
  const par = cabecalhoCookie.split(/;\s*/).find(c => c.startsWith(`${COOKIE}=`));
  if (!par) return null;
  const [payload, assinatura] = par.slice(COOKIE.length + 1).split(".");
  if (!payload || !assinatura) return null;
  const esperada = await hmac(segredo, payload);
  let recebida;
  try { recebida = b64urlParaBytes(assinatura); } catch { return null; }
  if (!tempoConstante(esperada, recebida)) return null;
  try {
    const dados = JSON.parse(new TextDecoder().decode(b64urlParaBytes(payload)));
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

function hex(bytes) { return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(""); }
function hexParaBytes(h) { const o = new Uint8Array(h.length / 2); for (let i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16); return o; }

async function pbkdf2(senha, sal, iter) {
  const chave = await crypto.subtle.importKey("raw", ENC.encode(senha), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: sal, iterations: iter, hash: "SHA-256" }, chave, 256);
  return new Uint8Array(bits);
}

export async function gerarHash(senha) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const h = await pbkdf2(String(senha), sal, ITER);
  return `pbkdf2$${ITER}$${hex(sal)}$${hex(h)}`;
}
export async function conferirSenha(senha, guardado) {
  const [tipo, iter, salHex, hashHex] = String(guardado || "").split("$");
  if (tipo !== "pbkdf2" || !iter || !salHex || !hashHex) return false;
  const calc = await pbkdf2(String(senha), hexParaBytes(salHex), Number(iter));
  return tempoConstante(calc, hexParaBytes(hashHex));
}

// comparação de string em tempo ~constante (código de 1º acesso)
export function igualSeguro(a, b) {
  const A = ENC.encode(String(a || "")), B = ENC.encode(String(b || ""));
  return tempoConstante(A, B);
}

export const normalizarUsuario = u => String(u || "").trim().toLowerCase();
