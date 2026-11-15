import { expect, test, type Browser, type Page } from "@playwright/test";

/** Abre un jugador nuevo (contexto aislado = otro dispositivo) y lo une a la sala. */
async function unirJugador(browser: Browser, codigo: string, apodo: string) {
  const pagina = await (await browser.newContext()).newPage();
  await pagina.goto(`/sala/${codigo}`);
  await pagina.getByPlaceholder("Ej.: Ramiro").fill(apodo);
  await pagina.getByRole("button", { name: "Entrar a la investigación" }).click();
  return pagina;
}

async function crearSala(pagina: Page, apodo: string) {
  await pagina.goto("/");
  await pagina.getByPlaceholder("Ej.: Ramiro").fill(apodo);
  await pagina.getByRole("button", { name: "Crear sala" }).click();
  await pagina.waitForURL(/\/sala\/[A-Z]{4}$/);
  return pagina.url().split("/").pop()!;
}

async function preguntar(pagina: Page, personaje: string, texto: string) {
  await pagina.getByRole("button", { name: "Interrogar" }).click();
  await pagina.getByRole("button", { name: new RegExp(`^${personaje}`) }).click();
  await pagina.getByPlaceholder("Preguntale algo…").fill(texto);
  await pagina.getByRole("button", { name: "Enviar" }).click();
}

test("partida completa: dos jugadores y la tele", async ({ page: anfitrion, browser }) => {
  const codigo = await crearSala(anfitrion, "Ramiro");
  await expect(anfitrion.getByText("Ramiro")).toBeVisible();

  const lu = await unirJugador(browser, codigo, "Lu");
  const tele = await (await browser.newContext()).newPage();
  await tele.goto(`/sala/${codigo}?pantalla`);
  await tele.getByRole("button", { name: "Conectar como pantalla compartida" }).click();
  await expect(tele.getByText(codigo)).toBeVisible();

  // abrir el caso: el otro jugador pasa solo a la partida
  await anfitrion.getByRole("button", { name: "Abrir el caso" }).click();
  await expect(lu.getByRole("heading", { name: "Sobre 1: La escena" })).toBeVisible();

  // abrir un sobre: aviso agrupado en el otro dispositivo
  await anfitrion.getByRole("button", { name: /Sobre 2.*Abrir sobre/ }).click();
  await expect(lu.getByText("7 pruebas nuevas en el expediente")).toBeVisible();

  // el celular de la víctima se navega como uno real
  await anfitrion.getByRole("button", { name: "📱 Celular de Julia" }).click();
  await anfitrion.getByRole("button", { name: "Deslizá hacia arriba para abrir" }).click();
  await anfitrion.getByRole("button", { name: /Mensajes/ }).first().click();
  await expect(anfitrion.getByText("Arcimboldo").first()).toBeVisible();

  // los personajes bloqueados no revelan su nombre
  await anfitrion.getByRole("button", { name: "Interrogar" }).click();
  await expect(anfitrion.getByText("???")).toHaveCount(2);

  // interrogatorio con revelación: Carla entrega el pendrive y la tele lo muestra
  await preguntar(lu, "Carla Belotti", "¿Julia te dejó algo? [revelar:carla_entrega_sobre]");
  await expect(lu.getByText("Carla Belotti: Está bien, les cuento lo que sé.")).toBeVisible();
  await expect(tele.getByText("Carla Belotti: Está bien, les cuento lo que sé.")).toBeVisible();
  await expect(anfitrion.getByText("Pendrive azul de Julia").first()).toBeVisible();

  // guardrail: una clave ajena a la ficha se rechaza
  await lu.waitForTimeout(3100);
  await lu.getByPlaceholder("Preguntale algo…").fill("¿Quién la mató? [revelar:julian_confiesa]");
  await lu.getByRole("button", { name: "Enviar" }).click();
  await expect(lu.getByText("Carla Belotti: No tengo nada que decir sobre eso.")).toBeVisible();

  // candado: primero mal, después bien
  await anfitrion.getByRole("button", { name: "Expediente" }).click();
  const codigoCandado = anfitrion.getByPlaceholder("Código", { exact: true });
  await codigoCandado.fill("B12");
  await anfitrion.getByRole("button", { name: "Probar" }).click();
  await expect(anfitrion.getByText("Código incorrecto")).toBeVisible();
  await codigoCandado.fill("c27");
  await anfitrion.getByRole("button", { name: "Probar" }).click();
  await expect(anfitrion.getByRole("button", { name: "📄 Archivo 'Para quien me encuentre'" })).toBeVisible();

  // votación: votan los dos y se resuelve
  for (const jugador of [anfitrion, lu]) {
    await jugador.getByRole("button", { name: "Resolver" }).click();
    for (const fieldset of await jugador.locator("fieldset").all()) {
      await fieldset.locator("label").first().click();
    }
    await jugador.getByRole("button", { name: "Votar esta acusación" }).click();
  }
  await expect(anfitrion.getByText("Caso cerrado")).toBeVisible();
  await expect(tele.getByText("Caso cerrado")).toBeVisible();
  await anfitrion.getByRole("button", { name: "Saltar al resultado" }).click();
  await expect(anfitrion.getByText("Lo que realmente pasó")).toBeVisible();

  // salir vuelve al inicio
  await anfitrion.getByRole("button", { name: "⎋ Salir" }).click();
  await anfitrion.waitForURL("/");
});

