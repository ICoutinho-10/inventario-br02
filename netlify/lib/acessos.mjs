// Histórico de acessos da Central — visto só pelo administrador na tela de Administração
// (botão "Histórico"). Netlify Blobs, store "central-historico", 1 chave por usuário:
// { total, ultimos: [ISO...] } (guarda os 100 mais recentes).
// Um "acesso" = login; aberturas a menos de 30 min da anterior contam como o mesmo acesso.
import { getStore } from "@netlify/blobs";

const loja = () => getStore({ name: "central-historico", consistency: "strong" });
const JANELA_MS = 30 * 60 * 1000;
const GUARDA = 100;

export async function registrarAcesso(usuario, { forcar = false } = {}) {
  try {
    const chave = `u:${usuario}`;
    const h = (await loja().get(chave, { type: "json" })) || { total: 0, ultimos: [] };
    const ultimo = h.ultimos[0] ? Date.parse(h.ultimos[0]) : 0;
    if (!forcar && Date.now() - ultimo < JANELA_MS) return;
    h.total += 1;
    h.ultimos = [new Date().toISOString(), ...h.ultimos].slice(0, GUARDA);
    await loja().setJSON(chave, h);
  } catch (erro) {
    console.error("historico:", erro?.message ?? erro); // nunca atrapalha o login
  }
}

export async function lerHistorico(usuario) {
  try {
    return (await loja().get(`u:${usuario}`, { type: "json" })) || { total: 0, ultimos: [] };
  } catch {
    return { total: 0, ultimos: [] };
  }
}
