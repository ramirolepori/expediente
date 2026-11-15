import { CasoSchema, type Caso, type Condicion } from "@/casos/schema";
import { evaluar, pruebaVisible } from "./condiciones";
import { extension, leerImagen } from "./validador-archivos";
import { MAX_CASO_BYTES, revisarTextos, rutaSegura } from "./validador-seguridad";

/**
 * Validador de casos en seis capas (ADR 0012): forma, referencias, que se pueda resolver, spoilers y diseño,
 * archivos y seguridad. Cada hallazgo es un error (bloquea probar y publicar), un aviso (lo decide el moderador)
 * o una sugerencia. Lo de seguridad siempre es error.
 */
export type Nivel = "error" | "aviso" | "sugerencia";
export type Capa = "forma" | "referencias" | "resolucion" | "diseno" | "archivos" | "seguridad";

export const NOMBRE_CAPA: Record<Capa, string> = {
  forma: "Forma",
  referencias: "Referencias",
  resolucion: "Se puede resolver",
  diseno: "Spoilers y diseño",
  archivos: "Archivos",
  seguridad: "Seguridad",
};

export interface Hallazgo {
  capa: Capa;
  nivel: Nivel;
  /** dónde está el problema, con los ids del caso (ej. "sobre s2_fiesta › requisito") */
  donde: string;
  mensaje: string;
}

/** Un archivo del paquete: su peso y sus primeros bytes (alcanzan para saber formato y tamaño). */
export interface ArchivoPaquete {
  peso: number;
  cabecera: Uint8Array;
}

export interface OpcionesValidacion {
  /** archivos del paquete por ruta relativa a la carpeta del caso (ej. "escenas/nave.jpg") */
  archivos?: Record<string, ArchivoPaquete>;
  /** alternativa sin paquete: solo dice si el archivo existe en public/ */
  existe?: (ruta: string) => boolean;
  /** "autor": caso subido por un tercero, con reglas más estrictas. "repo": los casos del repositorio. */
  origen?: "autor" | "repo";
}

export interface Informe {
  ok: boolean;
  hallazgos: Hallazgo[];
  caso?: Caso;
}

const PESO_AVISO = 1024 * 1024;
const PESO_MAXIMO = 3 * 1024 * 1024;
const PAQUETE_MAXIMO = 25 * 1024 * 1024;
const FORMATOS_IMAGEN = ["jpg", "png", "webp"];

function referencias(c: Condicion, out: { tipo: string; id: string }[] = []) {
  if (c.tipo === "todas" || c.tipo === "alguna") c.condiciones.forEach((x) => referencias(x, out));
  else if (c.tipo !== "siempre") out.push({ tipo: c.tipo, id: (c as Record<string, string>)[c.tipo] });
  return out;
}

