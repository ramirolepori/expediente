import { afterEach, describe, expect, it, vi } from "vitest";
import { almacen, INACTIVIDAD_MAXIMA_MS, type Sala } from "./almacen";
import { GET } from "@/app/api/cron/limpiar/route";

const sala = (codigo: string) => ({ estado: { codigo }, tokens: {} }) as unknown as Sala;
const pedir = (auth?: string) => GET(new Request("http://x/api/cron/limpiar", { headers: auth ? { authorization: auth } : {} }));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("limpieza de salas viejas", () => {
  it("borra solo las salas sin escrituras hace más de 24 h", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    await almacen.crear(sala("VIEJ"));
    await almacen.crear(sala("ACTV"));
    vi.setSystemTime(INACTIVIDAD_MAXIMA_MS - 1000);
    await almacen.actualizar("ACTV", (s) => ({ ...s, tokens: { t: "x" } })); // la usaron hace poco
    await almacen.crear(sala("NUEV"));
    vi.setSystemTime(INACTIVIDAD_MAXIMA_MS + 1);
    vi.stubEnv("CRON_SECRET", "secreto");

    const res = await pedir("Bearer secreto");
    expect(await res.json()).toEqual({ borradas: 1 });
    expect(await almacen.obtener("VIEJ")).toBeNull();
    expect(await almacen.obtener("ACTV")).not.toBeNull();
    expect(await almacen.obtener("NUEV")).not.toBeNull();
  });

  it("rechaza llamadas sin el secreto", async () => {
    expect((await pedir("Bearer secreto")).status).toBe(401); // sin CRON_SECRET cargado no pasa nadie
    vi.stubEnv("CRON_SECRET", "secreto");
    expect((await pedir()).status).toBe(401);
    expect((await pedir("Bearer otro")).status).toBe(401);
  });
});
