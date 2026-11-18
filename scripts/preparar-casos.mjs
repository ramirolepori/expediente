import { spawnSync } from "node:child_process";
import { mkdir, writeFile, access, readFile, cp, rm, rename } from "node:fs/promises";
import { dirname, join } from "node:path";

// Congelado en el último commit con ambos expedientes en el árbol público.
const commit = "3b36866e1ab7ad292541253e84076d83322c4faf";
const archivos = [
  "casos/hotel-aurora/caso.json",
  "casos/vendimia/caso.json",
  "casos/vendimia/REVISION.md",
  "casos/vendimia/PROMPTS-IMAGENES.md",
  "public/casos/vendimia/escenas/galeria.jpg",
  "public/casos/vendimia/escenas/lavadero.jpg",
  "public/casos/vendimia/escenas/nave.jpg",
  "public/casos/vendimia/escenas/oficina.jpg",
  "public/casos/vendimia/escenas/sala-control.jpg",
  "public/casos/vendimia/pruebas/puerta-exterior.jpg",
];

const congelada = join(".casos-local", commit);
await Promise.all(archivos.map(async (archivo) => {
  const destino = join(congelada, archivo);
  if (await access(destino).then(() => true, () => false)) return;
  const git = spawnSync("git", ["show", `${commit}:${archivo}`]);
  let bytes = git.stdout;
  if (git.status !== 0) {
    const respuesta = await fetch(`https://raw.githubusercontent.com/ramirolepori/expediente/${commit}/${archivo}`, { signal: AbortSignal.timeout(30_000) });
    if (!respuesta.ok) throw new Error(`No pude recuperar ${archivo} (${respuesta.status})`);
    bytes = Buffer.from(await respuesta.arrayBuffer());
  }
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, bytes);
}));

// La versión vigente: la copia congelada más los cambios de `casos-oficiales/`
// (imágenes nuevas y reemplazos en el JSON y los documentos de autor).
const temporal = join(".casos-local", `actual-${process.pid}`);
const actual = join(".casos-local", "actual");
await rm(temporal, { recursive: true, force: true });
await cp(congelada, temporal, { recursive: true });
const cambios = JSON.parse(await readFile(join("casos-oficiales", "cambios.json"), "utf8"));
for (const [carpeta, { pruebas = {}, textos = {} }] of Object.entries(cambios)) {
  const imagenes = join("casos-oficiales", carpeta);
  if (await access(imagenes).then(() => true, () => false)) {
    await cp(imagenes, join(temporal, "public", "casos", carpeta), { recursive: true });
  }
  const rutaCaso = join(temporal, "casos", carpeta, "caso.json");
  const caso = JSON.parse(await readFile(rutaCaso, "utf8"));
  for (const [id, campos] of Object.entries(pruebas)) {
    const prueba = caso.pruebas.find((p) => p.id === id);
    if (!prueba) throw new Error(`casos-oficiales/cambios.json: ${carpeta} no tiene la prueba ${id}`);
    Object.assign(prueba, campos);
  }
  await writeFile(rutaCaso, JSON.stringify(caso, null, 2) + "\n");
  for (const [archivo, reemplazos] of Object.entries(textos)) {
    const ruta = join(temporal, "casos", carpeta, archivo);
    let texto = await readFile(ruta, "utf8");
    for (const [buscar, poner] of reemplazos) {
      if (!texto.includes(buscar)) throw new Error(`casos-oficiales/cambios.json: no encontré en ${carpeta}/${archivo} el texto «${buscar.slice(0, 60)}»`);
      texto = texto.replace(buscar, () => poner);
    }
    await writeFile(ruta, texto);
  }
}
await rm(actual, { recursive: true, force: true });
await rename(temporal, actual);