export function revisarCaso(datos: unknown, opciones: OpcionesValidacion = {}): Informe {
  const hallazgos: Hallazgo[] = [];
  const add = (capa: Capa, nivel: Nivel, donde: string, mensaje: string) => hallazgos.push({ capa, nivel: capa === "seguridad" ? "error" : nivel, donde, mensaje });
  const autor = opciones.origen === "autor";

  // seguridad sobre el JSON crudo: corre aunque la forma esté mal, así nada se escapa
  const bytes = new TextEncoder().encode(JSON.stringify(datos ?? null)).length;
  if (bytes > MAX_CASO_BYTES) add("seguridad", "error", "caso.json", `pesa ${Math.round(bytes / 1024)} KB; el máximo es ${MAX_CASO_BYTES / 1024} KB`);
  revisarTextos(datos).forEach((p) => add("seguridad", "error", p.donde, p.mensaje));

  // 1. forma
  const parsed = CasoSchema.safeParse(datos);
  if (!parsed.success) {
    for (const i of parsed.error.issues) {
      const donde = i.path.join(".") || "caso";
      add("forma", "error", donde, i.path[0] === "version" ? 'el campo "version" tiene que ser 1 (la versión del contrato)' : i.message);
    }
    return cerrar(hallazgos);
  }
  const caso = parsed.data;
  sobrantes(datos, caso, "", (donde, clave) => add("forma", "aviso", donde || "caso", `el campo "${clave}" no es parte del contrato y se ignora. Sacalo o revisá si quisiste usar otro`));

  // 2. referencias
  const antes = hallazgos.length;
  revisarReferencias(caso, (nivel, donde, mensaje) => add("referencias", nivel, donde, mensaje));
  const referenciasRotas = hallazgos.slice(antes).some((h) => h.nivel === "error");

  revisarEstilo(caso, (nivel, donde, mensaje) => add("diseno", nivel, donde, mensaje));

  // 5 y 6. archivos y seguridad del caso ya interpretado
  revisarArchivos(caso, opciones, add);
  if (autor) {
    caso.minijuegos.forEach((m) => {
      if (m.tipo === "personalizado") add("seguridad", "error", `minijuego ${m.id}`, "los casos de autores no pueden traer páginas propias. Usá un minijuego del catálogo: rompecabezas, linea_tiempo o cifrado");
    });
  } else {
    caso.minijuegos.forEach((m) => {
      if (m.tipo === "personalizado" && !m.config.pagina.startsWith("/casos/")) add("archivos", "aviso", `minijuego ${m.id}`, "la página debería vivir en public/casos/<caso>/");
    });
  }

  // 3 y 4. sin referencias sanas no tiene sentido simular
  if (!referenciasRotas) {
    revisarResolucion(caso, (nivel, donde, mensaje) => add("resolucion", nivel, donde, mensaje));
    revisarDiseno(caso, (nivel, donde, mensaje) => add("diseno", nivel, donde, mensaje));
  }
  return cerrar(hallazgos, caso);
}

const ORDEN_NIVEL: Record<Nivel, number> = { error: 0, aviso: 1, sugerencia: 2 };
const ORDEN_CAPA = Object.keys(NOMBRE_CAPA) as Capa[];

function cerrar(hallazgos: Hallazgo[], caso?: Caso): Informe {
  hallazgos.sort((a, b) => ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel] || ORDEN_CAPA.indexOf(a.capa) - ORDEN_CAPA.indexOf(b.capa));
  return { ok: !hallazgos.some((h) => h.nivel === "error"), hallazgos, caso };
}

/** Claves que vinieron en el JSON y el schema descartó: suelen ser campos inventados por la IA. */
function sobrantes(crudo: unknown, limpio: unknown, donde: string, avisar: (donde: string, clave: string) => void) {
  if (Array.isArray(crudo) && Array.isArray(limpio)) {
    crudo.forEach((v, i) => sobrantes(v, limpio[i], `${donde}[${i}]`, avisar));
  } else if (crudo && limpio && typeof crudo === "object" && typeof limpio === "object") {
    for (const [k, v] of Object.entries(crudo)) {
      if (!(k in limpio)) avisar(donde, k);
      else sobrantes(v, (limpio as Record<string, unknown>)[k], donde ? `${donde}.${k}` : k, avisar);
    }
  }
}

type Reportar = (nivel: Nivel, donde: string, mensaje: string) => void;

