import { describe, expect, it } from "vitest";
import { administradores, mailValido, rolDe } from "./autores";

describe("cuentas de autor", () => {
  it("lee los administradores de la variable, sin mayúsculas ni espacios", () => {
    expect(administradores(" Ramiro@Ejemplo.com , otra@x.org,")).toEqual(["ramiro@ejemplo.com", "otra@x.org"]);
    expect(administradores("")).toEqual([]);
  });

  it("el rol sale de los administradores, después de los moderadores y si no es autor", () => {
    const admins = ["jefe@x.org"];
    const mods = ["mod@x.org"];
    expect(rolDe("JEFE@x.org", admins, mods)).toBe("admin");
    expect(rolDe("mod@x.org", admins, mods)).toBe("moderador");
    expect(rolDe("otro@x.org", admins, mods)).toBe("autor");
    expect(rolDe("jefe@x.org", admins, ["jefe@x.org"])).toBe("admin");
  });

  it("valida el formato del mail", () => {
    expect(mailValido("a@b.co")).toBe(true);
    expect(mailValido("sin-arroba")).toBe(false);
    expect(mailValido("a b@c.d")).toBe(false);
  });
});
