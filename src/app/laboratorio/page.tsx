import Link from "next/link";

const PRUEBAS = [
  { href: "/laboratorio/personaje", titulo: "Personaje animado", texto: "Alberto Mansilla en dos estilos: vectorial animado y retratos realistas. Emociones, hablar y confesión." },
  { href: "/laboratorio/minijuegos", titulo: "Minijuegos", texto: "Todos los minijuegos de los casos, para jugarlos sueltos, reiniciarlos, ver la solución y qué destraban." },
  { href: "/laboratorio/ambientaciones", titulo: "Ambientaciones", texto: "Los cinco temas visuales (noir, policial, médico, terror y de época) con los mismos componentes del juego." },
];

export default function Laboratorio() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-acento">Laboratorio</p>
      <h1 className="mt-2 text-3xl font-bold">Pruebas de diseño</h1>
      <p className="mt-2 text-suave">Páginas para probar ideas antes de llevarlas al juego.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {PRUEBAS.map((p) => (
          <Link key={p.href} href={p.href} className="rounded-2xl border border-borde bg-panel p-5 transition hover:border-acento">
            <h2 className="text-lg font-semibold">{p.titulo}</h2>
            <p className="mt-1 text-sm text-suave">{p.texto}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
