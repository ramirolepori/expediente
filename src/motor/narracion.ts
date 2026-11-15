import type { Prueba } from "@/casos/schema";

/**
 * El narrador (lectura en voz alta de documentos): convierte el markdown de una prueba, la introducción
 * o la resolución en un guion de líneas, cada una con su voz. Por defecto lee el narrador; una línea
 * marcada por el autor con `**Nombre:**` la dice ese personaje. El celular alterna dos voces en los chats.
 */
export type QuienLee = "narrador" | "otra" | { personaje: string };

export interface Linea {
  voz: QuienLee;
  texto: string;
}

export interface PersonajeConVoz {
  id: string;
  nombre: string;
}

const plano = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const ABREVIATURAS: [RegExp, string][] = [
  [/\bDra\./g, "doctora"],
  [/\bDr\./g, "doctor"],
  [/\bSrta\./g, "señorita"],
  [/\bSra\./g, "señora"],
  [/\bSr\./g, "señor"],
  [/\bLic\./g, "licenciado"],
  [/\bIng\./g, "ingeniero"],
  [/\bAv\./g, "avenida"],
  [/\bDepto\./g, "departamento"],
  [/\bTel\./gi, "teléfono"],
  [/\baprox\./gi, "aproximadamente"],
  [/\bp\. ?ej\./gi, "por ejemplo"],
  [/\betc\./gi, "etcétera"],
  [/\b[Nn](?:°|º|ro\.)\s?/g, "número "],
  [/(\d)\s?%/g, "$1 por ciento"],
  [/(\d)\s?hs?\.?\b/g, "$1 horas"],
  [/(\d)\s?km\b/g, "$1 kilómetros"],
  [/(\d)\s?kg\b/g, "$1 kilos"],
];

/** El texto de una línea preparado para el oído: abreviaturas, horas, fechas y números. */
export function textoParaLeer(texto: string): string {
  let t = texto;
  for (const [patron, reemplazo] of ABREVIATURAS) t = t.replace(patron, reemplazo);
  t = t
    // 21:40 → "21 40", 21:05 → "21 y 5", 21:00 → "21 en punto"
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h: string, m: string) => (m === "00" ? `${Number(h)} en punto` : m.startsWith("0") ? `${Number(h)} y ${Number(m)}` : `${Number(h)} ${m}`))
    // 15/04/2025 → "15 del 4 de 2025"
    .replace(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g, (_, d: string, m: string, a?: string) => `${Number(d)} del ${Number(m)}${a ? ` de ${a}` : ""}`)
    // separador de miles: si no, "1.500" se parte como fin de oración
    .replace(/(\d)\.(?=\d{3}\b)/g, "$1")
    .replace(/\s[—–]\s|[—–]/g, ", ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t && !/[.!?…:;,]$/.test(t) ? `${t}.` : t;
}

/** Saca las marcas de markdown que quedan en una línea (negrita, cursiva, código, links). */
function sinMarcas(linea: string) {
  return linea
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt: string) => (alt ? `${alt}.` : ""))
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]+/g, "")
    .trim();
}

/** Busca a qué personaje se refiere una marca: por nombre completo, por id o por un nombre o apellido que no se repita. */
export function personajeDeMarca(marca: string, personajes: PersonajeConVoz[]): string | null {
  const m = plano(marca);
  const exacto = personajes.find((p) => plano(p.nombre) === m || p.id === m);
  if (exacto) return exacto.id;
  const palabras = m.split(/\s+/);
  if (palabras.length > 4) return null;
  const candidatos = personajes.filter((p) =>
    plano(p.nombre)
      .split(/\s+/)
      .filter((n) => n.length >= 3)
      .some((n) => palabras.includes(n) && personajes.filter((o) => plano(o.nombre).split(/\s+/).includes(n)).length === 1),
  );
  return candidatos.length === 1 ? candidatos[0]!.id : null;
}

