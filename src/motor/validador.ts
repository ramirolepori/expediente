import { CasoSchema, type Caso, type Condicion } from "@/casos/schema";
import { evaluar, pruebaVisible } from "./condiciones";

export interface ResultadoValidacion {
  ok: boolean;
  errores: string[];
  avisos: string[];
  caso?: Caso;
}

function referencias(c: Condicion, out: { tipo: string; id: string }[] = []) {
  if (c.tipo === "todas" || c.tipo === "alguna") c.condiciones.forEach((x) => referencias(x, out));
  else if (c.tipo !== "siempre") out.push({ tipo: c.tipo, id: (c as Record<string, string>)[c.tipo] });
  return out;
}

/** Valida forma (schema), integridad de referencias y que el caso se pueda resolver. */
export function validarCaso(datos: unknown): ResultadoValidacion {
  const parsed = CasoSchema.safeParse(datos);
  if (!parsed.success) {
    return { ok: false, avisos: [], errores: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  const caso = parsed.data;
  const errores: string[] = [];
  const avisos: string[] = [];

  const ids = {
    sobre: new Set(caso.sobres.map((x) => x.id)),
    prueba: new Set(caso.pruebas.map((x) => x.id)),
    hecho: new Set(caso.hechos.map((x) => x.id)),
    candado: new Set(caso.candados.map((x) => x.id)),
    personaje: new Set(caso.personajes.map((x) => x.id)),
  };

  // ids duplicados
  for (const [nombre, lista] of Object.entries({
    sobres: caso.sobres,
    pruebas: caso.pruebas,
    hechos: caso.hechos,
    candados: caso.candados,
    personajes: caso.personajes,
    ayudas: caso.ayudas,
    preguntas: caso.resolucion.preguntas,
  })) {
    const vistos = new Set<string>();
    for (const x of lista as { id: string }[]) {
      if (vistos.has(x.id)) errores.push(`${nombre}: id duplicado "${x.id}"`);
      vistos.add(x.id);
    }
  }

  // referencias en condiciones
  const chequear = (c: Condicion, donde: string) => {
    for (const r of referencias(c)) {
      if (!ids[r.tipo as keyof typeof ids]?.has(r.id)) errores.push(`${donde}: referencia a ${r.tipo} inexistente "${r.id}"`);
    }
  };
  caso.sobres.forEach((s) => chequear(s.requisito, `sobre ${s.id}`));
  caso.candados.forEach((c) => chequear(c.disponible, `candado ${c.id}`));
  caso.ayudas.forEach((a) => chequear(a.disponible, `ayuda ${a.id}`));
  caso.pruebas.forEach((p) => {
    if (!ids.sobre.has(p.sobre)) errores.push(`prueba ${p.id}: sobre inexistente "${p.sobre}"`);
    if (p.desbloqueo) chequear(p.desbloqueo, `prueba ${p.id}`);
    if (p.tipo === "celular" && !p.celular) errores.push(`prueba ${p.id}: tipo celular sin datos de celular`);
  });
  const hechoDeSecreto = new Map<string, string>();
  caso.personajes.forEach((p) => {
    chequear(p.disponible, `personaje ${p.id}.disponible`);
    p.sabe.forEach((h) => {
      if (!ids.hecho.has(h)) errores.push(`personaje ${p.id}: sabe hecho inexistente "${h}"`);
      hechoDeSecreto.set(h, `${p.id}.sabe`);
    });
    p.secretos.forEach((s) => {
      if (!ids.hecho.has(s.hecho)) errores.push(`secreto ${s.id}: hecho inexistente "${s.hecho}"`);
      chequear(s.cuando, `secreto ${s.id}`);
      hechoDeSecreto.set(s.hecho, s.id);
    });
    p.mentiras.forEach((m, i) => chequear(m.cae, `personaje ${p.id}.mentiras[${i}]`));
  });
  caso.verdad.culpables.forEach((c) => {
    if (!ids.personaje.has(c.personaje)) errores.push(`verdad: culpable inexistente "${c.personaje}"`);
  });
  caso.resolucion.preguntas.forEach((q) => {
    if (q.tipo === "personaje" && !ids.personaje.has(q.respuesta) && !(q.permiteNadie && q.respuesta === "nadie")) {
      errores.push(`pregunta ${q.id}: respuesta no es un personaje`);
    }
    if (q.tipo === "opcion" && !q.opciones?.some((o) => o.id === q.respuesta)) errores.push(`pregunta ${q.id}: respuesta no está entre las opciones`);
  });
  if (caso.sobres[0]?.requisito.tipo !== "siempre") errores.push("el primer sobre tiene que tener requisito 'siempre'");

  // hechos que se usan en condiciones tienen que poder revelarse vía algún secreto
  const usados = new Set<string>();
  const todas: Condicion[] = [
    ...caso.sobres.map((s) => s.requisito),
    ...caso.pruebas.flatMap((p) => (p.desbloqueo ? [p.desbloqueo] : [])),
    ...caso.candados.map((c) => c.disponible),
    ...caso.personajes.flatMap((p) => [p.disponible, ...p.secretos.map((s) => s.cuando), ...p.mentiras.map((m) => m.cae)]),
  ];
  todas.forEach((c) => referencias(c).forEach((r) => r.tipo === "hecho" && usados.add(r.id)));
  usados.forEach((h) => {
    if (!hechoDeSecreto.has(h)) errores.push(`el hecho "${h}" se usa en una condición pero ningún personaje lo cuenta`);
  });

  if (errores.length) return { ok: false, errores, avisos, caso };

  // simulación: jugadores perfectos que abren todo lo que pueden
  const estado = { sobresAbiertos: [] as string[], hechosRevelados: [] as string[], candadosAbiertos: [] as string[] };
  let cambios = true;
  while (cambios) {
    cambios = false;
    for (const s of caso.sobres) {
      if (!estado.sobresAbiertos.includes(s.id) && evaluar(s.requisito, estado, caso)) {
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
  caso.sobres.forEach((s) => !estado.sobresAbiertos.includes(s.id) && errores.push(`inalcanzable: sobre ${s.id}`));
  caso.pruebas.forEach((p) => !pruebaVisible(p.id, estado, caso) && errores.push(`inalcanzable: prueba ${p.id}`));
  caso.candados.forEach((c) => !estado.candadosAbiertos.includes(c.id) && errores.push(`inalcanzable: candado ${c.id}`));
  caso.personajes.forEach((p) => {
    if (!evaluar(p.disponible, estado, caso)) errores.push(`inalcanzable: personaje ${p.id}`);
    p.secretos.forEach((s) => !estado.hechosRevelados.includes(s.hecho) && errores.push(`inalcanzable: secreto ${s.id}`));
  });

  // avisos de diseño
  const enAlgunaFicha = new Set(caso.personajes.flatMap((p) => [...p.sabe, ...p.secretos.map((s) => s.hecho)]));
  caso.hechos.forEach((h) => !enAlgunaFicha.has(h.id) && avisos.push(`el hecho "${h.id}" no lo conoce ningún personaje`));
  caso.personajes.forEach((p) => {
    if (p.interrogable && !p.voz) avisos.push(`personaje ${p.id} sin voz`);
  });

  return { ok: errores.length === 0, errores, avisos, caso };
}
