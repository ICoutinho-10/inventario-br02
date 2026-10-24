// Usuários da Central, guardados no Netlify Blobs (store "central-usuarios") para serem
// geridos PELA TELA de Administração (sem terminal, sem redeploy). Só hash de senha.
// Formato: { "<usuario>": { hash, admin, criadoEm } }
// Compatível com CENTRAL_USERS (env, via scripts/usuarios.mjs): entram como usuários comuns.
import { getStore } from "@netlify/blobs";
import { gerarHash, normalizarUsuario } from "./sessao.mjs";

const loja = () => getStore({ name: "central-usuarios", consistency: "strong" });
const CHAVE = "lista";

function doEnv() {
  const bruto = String(process.env.CENTRAL_USERS || "").trim();
  if (!bruto) return {};
  let lista = {};
  try { lista = JSON.parse(bruto); } catch {
    try { lista = JSON.parse(Buffer.from(bruto, "base64").toString("utf8")); } catch { return {}; }
  }
  return Object.fromEntries(Object.entries(lista).map(([u, hash]) => [u, { hash, admin: false }]));
}

// Depois que a tela gravar pela 1ª vez, o Blobs é a ÚNICA fonte; antes, vale o CENTRAL_USERS.
export async function lerUsuarios() {
  try {
    const guardados = await loja().get(CHAVE, { type: "json" });
    if (guardados) return guardados;
  } catch { /* sem Blobs ainda */ }
  return doEnv();
}

const gravar = lista => loja().setJSON(CHAVE, lista);

// REGRA: o ADM cadastra os coordenadores na mão (eles passam o login). Senha inicial
// padrão 12345678; no 1º acesso a pessoa é OBRIGADA a criar a própria senha (trocarSenha).
// Quem entra com usuário do PC + senha padrão também é cadastrado sozinho (fallback).
export const SENHA_PADRAO = "12345678";
export const ADMINS_FIXOS = ["ivan.silva"]; // administrador fixo (Ivan)
export const USUARIO_DE_PC = /^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/; // nome.sobrenome (como no Windows)

export async function autoCadastrar(nome) {
  const usuario = normalizarUsuario(nome);
  const lista = await lerUsuarios();
  if (lista[usuario]) return lista[usuario];
  lista[usuario] = { hash: gerarHash(SENHA_PADRAO), admin: ADMINS_FIXOS.includes(usuario), trocarSenha: true,
                     origem: "primeiro-acesso", criadoEm: new Date().toISOString() };
  await gravar(lista);
  return lista[usuario];
}

export async function definirPropriaSenha(nome, senha) {
  if (String(senha || "").length < 8) throw new Error("A senha precisa ter no mínimo 8 dígitos.");
  if (String(senha) === SENHA_PADRAO) throw new Error("Escolha uma senha diferente da senha inicial.");
  const usuario = normalizarUsuario(nome);
  const lista = await lerUsuarios();
  if (!lista[usuario]) throw new Error("Usuário não encontrado.");
  lista[usuario] = { ...lista[usuario], hash: gerarHash(String(senha)), trocarSenha: false };
  await gravar(lista);
}

// ADM: volta a senha para a padrão (12345678) e obriga a pessoa a criar outra.
export async function resetarSenha(nome) {
  const usuario = normalizarUsuario(nome);
  const lista = await lerUsuarios();
  if (!lista[usuario]) throw new Error("Usuário não encontrado.");
  lista[usuario] = { ...lista[usuario], hash: gerarHash(SENHA_PADRAO), trocarSenha: true };
  await gravar(lista);
}

export async function criarUsuario(nome, senha, admin = false) {
  const usuario = normalizarUsuario(nome);
  if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) throw new Error("Usuário: 3 a 40 letras/números (pode usar . _ -).");
  if (String(senha || "").length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  const lista = await lerUsuarios();
  lista[usuario] = { hash: gerarHash(String(senha)), admin: Boolean(admin), criadoEm: new Date().toISOString() };
  await gravar(lista);
  return usuario;
}

export async function trocarSenha(nome, senha) {
  const usuario = normalizarUsuario(nome);
  const lista = await lerUsuarios();
  if (!lista[usuario]) throw new Error("Usuário não encontrado.");
  if (String(senha || "").length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  lista[usuario] = { ...lista[usuario], hash: gerarHash(String(senha)) };
  await gravar(lista);
}

export async function definirAdmin(nome, admin) {
  const usuario = normalizarUsuario(nome);
  const lista = await lerUsuarios();
  if (!lista[usuario]) throw new Error("Usuário não encontrado.");
  if (!admin && Object.values(lista).filter(u => u.admin).length <= 1 && lista[usuario].admin) {
    throw new Error("Precisa existir pelo menos 1 administrador.");
  }
  lista[usuario] = { ...lista[usuario], admin: Boolean(admin) };
  await gravar(lista);
}

export async function removerUsuario(nome) {
  const usuario = normalizarUsuario(nome);
  const lista = await lerUsuarios();
  if (!lista[usuario]) return;
  if (lista[usuario].admin && Object.values(lista).filter(u => u.admin).length <= 1) {
    throw new Error("Não dá para remover o último administrador.");
  }
  delete lista[usuario];
  await gravar(lista);
}
