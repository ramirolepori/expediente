/**
 * Prueba rápida contra un despliegue: `npm run humo -- https://expediente-lemon.vercel.app`
 * Verifica que la app responde y que las salas se guardan (Supabase), sin navegador.
 * Con `--con-modelo` además hace una pregunta real al modelo (gasta una llamada).
 */
const base = (process.argv.find((a) => a.startsWith("http")) ?? "https://expediente-lemon.vercel.app").replace(/\/$/, "");
const conModelo = process.argv.includes("--con-modelo");

let fallas = 0;
async function paso(nombre: string, fn: () => Promise<unknown>) {
  const t = Date.now();
  try {
    await fn();
    console.log(`✅ ${nombre} (${Date.now() - t} ms)`);
  } catch (e) {
    fallas++;
    console.log(`❌ ${nombre}: ${e instanceof Error ? e.message : e}`);
  }
}

async function api<T = Record<string, unknown>>(ruta: string, cuerpo?: unknown): Promise<T> {
  const r = await fetch(base + ruta, cuerpo ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) } : undefined);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(d)}`);
  return d as T;
}

async function main() {
  console.log(`Probando ${base}\n`);
  let codigo = "";
  let a = "";
  let b = "";
  await paso("lista de casos", async () => {
    const casos = await api<{ id: string }[]>("/api/casos");
    if (!casos.some((c) => c.id === "hotel_aurora")) throw new Error("falta hotel_aurora");
  });
  await paso("crear sala", async () => ({ codigo } = await api<{ codigo: string }>("/api/salas", { casoId: "hotel_aurora" })));
  await paso("unir dos jugadores", async () => {
    a = (await api<{ token: string }>(`/api/salas/${codigo}/unirse`, { apodo: "Humo A", tipo: "jugador" })).token;
    b = (await api<{ token: string }>(`/api/salas/${codigo}/unirse`, { apodo: "Humo B", tipo: "jugador" })).token;
  });
  await paso("iniciar y abrir sobre", async () => {
    await api(`/api/salas/${codigo}/accion`, { token: a, accion: { tipo: "iniciar" } });
    await api(`/api/salas/${codigo}/accion`, { token: b, accion: { tipo: "abrirSobre", sobre: "s2_registros" } });
  });
  await paso("la vista refleja el estado guardado", async () => {
    const v = await api<{ fase: string; sobres: { id: string; abierto: boolean }[] }>(`/api/salas/${codigo}/vista?token=${a}`);
    if (v.fase !== "jugando") throw new Error(`fase ${v.fase}`);
    if (!v.sobres.find((s) => s.id === "s2_registros")?.abierto) throw new Error("el sobre 2 no quedó abierto");
  });
  if (conModelo) {
    await paso("pregunta al modelo", async () => {
      await api(`/api/salas/${codigo}/interrogar`, { token: a, personaje: "esteban", texto: "¿Qué viste esa noche?" });
    });
  }
  await paso("salir", async () => {
    await api(`/api/salas/${codigo}/accion`, { token: a, accion: { tipo: "salir" } });
    await api(`/api/salas/${codigo}/accion`, { token: b, accion: { tipo: "salir" } });
  });
  console.log(fallas ? `\n${fallas} paso(s) fallaron` : "\nTodo bien");
  process.exit(fallas ? 1 : 0);
}

main();