function revisarReferencias(caso: Caso, r: Reportar) {
  const ids = {
    sobre: new Set(caso.sobres.map((x) => x.id)),
    prueba: new Set(caso.pruebas.map((x) => x.id)),
    hecho: new Set(caso.hechos.map((x) => x.id)),
    candado: new Set(caso.candados.map((x) => x.id)),
    personaje: new Set(caso.personajes.map((x) => x.id)),
    minijuego: new Set(caso.minijuegos.map((x) => x.id)),
  };

  for (const [nombre, lista] of Object.entries({
    sobres: caso.sobres,
    pruebas: caso.pruebas,
    hechos: caso.hechos,
    candados: caso.candados,
    personajes: caso.personajes,
    ayudas: caso.ayudas,
    minijuegos: caso.minijuegos,
    preguntas: caso.resolucion.preguntas,
  })) {
    const vistos = new Set<string>();
    for (const x of lista as { id: string }[]) {
      if (vistos.has(x.id)) r("error", nombre, `id duplicado "${x.id}"`);
      vistos.add(x.id);
    }
  }

  const chequear = (c: Condicion, donde: string) => {
    for (const ref of referencias(c)) {
      if (!ids[ref.tipo as keyof typeof ids]?.has(ref.id)) r("error", donde, `referencia a ${ref.tipo} inexistente "${ref.id}"`);
    }
  };
  caso.sobres.forEach((s) => chequear(s.requisito, `sobre ${s.id} › requisito`));
  caso.sobres.forEach((s) =>
    s.escena?.puntos.forEach((pt) => {
      const prueba = caso.pruebas.find((p) => p.id === pt.prueba);
      const donde = `sobre ${s.id} › escena`;
      if (!prueba) r("error", donde, `prueba inexistente "${pt.prueba}"`);
      else if (prueba.sobre !== s.id) r("error", donde, `la prueba "${pt.prueba}" es del sobre ${prueba.sobre}`);
      if (s.escena!.puntos.filter((o) => o.prueba === pt.prueba).length > 1) r("aviso", donde, `la prueba "${pt.prueba}" tiene más de un punto`);
    }),
  );
  caso.candados.forEach((c) => chequear(c.disponible, `candado ${c.id} › disponible`));
  caso.ayudas.forEach((a) => chequear(a.disponible, `ayuda ${a.id} › disponible`));
  caso.minijuegos.forEach((m) => {
    if (!ids.sobre.has(m.sobre)) r("error", `minijuego ${m.id}`, `sobre inexistente "${m.sobre}"`);
    chequear(m.disponible, `minijuego ${m.id} › disponible`);
  });
  caso.pruebas.forEach((p) => {
    if (!ids.sobre.has(p.sobre)) r("error", `prueba ${p.id}`, `sobre inexistente "${p.sobre}"`);
    if (p.desbloqueo) chequear(p.desbloqueo, `prueba ${p.id} › desbloqueo`);
    if (p.tipo === "celular" && !p.celular) r("error", `prueba ${p.id}`, "es de tipo celular pero no trae los datos del celular");
  });

  const hechoContado = new Set<string>();
  caso.personajes.forEach((p) => {
    chequear(p.disponible, `personaje ${p.id} › disponible`);
    p.sabe.forEach((h) => {
      if (!ids.hecho.has(h)) r("error", `personaje ${p.id} › sabe`, `hecho inexistente "${h}"`);
      hechoContado.add(h);
    });
    p.secretos.forEach((s) => {
      if (!ids.hecho.has(s.hecho)) r("error", `personaje ${p.id} › secreto ${s.id}`, `hecho inexistente "${s.hecho}"`);
      chequear(s.cuando, `personaje ${p.id} › secreto ${s.id} › cuando`);
      hechoContado.add(s.hecho);
    });
    p.mentiras.forEach((m, i) => chequear(m.cae, `personaje ${p.id} › mentiras[${i}] › cae`));
  });

  caso.personajes
    .filter((p) => p.apariencia?.retratos)
    .forEach((p) => {
      if (!p.apariencia!.retratos!.neutral) r("error", `personaje ${p.id}`, 'los retratos necesitan al menos "neutral"');
    });

  caso.verdad.culpables.forEach((c) => {
    if (!ids.personaje.has(c.personaje)) r("error", "verdad › culpables", `culpable inexistente "${c.personaje}"`);
  });
  caso.resolucion.preguntas.forEach((q) => {
    const donde = `pregunta ${q.id}`;
    if (q.tipo === "personaje" && !ids.personaje.has(q.respuesta) && !(q.permiteNadie && q.respuesta === "nadie")) r("error", donde, "la respuesta no es un personaje");
    if (q.tipo === "opcion" && !q.opciones?.some((o) => o.id === q.respuesta)) r("error", donde, "la respuesta no está entre las opciones");
    if (q.tipo === "opcion" && (q.opciones?.length ?? 0) < 2) r("error", donde, "una pregunta de opción necesita al menos dos opciones");
  });
  if (caso.sobres[0]?.requisito.tipo !== "siempre") r("error", `sobre ${caso.sobres[0]?.id} › requisito`, "el primer sobre tiene que tener requisito 'siempre'");
  if (caso.modos.includes("traidor") && !caso.traidor) r("error", "modos", "el caso ofrece el modo traidor pero no define la ficha 'traidor'");
  if (caso.traidor) {
    const t = caso.traidor;
    t.sabe.forEach((h) => !ids.hecho.has(h) && r("error", "traidor › sabe", `hecho inexistente "${h}"`));
    const q = caso.resolucion.preguntas.find((p) => p.id === t.objetivo.pregunta);
    if (!q) r("error", "traidor › objetivo", `la pregunta "${t.objetivo.pregunta}" no existe`);
    else if (q.respuesta === t.objetivo.respuesta) r("error", "traidor › objetivo", "su objetivo no puede ser la respuesta correcta");
    else if (q.tipo === "personaje" ? !ids.personaje.has(t.objetivo.respuesta) : !q.opciones?.some((o) => o.id === t.objetivo.respuesta)) {
      r("error", "traidor › objetivo", "la respuesta objetivo no es una opción válida de esa pregunta");
    }
  }

  // un hecho que traba algo tiene que poder contarlo alguien
  const usados = new Set<string>();
  condicionesDelCaso(caso).forEach((c) => referencias(c).forEach((ref) => ref.tipo === "hecho" && usados.add(ref.id)));
  usados.forEach((h) => {
    if (ids.hecho.has(h) && !hechoContado.has(h)) r("error", `hecho ${h}`, "se usa en una condición pero ningún personaje lo cuenta");
  });
}

