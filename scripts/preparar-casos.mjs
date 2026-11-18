import { spawnSync } from "node:child_process";
import { mkdir, writeFile, access } from "node:fs/promises";
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

await Promise.all(archivos.map(async (archivo) => {
  const destino = join(".casos-local", commit, archivo);
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
