import { afterEach, describe, expect, it, vi } from "vitest";
import { leerCasoArchivado } from "@/casos/archivados";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("catálogo de casos oficiales", () => {
  it("carga los mismos ids desde Supabase, con imágenes en Storage y la caja fuerte de la app", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proyecto.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "secret-de-prueba");
    const fetch = vi.fn(async () => Response.json([
      { id: "vendimia", datos: leerCasoArchivado("vendimia") },
      { id: "hotel_aurora", datos: leerCasoArchivado("hotel-aurora") },
    ]));
    vi.stubGlobal("fetch", fetch);
    const { listarOficiales, obtenerOficial } = await import("./casosOficiales");
    const [aurora, vendimia] = await listarOficiales();
    expect([aurora.meta.id, vendimia.meta.id]).toEqual(["hotel_aurora", "vendimia"]);
    expect(aurora.minijuegos.find((m) => m.tipo === "personalizado")?.config.pagina).toBe("/casos/hotel-aurora/minijuegos/caja-fuerte.html");
    const storage = "https://proyecto.supabase.co/storage/v1/object/public/casos-autores/oficiales/vendimia/";
    expect(vendimia.sobres[0].escena?.imagen).toBe(storage + "escenas/nave.jpg");
    expect(vendimia.pruebas.some((p) => p.contenido.includes(storage + "pruebas/puerta-exterior.jpg"))).toBe(true);
    expect(await obtenerOficial("vendimia")).toBe(vendimia);
    expect(await obtenerOficial("autor-otro")).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/rest/v1/casos_oficiales?select=id%2Cdatos"), expect.anything());
  });

  it("en Vercel no usa los expedientes archivados como respaldo", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    const { listarOficiales } = await import("./casosOficiales");
    expect(await listarOficiales()).toEqual([]);
  });

  it("no acepta un id discordante ni un minijuego HTML nuevo", async () => {
    const { cargarCasoOficial } = await import("./casosOficiales");
    const datos = leerCasoArchivado("hotel-aurora");
    expect(cargarCasoOficial(datos, "vendimia", "/")).toBeNull();
    const aurora = cargarCasoOficial(datos, "hotel_aurora", "/")!;
    aurora.minijuegos.find((m) => m.tipo === "personalizado")!.config.pagina = "/otra-pagina";
    expect(cargarCasoOficial(aurora, "hotel_aurora", "/")).toBeNull();
  });
});