function condicionesDelCaso(caso: Caso): Condicion[] {
  return [
    ...caso.sobres.map((s) => s.requisito),
    ...caso.pruebas.flatMap((p) => (p.desbloqueo ? [p.desbloqueo] : [])),
    ...caso.candados.map((c) => c.disponible),
    ...caso.minijuegos.map((m) => m.disponible),
    ...caso.personajes.flatMap((p) => [p.disponible, ...p.secretos.map((s) => s.cuando), ...p.mentiras.map((m) => m.cae)]),
  ];
}

interface EstadoSimulado {
  sobresAbiertos: string[];
  hechosRevelados: string[];
  candadosAbiertos: string[];
  minijuegosResueltos: Record<string, string>;
}

/** Jugadores perfectos que abren todo lo que pueden. Los sobres bloqueados no se abren nunca. */
function simular(caso: Caso, bloqueados: Set<string> = new Set()): EstadoSimulado {
  const estado: EstadoSimulado = { sobresAbiertos: [], hechosRevelados: [], candadosAbiertos: [], minijuegosResueltos: {} };
  let cambios = true;
  while (cambios) {
    cambios = false;
    for (const s of caso.sobres) {
      if (!bloqueados.has(s.id) && !estado.sobresAbiertos.includes(s.id) && evaluar(s.requisito, estado, caso)) {
        estado.sobresAbiertos.push(s.id);
        cambios = true;
      }
    }
    for (const c of caso.candados) {
      if (!estado.candadosAbiertos.includes(c.id) && evaluar(c.disponible, estado, caso)) {
        estado.candadosAbiertos.push(c.id);
        cambios = true;
      }
    }
    for (const m of caso.minijuegos) {
      if (!estado.minijuegosResueltos[m.id] && estado.sobresAbiertos.includes(m.sobre) && evaluar(m.disponible, estado, caso)) {
        estado.minijuegosResueltos[m.id] = "simulado";
        cambios = true;
      }
    }
    for (const p of caso.personajes) {
      if (!evaluar(p.disponible, estado, caso)) continue;
      for (const h of p.sabe) {
        if (!estado.hechosRevelados.includes(h)) {
          estado.hechosRevelados.push(h);
          cambios = true;
        }
      }
      for (const s of p.secretos) {
        if (!estado.hechosRevelados.includes(s.hecho) && evaluar(s.cuando, estado, caso)) {
          estado.hechosRevelados.push(s.hecho);
          cambios = true;
        }
      }
    }
  }
  return estado;
}

