// Cadastro inicial de usuários e criação dos segredos da Central. A SENHA é digitada por
// você no terminal (não aparece) e só o HASH dela é guardado — em usuarios.json (aqui) e
// na variável CENTRAL_USERS do Netlify. Ninguém, nem este script, guarda a senha em texto.
//
// O jeito normal de gerir usuários é a tela de Administração (/admin.html). Este script é
// para o bootstrap (1º administrador / segredos):
//
//   node scripts/usuarios.mjs segredo    → cria CENTRAL_SECRET no Netlify (1ª vez;
//                                           rodar de novo desloga todo mundo)
//   node scripts/usuarios.mjs setup       → cria um CENTRAL_SETUP (código de 1º acesso)
//   node scripts/usuarios.mjs adicionar <usuario>   → pede a senha 2x e grava (bootstrap)
//   node scripts/usuarios.mjs remover <usuario>
//   node scripts/usuarios.mjs listar
//   node scripts/usuarios.mjs publicar    → envia a lista (CENTRAL_USERS) para o Netlify
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { gerarHash, normalizarUsuario } from "../netlify/lib/sessao.mjs";

const ARQUIVO = fileURLToPath(new URL("../usuarios.json", import.meta.url));
const ler = async () => { try { return JSON.parse(await readFile(ARQUIVO, "utf8")); } catch { return {}; } };
const gravar = lista => writeFile(ARQUIVO, JSON.stringify(lista, null, 2), "utf8");

function perguntarSenha(texto) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (s.includes(texto)) process.stdout.write(s); else process.stdout.write("*"); };
    rl.question(texto, resposta => { rl.close(); process.stdout.write("\n"); resolve(resposta); });
  });
}

function netlify(args, silencioso = false) {
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["--yes", "netlify-cli", ...args],
    { stdio: silencioso ? ["ignore", "ignore", "inherit"] : "inherit", shell: process.platform === "win32" });
}

const [comando, nome] = process.argv.slice(2);
const lista = await ler();

if (comando === "adicionar") {
  const usuario = normalizarUsuario(nome);
  if (!usuario) throw new Error("Use: node scripts/usuarios.mjs adicionar <usuario>");
  const s1 = await perguntarSenha(`Senha para "${usuario}": `);
  const s2 = await perguntarSenha("Repita a senha: ");
  if (s1 !== s2) { console.error("As senhas não conferem. Nada foi gravado."); process.exit(1); }
  if (s1.length < 8) { console.error("Use pelo menos 8 caracteres. Nada foi gravado."); process.exit(1); }
  lista[usuario] = gerarHash(s1);
  await gravar(lista);
  console.log(`Usuário "${usuario}" gravado. Rode "publicar" para valer no site.`);
} else if (comando === "remover") {
  delete lista[normalizarUsuario(nome)];
  await gravar(lista);
  console.log(`Removido. Rode "publicar" para valer no site.`);
} else if (comando === "listar") {
  console.log(Object.keys(lista).sort().join("\n") || "(nenhum usuário)");
} else if (comando === "publicar") {
  netlify(["env:set", "CENTRAL_USERS", Buffer.from(JSON.stringify(lista), "utf8").toString("base64")], true);
  console.log(`${Object.keys(lista).length} usuário(s) enviados. Vale no próximo deploy.`);
} else if (comando === "segredo") {
  netlify(["env:set", "CENTRAL_SECRET", randomBytes(32).toString("base64url")], true);
  console.log("CENTRAL_SECRET criado no Netlify (não fica salvo neste computador).");
} else if (comando === "setup") {
  const codigo = randomBytes(6).toString("hex"); // 12 caracteres
  netlify(["env:set", "CENTRAL_SETUP", codigo], true);
  console.log("CENTRAL_SETUP criado no Netlify. Use este código no 1º acesso (ele some depois):");
  console.log("\n   " + codigo + "\n");
} else {
  console.log("Comandos: segredo | setup | adicionar <usuario> | remover <usuario> | listar | publicar");
}
