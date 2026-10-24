// Histórico de acessos da Central — visto só pelo administrador na tela de Administração.
// Cloudflare KV (binding CENTRAL_KV), 1 chave por usuário: "hist:u:<usuario>" =
// { total, ultimos: [ISO...] } (guarda os 100 mais recentes). Login = 1 acesso; aberturas
// a menos de 30 min da anterior contam como o mesmo acesso.
const JANELA_MS = 30 * 60 * 1000;
const GUARDA = 100;

export async function registrarAcesso(kv, usuario, { forcar = false } = {}) {
  try {
    const chave = `hist:u:${usuario}`;
    const h = (await kv.get(chave, { type: "json" })) || { total: 0, ultimos: [] };
    const ultimo = h.ultimos[0] ? Date.parse(h.ultimos[0]) : 0;
    if (!forcar && Date.now() - ultimo < JANELA_MS) return;
    h.total += 1;
    h.ultimos = [new Date().toISOString(), ...h.ultimos].slice(0, GUARDA);
    await kv.put(chave, JSON.stringify(h));
  } catch (erro) {
    console.error("historico:", erro && erro.message ? erro.message : erro); // nunca atrapalha o login
  }
}

export async function lerHistorico(kv, usuario) {
  try {
    return (await kv.get(`hist:u:${usuario}`, { type: "json" })) || { total: 0, ultimos: [] };
  } catch {
    return { total: 0, ultimos: [] };
  }
}