const plano = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function revisarResolucion(caso: Caso, r: Reportar) {
  const estado = simular(caso);
  caso.sobres.forEach((s) => !estado.sobresAbiertos.includes(s.id) && r("error", `sobre ${s.id}`, "no se puede abrir nunca: su requisito no se cumple jugando"));
  caso.pruebas.forEach((p) => !pruebaVisible(p.id, estado, caso) && r("error", `prueba ${p.id}`, "no se puede ver nunca: su sobre o su desbloqueo no se alcanzan"));
  caso.candados.forEach((c) => !estado.candadosAbiertos.includes(c.id) && r("error", `candado ${c.id}`, "nunca queda disponible"));
  caso.minijuegos.forEach((m) => !estado.minijuegosResueltos[m.id] && r("error", `minijuego ${m.id}`, "nunca queda disponible"));
  caso.personajes.forEach((p) => {
    if (!evaluar(p.disponible, estado, caso)) r("error", `personaje ${p.id}`, "nunca queda disponible para interrogar");
    p.secretos.forEach((s) => !estado.hechosRevelados.includes(s.hecho) && r("error", `personaje ${p.id} › secreto ${s.id}`, "nunca se puede soltar: su condición no se cumple jugando"));
  });

  // cada culpable tiene que aparecer en algo que el grupo pueda leer
  const visible = plano(
    [
      ...caso.pruebas.map((p) => p.contenido + " " + p.titulo + " " + JSON.stringify(p.celular ?? "")),
      ...caso.hechos.filter((h) => estado.hechosRevelados.includes(h.id)).map((h) => h.texto),
    ].join(" "),
  );
  caso.verdad.culpables.forEach((c) => {
    const p = caso.personajes.find((x) => x.id === c.personaje);
    if (!p) return;
    const nombres = [p.nombre, ...p.nombre.split(/\s+/).filter((n) => n.length >= 4)].map(plano);
    if (!nombres.some((n) => visible.includes(n))) {
      r("aviso", `verdad › culpable ${p.id}`, `ninguna prueba ni hecho que se pueda descubrir nombra a ${p.nombre}: el grupo no tiene con qué señalarlo`);
    }
  });
}

function revisarDiseno(caso: Caso, r: Reportar) {
  // la opción correcta no puede delatarse por ser la más larga
  caso.resolucion.preguntas.forEach((q) => {
    if (q.tipo !== "opcion" || !q.opciones || q.opciones.length < 3) return;
    const correcta = q.opciones.find((o) => o.id === q.respuesta);
    const resto = q.opciones.filter((o) => o.id !== q.respuesta).map((o) => o.texto.length);
    if (correcta && correcta.texto.length > Math.max(...resto) * 1.25) {
      r("aviso", `pregunta ${q.id}`, "la opción correcta es bastante más larga que las demás y se delata. Emparejá el largo de las opciones");
    }
  });

  // un capítulo que se abre sin pasar por el anterior se puede saltear
  caso.sobres.forEach((s, i) => {
    if (i === 0) return;
    const anterior = caso.sobres[i - 1]!;
    if (simular(caso, new Set([anterior.id])).sobresAbiertos.includes(s.id)) {
      r("aviso", `sobre ${s.id} › requisito`, `se puede abrir sin haber abierto ${anterior.id}: el capítulo anterior se puede saltear. Pedí algo que se descubra en él`);
    }
  });

  // un secreto atado a "siempre" lo puede contar en la primera pregunta
  caso.personajes.forEach((p) =>
    p.secretos.forEach((s) => {
      if (s.cuando.tipo === "siempre") r("aviso", `personaje ${p.id} › secreto ${s.id}`, "se puede soltar desde el principio. Si es un secreto, atalo a una prueba o un hecho");
    }),
  );

  caso.sobres.forEach((s) => {
    const n = caso.pruebas.filter((p) => p.sobre === s.id).length;
    const extras = caso.minijuegos.some((m) => m.sobre === s.id) || !!s.escena;
    if (n === 0 && !extras) r("aviso", `sobre ${s.id}`, "no tiene pruebas ni minijuegos: al abrirlo no hay nada");
    if (n > 8) r("sugerencia", `sobre ${s.id}`, `tiene ${n} pruebas. Entre 3 y 7 por capítulo se lee mejor`);
  });

  if (caso.ayudas.length === 0) r("sugerencia", "ayudas", "el caso no tiene ayudas. Una o dos por capítulo evitan que el grupo se trabe");
  const enAlgunaFicha = new Set(caso.personajes.flatMap((p) => [...p.sabe, ...p.secretos.map((s) => s.hecho)]));
  caso.hechos.forEach((h) => !enAlgunaFicha.has(h.id) && r("sugerencia", `hecho ${h.id}`, "no lo conoce ningún personaje, así que nunca se descubre"));

}