// **Nombre:** texto  ·  **Nombre**: texto
const MARCA = /^\*\*([^*:\n]{1,40}?)(?::\*\*|\*\*:)\s*(.*)$/;

/** Guion de un texto en markdown. */
export function guionDe(markdown: string, personajes: PersonajeConVoz[]): Linea[] {
  const lineas: Linea[] = [];
  const agregar = (voz: QuienLee, texto: string) => {
    const t = textoParaLeer(texto);
    if (!t) return;
    const ultima = lineas[lineas.length - 1];
    if (ultima && JSON.stringify(ultima.voz) === JSON.stringify(voz)) ultima.texto += ` ${t}`;
    else lineas.push({ voz, texto: t });
  };

  for (const cruda of markdown.split("\n")) {
    let linea = cruda.trim();
    if (!linea || /^([-*_]\s*){3,}$/.test(linea) || /^\|?\s*:?-{2,}/.test(linea)) continue;
    // tabla: las celdas se leen separadas por comas
    if (linea.startsWith("|")) {
      agregar("narrador", linea.split("|").map((c) => sinMarcas(c.trim())).filter(Boolean).join(", "));
      continue;
    }
    linea = linea.replace(/^#{1,6}\s+/, "").replace(/^>\s?/, "").replace(/^([-*+]|\d+[.)])\s+/, "");
    const marca = linea.match(MARCA);
    if (marca) {
      const quien = personajeDeMarca(marca[1]!, personajes);
      // con un personaje conocido, la marca no se lee: se oye su voz. Si no, el narrador lee la etiqueta
      if (quien) agregar({ personaje: quien }, sinMarcas(marca[2]!));
      else agregar("narrador", `${sinMarcas(marca[1]!)}: ${sinMarcas(marca[2]!)}`);
      continue;
    }
    agregar("narrador", sinMarcas(linea));
  }
  return lineas;
}

/** Guion del celular: los chats alternan la voz de su dueño y la del contacto. */
export function guionCelular(celular: NonNullable<Prueba["celular"]>, personajes: PersonajeConVoz[]): Linea[] {
  const lineas: Linea[] = [];
  const decir = (voz: QuienLee, texto: string) => {
    const t = textoParaLeer(sinMarcas(texto));
    if (t) lineas.push({ voz, texto: t });
  };
  const vozDe = (nombre: string | undefined, porDefecto: QuienLee): QuienLee => {
    const id = nombre ? personajeDeMarca(nombre, personajes) : null;
    return id ? { personaje: id } : porDefecto;
  };
  const dueno = vozDe(celular.dueno, "otra");
  if (celular.dueno) decir("narrador", `Celular de ${celular.dueno}.`);
  for (const chat of celular.chats) {
    decir("narrador", `Chat con ${chat.contacto}.`);
    const contacto = vozDe(chat.contacto, "narrador");
    for (const m of chat.mensajes) decir(m.de === "victima" ? dueno : contacto, m.texto);
  }
  const TIPO = { entrante: "Llamada entrante de", saliente: "Llamada a", perdida: "Llamada perdida de" } as const;
  for (const l of celular.llamadas) decir("narrador", `${TIPO[l.tipo]} ${l.contacto}, a las ${l.hora}${l.duracion ? `, duró ${l.duracion}` : ""}.`);
  for (const c of celular.correos) {
    decir("narrador", `Correo para ${c.para}. Asunto: ${c.asunto}.`);
    decir("narrador", c.cuerpo);
  }
  for (const n of celular.notas) decir("narrador", `Nota: ${n.texto}`);
  return lineas;
}

/** El guion completo de una prueba: título, contenido y celular. */
export function guionDePrueba(prueba: Pick<Prueba, "titulo" | "contenido" | "celular">, personajes: PersonajeConVoz[]): Linea[] {
  return [{ voz: "narrador", texto: textoParaLeer(prueba.titulo) }, ...guionDe(prueba.contenido, personajes), ...(prueba.celular ? guionCelular(prueba.celular, personajes) : [])];
}