test("límite: una segunda pregunta inmediata se rechaza", async ({ request }) => {
  const { codigo } = await (await request.post("/api/salas", { data: { casoId: "hotel_aurora" } })).json();
  const unir = async (apodo: string) => (await (await request.post(`/api/salas/${codigo}/unirse`, { data: { apodo, tipo: "jugador" } })).json()).token;
  const a = await unir("A");
  await unir("B");
  await request.post(`/api/salas/${codigo}/accion`, { data: { token: a, accion: { tipo: "iniciar" } } });
  const [r1, r2] = await Promise.all([
    request.post(`/api/salas/${codigo}/interrogar`, { data: { token: a, personaje: "carla", texto: "Hola" } }),
    request.post(`/api/salas/${codigo}/interrogar`, { data: { token: a, personaje: "esteban", texto: "Hola" } }),
  ]);
  expect([r1.status(), r2.status()].sort()).toEqual([200, 429]);
});

test("celular: el panel se adapta y la barra inferior navega", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const pagina = await ctx.newPage();
  const codigo = await crearSala(pagina, "Celu");
  await unirJugador(browser, codigo, "Otro");
  await pagina.getByRole("button", { name: "Abrir el caso" }).click();
  await pagina.getByRole("button", { name: "Notas" }).click();
  await pagina.getByPlaceholder("Hipótesis, contradicciones, horarios…").fill("El reloj fue adelantado");
  await pagina.getByRole("button", { name: "Guardar" }).click();
  await expect(pagina.getByText("El reloj fue adelantado")).toBeVisible();
});

test("modo traidor: uno solo ve la ficha y el cierre lo revela", async ({ page: anfitrion, browser }) => {
  await anfitrion.goto("/");
  await anfitrion.getByPlaceholder("Ej.: Ramiro").fill("Ana");
  await anfitrion.getByLabel("Modo").selectOption("traidor");
  await anfitrion.getByRole("button", { name: "Crear sala" }).click();
  await anfitrion.waitForURL(/\/sala\/[A-Z]{4}$/);
  const codigo = anfitrion.url().split("/").pop()!;

  const beto = await unirJugador(browser, codigo, "Beto");
  // con dos jugadores todavía no se puede arrancar
  await expect(anfitrion.getByRole("button", { name: /mínimo 3/ })).toBeDisabled();
  const caro = await unirJugador(browser, codigo, "Caro");
  await anfitrion.getByRole("button", { name: "Abrir el caso" }).click();

  const jugadores = [anfitrion, beto, caro];
  for (const j of jugadores) await expect(j.getByRole("heading", { name: "Sobre 1: La escena" })).toBeVisible();
  const conFicha = [];
  for (const j of jugadores) if (await j.getByRole("button", { name: /rol secreto/i }).count()) conFicha.push(j);
  expect(conFicha).toHaveLength(1);

  // la ficha se ve solo mientras se mantiene apretada
  const boton = conFicha[0].getByRole("button", { name: /rol secreto/i });
  await boton.hover();
  await conFicha[0].mouse.down();
  await expect(conFicha[0].getByText("Sos el traidor")).toBeVisible();
  await conFicha[0].mouse.up();
  await expect(conFicha[0].getByText("Sos el traidor")).toBeHidden();

  for (const j of jugadores) {
    await j.getByRole("button", { name: "Resolver" }).click();
    for (const fieldset of await j.locator("fieldset").all()) await fieldset.locator("label").first().click();
    await j.getByRole("button", { name: "Votar esta acusación" }).click();
  }
  await expect(anfitrion.getByText("Caso cerrado")).toBeVisible();
  await anfitrion.getByRole("button", { name: "Saltar al resultado" }).click();
  await expect(anfitrion.getByText("El traidor era")).toBeVisible();
  await expect(anfitrion.getByText(/Gana el (equipo|traidor)/)).toBeVisible();
});