/** El estilo de los personajes no depende de la simulación: se revisa siempre. */
function revisarEstilo(caso: Caso, r: Reportar) {
  const interrogables = caso.personajes.filter((p) => p.interrogable);
  const conRetratos = interrogables.filter((p) => p.apariencia?.retratos).length;
  if (conRetratos && conRetratos < interrogables.length) r("aviso", "personajes", "algunos personajes tienen retratos y otros se dibujan en vectorial: conviene un solo estilo por caso");
  caso.personajes.forEach((p) => {
    if (p.apariencia?.retratos && p.apariencia.rasgos) r("sugerencia", `personaje ${p.id}`, "tiene retratos y rasgos; se usan los retratos");
  });
}

type Agregar = (capa: Capa, nivel: Nivel, donde: string, mensaje: string) => void;

function revisarArchivos(caso: Caso, opciones: OpcionesValidacion, add: Agregar) {
  const autor = opciones.origen === "autor";
  const prefijo = `/casos/${caso.meta.id}/`;
  const usados = new Set<string>();
  const refs: { ruta: string; donde: string; uso: "escena" | "prueba" | "retrato" | "pagina"; proporcion?: number }[] = [
    ...caso.sobres.flatMap((s) => (s.escena ? [{ ruta: s.escena.imagen, donde: `sobre ${s.id} › escena`, uso: "escena" as const, proporcion: s.escena.proporcion }] : [])),
    ...caso.pruebas.flatMap((p) => (p.imagen ? [{ ruta: p.imagen, donde: `prueba ${p.id} › imagen`, uso: "prueba" as const }] : [])),
    ...caso.pruebas.flatMap((p) => imagenesMarkdown(p.contenido).map((ruta) => ({ ruta, donde: `prueba ${p.id} › contenido`, uso: "prueba" as const }))),
    ...imagenesMarkdown(caso.introduccion).map((ruta) => ({ ruta, donde: "introduccion", uso: "prueba" as const })),
    ...caso.personajes.flatMap((p) => Object.entries(p.apariencia?.retratos ?? {}).map(([emocion, ruta]) => ({ ruta: ruta!, donde: `personaje ${p.id} › retrato ${emocion}`, uso: "retrato" as const }))),
    ...(autor ? [] : caso.minijuegos.flatMap((m) => (m.tipo === "personalizado" ? [{ ruta: m.config.pagina, donde: `minijuego ${m.id}`, uso: "pagina" as const }] : []))),
  ];
  const tamanosRetrato = new Map<string, string>();

  for (const ref of refs) {
    if (!rutaSegura(ref.ruta, caso.meta.id)) {
      if (autor) add("seguridad", "error", ref.donde, `la ruta "${ref.ruta}" tiene que empezar con ${prefijo} y no puede subir de carpeta ni tener espacios o caracteres raros`);
      else if (ref.uso === "retrato") add("archivos", "aviso", ref.donde, `el retrato ${ref.ruta} debería vivir en public${prefijo}`);
      if (autor) continue;
    }
    if (ref.uso !== "pagina" && !FORMATOS_IMAGEN.includes(extension(ref.ruta))) {
      add("archivos", "error", ref.donde, `"${ref.ruta}" tiene que ser .jpg, .png o .webp`);
      continue;
    }

    if (opciones.archivos) {
      // en el repo la carpeta puede no llamarse igual que el id (hotel-aurora y hotel_aurora)
      const relativa = ref.ruta.replace(/^\/casos\/[^/]+\//, "").replace(/^\//, "");
      usados.add(relativa);
      const archivo = opciones.archivos[relativa];
      if (!archivo) {
        add("archivos", "error", ref.donde, `falta el archivo "${relativa}" en la carpeta del caso`);
        continue;
      }
      if (ref.uso === "pagina") continue;
      const info = leerImagen(archivo.cabecera);
      if (!info.formato) {
        add("seguridad", "error", ref.donde, `"${relativa}" no es una imagen jpg, png ni webp válida`);
        continue;
      }
      if (info.formato !== extension(ref.ruta)) add("seguridad", "error", ref.donde, `"${relativa}" dice ser .${extension(ref.ruta)} pero adentro es ${info.formato}. Guardala con la extensión correcta`);
      if (archivo.peso > PESO_MAXIMO) add("archivos", "error", ref.donde, `"${relativa}" pesa ${mb(archivo.peso)}; el máximo es ${mb(PESO_MAXIMO)}. Comprimila o achicala`);
      else if (archivo.peso > PESO_AVISO) add("archivos", "aviso", ref.donde, `"${relativa}" pesa ${mb(archivo.peso)}: va a tardar en cargar en los celulares. Lo ideal es menos de 500 KB`);
      if (!info.ancho || !info.alto) {
        add("archivos", "sugerencia", ref.donde, `no pude leer el tamaño de "${relativa}"; revisá que no tenga metadatos enormes`);
        continue;
      }
      if (Math.max(info.ancho, info.alto) > 4096) add("archivos", "aviso", ref.donde, `"${relativa}" mide ${info.ancho}×${info.alto}. Con 2000 px de lado alcanza`);
      if (ref.uso === "escena") {
        if (info.ancho < 1000) add("archivos", "aviso", ref.donde, `"${relativa}" mide ${info.ancho} px de ancho: se va a ver borrosa en la tele. Lo ideal es 1600`);
        const real = info.ancho / info.alto;
        if (ref.proporcion && Math.abs(real - ref.proporcion) / real > 0.02) {
          add("archivos", "error", ref.donde, `la imagen es ${info.ancho}×${info.alto} (proporción ${real.toFixed(2)}) pero la escena dice ${ref.proporcion.toFixed(2)}: los puntos quedarían corridos. Poné "proporcion": ${real.toFixed(2)}`);
        }
      }
      if (ref.uso === "retrato") {
        const personaje = ref.donde.split(" › ")[0]!;
        const tam = `${info.ancho}×${info.alto}`;
        const otro = tamanosRetrato.get(personaje);
        if (otro && otro !== tam) add("archivos", "aviso", ref.donde, `mide ${tam} y otros retratos del mismo personaje miden ${otro}: al cambiar de emoción va a saltar`);
        tamanosRetrato.set(personaje, otro ?? tam);
      }
    } else if (opciones.existe && !opciones.existe(ref.ruta)) {
      add("archivos", "error", ref.donde.split(" › ")[0]!, `no existe el ${ref.uso === "retrato" ? "retrato" : "archivo"} public${ref.ruta}`);
    }
  }

  if (opciones.archivos) {
    const total = Object.values(opciones.archivos).reduce((s, a) => s + a.peso, 0);
    if (total > PAQUETE_MAXIMO) add("archivos", "error", "carpeta del caso", `entre todos los archivos pesan ${mb(total)}; el máximo es ${mb(PAQUETE_MAXIMO)}`);
    Object.keys(opciones.archivos)
      .filter((f) => !usados.has(f) && FORMATOS_IMAGEN.includes(extension(f)))
      .forEach((f) => add("archivos", "sugerencia", f, "esta imagen no la usa el caso. Sacala de la carpeta o referenciala"));
  }
}

/** Imágenes metidas en el markdown: ![texto](/casos/x/foto.jpg) */
const imagenesMarkdown = (md: string) => [...md.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)].map((m) => m[1]!);

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Formato de antes (lista de errores y avisos en texto), para el script y los tests del motor. */
export function validarCaso(datos: unknown, existe?: (ruta: string) => boolean) {
  const r = revisarCaso(datos, { existe, origen: "repo" });
  const texto = (h: Hallazgo) => `${h.donde}: ${h.mensaje}`;
  return {
    ok: r.ok,
    errores: r.hallazgos.filter((h) => h.nivel === "error").map(texto),
    avisos: r.hallazgos.filter((h) => h.nivel !== "error").map(texto),
    caso: r.caso,
  };
}
