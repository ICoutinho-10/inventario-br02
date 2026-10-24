// Usuários da Central, guardados no Cloudflare KV (binding CENTRAL_KV, chave "usuarios:lista").
// Geridos PELA TELA de Administração (sem redeploy). Só hash de senha.
// Formato: { "<usuario>": { hash, admin, criadoEm } }
// Compatível com CENTRAL_USERS (env, bootstrap opcional): entram como usuários comuns.
import { gerarHash, normalizarUsuario } from "./sessao.js";

const CHAVE = "usuarios:lista";

function doEnv(env) {
  const bruto = String(env.CENTRAL_USERS || "").trim();
  if (!bruto) return {};
  let lista = {};
  try { lista = JSON.parse(bruto); } catch {
    try { lista = JSON.parse(atob(bruto)); } catch { return {}; }
  }
  return Object.fromEntries(Object.entries(lista).map(([u, hash]) => [u, { hash, admin: false }]));
}

// Depois que a tela gravar pela 1ª vez, o KV é a ÚNICA fonte; antes, vale o CENTRAL_USERS.
export async function lerUsuarios(kv, env) {
  try {
    const guardados = await kv.get(CHAVE, { type: "json" });
    if (guardados) return guardados;
  } catch { /* sem KV ainda */ }
  return doEnv(env || {});
}

const gravar = (kv, lista) => kv.put(CHAVE, JSON.stringify(lista));

// REGRA: o ADM cadastra os coordenadores na mão (eles passam o login). Senha inicial
// padrão 12345678; no 1º acesso a pessoa é OBRIGADA a criar a própria senha (trocarSenha).
// Fallback: usuário do PC + senha padrão também é cadastrado sozinho.
export const SENHA_PADRAO = "12345678";
export const ADMINS_FIXOS = ["ivan.silva"]; // administrador fixo (Ivan)
export const USUARIO_DE_PC = /^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/;

export async function autoCadastrar(kv, env, nome) {
  const usuario = normalizarUsuario(nome);
  const lista = await lerUsuarios(kv, env);
  if (lista[usuario]) return lista[usuario];
  lista[usuario] = { hash: await gerarHash(SENHA_PADRAO), admin: ADMINS_FIXOS.includes(usuario), trocarSenha: true,
                     origem: "primeiro-acesso", criadoEm: new Date().toISOString() };
  await gravar(kv, lista);
  return lista[usuario];
}

export async function definirPropriaSenha(kv, env, nome, senha) {
  if (String(senha || "").length < 8) throw new Error("A senha precisa ter no mínimo 8 dígitos.");
  if (String(senha) === SENHA_PADRAO) throw new Error("Escolha uma senha diferente da senha inicial.");
  const usuario = normalizarUsuario(nome);
  const lista = await lerUsuarios(kv, env);
  if (!lista[usuario]) throw new Error("Usuário não encontrado.");
  lista[usuario] = { ...lista[usuario], hash: await gerarHash(String(senha)), trocarSenha: false };
  await gravar(kv, lista);
}

export async function resetarSenha(kv, env, nome) {
  const usuario = normalizarUsuario(nome);
  const lista = await lerUsuarios(kv, env);
  if (!lista[usuario]) throw new Error("Usuário não encontrado.");
  lista[usuario] = { ...lista[usuario], hash: await gerarHash(SENHA_PADRAO), trocarSenha: true };
  await gravar(kv, lista);
}

export async function criarUsuario(kv, env, nome, senha, admin = false) {
  const usuario = normalizarUsuario(nome);
  if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) throw new Error("Usuário: 3 a 40 letras/números (pode usar . _ -).");
  if (String(senha || "").length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  const lista = await lerUsuarios(kv, env);
  lista[usuario] = { hash: await gerarHash(String(senha)), admin: Boolean(admin), criadoEm: new Date().toISOString() };
  await gravar(kv, lista);
  return usuario;
}

export async function trocarSenha(kv, env, nome, senha) {
  const usuario = normalizarUsuario(nome);
  const lista = await lerUsuarios(kv, env);
  if (!lista[usuario]) throw new Error("Usuário não encontrado.");
  if (String(senha || "").length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  lista[usuario] = { ...lista[usuario], hash: await gerarHash(String(senha)) };
  await gravar(kv, lista);
}

export async function definirAdmin(kv, env, nome, admin) {
  const usuario = normalizarUsuario(nome);
  const lista = await lerUsuarios(kv, env);
  if (!lista[usuario]) throw new Error("Usuário não encontrado.");
  if (!admin && Object.values(lista).filter(u => u.admin).length <= 1 && lista[usuario].admin) {
    throw new Error("Precisa existir pelo menos 1 administrador.");
  }
  lista[usuario] = { ...lista[usuario], admin: Boolean(admin) };
  await gravar(kv, lista);
}

export async function removerUsuario(kv, env, nome) {
  const usuario = normalizarUsuario(nome);
  const lista = await lerUsuarios(kv, env);
  if (!lista[usuario]) return;
  if (lista[usuario].admin && Object.values(lista).filter(u => u.admin).length <= 1) {
    throw new Error("Não dá para remover o último administrador.");
  }
  delete lista[usuario];
  await gravar(kv, lista);
}
