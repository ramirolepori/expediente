# Imágenes del caso

Todas se generaron con Gemini. Reglas para que funcionen como escena:

- **16:9** y **sin texto** (las etiquetas las pone la plataforma).
- **La misma distribución** de objetos que dice el prompt, porque los puntos se ubican sobre esos objetos.
- **Pasarle una imagen anterior como referencia de estilo**, para que todas parezcan del mismo juego.
- Comprimidas a 1600 px de ancho, en JPG, entre 90 y 240 KB.

## Estado

| Archivo | Uso | Estado |
|---|---|---|
| `escenas/nave.jpg` | Escena del capítulo 1 | ✅ (tiene dos marcadores con el número 3: retocar o dejarlo como error del policía) |
| `escenas/galeria.jpg` | Escena del capítulo 2 | ✅ (el portapapeles dice "Guest List": retocar) |
| `escenas/sala-control.jpg` | Escena del capítulo 3 | ✅ (la planilla dice "Shift Schedule": retocar) |
| `escenas/oficina.jpg` | Escena del capítulo 4 | ✅ (el contrato dice "Contract" y los diplomas tienen letras inventadas: retocar) |
| `escenas/lavadero.jpg` | Escena del capítulo 5 | ✅ (la botella del quitamanchas tiene letras inventadas: retocar) |
| `pruebas/puerta-exterior.jpg` | Foto 4, dentro de la prueba "Puerta de la nave 2" | ✅ |
| `pruebas/puerta-interior.jpg` | Foto 5, lado de adentro con abolladuras | ⏳ falta generarla (opcional) |

Prompt negativo común, si la herramienta lo admite:

```
people, corpse, body, blood, gore, text, letters, numbers, logo, watermark, blurry, cartoon, anime, cluttered, fisheye
```

---

## Capítulo 1 · La nave de fermentación

```
Cinematic wide shot of the interior of a winery fermentation hall at night, crime scene investigation mood, point-and-click adventure game background, 16:9.

Composition, left to right:
- Left wall: an old grey industrial control panel mounted on a brick wall, with a small green LCD screen and one blinking red warning light. Above it, a small CO2 sensor box with a red LED.
- Center: three tall stainless steel fermentation tanks in a row, brushed metal reflections, small paper labels, valves and pipes, a single hanging industrial lamp above them casting a warm amber cone of light.
- Right side: a heavy wooden sliding door with metal reinforcements, closed, with a horizontal steel locking bar on the outside, visible fresh scratch marks on the bar.
- Floor (foreground, center): a white chalk outline of a body lying on the concrete floor, yellow numbered evidence markers (1, 2, 3) around it, a dropped smartphone with its screen faintly glowing near marker 2.
- A thin layer of low-lying white mist / CO2 fog hugging the floor.

Atmosphere: dark, moody, noir lighting, warm amber light against cold steel, deep shadows, damp concrete, dark wine stains on the floor, early morning crime scene after the police left. Painterly digital illustration, slightly stylized, highly detailed, clean readable shapes, eye-level camera, centered symmetrical composition.

No people, no body, no blood, no text, no logos, no watermark.
```

## Capítulo 2 · La galería después de la fiesta

```
Cinematic wide shot of the outdoor gallery of a family winery in the hills at night, right after a harvest party, point-and-click adventure game background, 16:9.

Composition, left to right:
- Left foreground: an old oak wine barrel used as a side table, with a clipboard holding a guest list on top of it.
- Left foreground floor: a broken wine glass shattered on the stone floor, with a small splash of red wine.
- Center: a long party table covered with a white tablecloth, half-empty wine bottles, used glasses, leftover plates, a few candles burned down.
- Right side of the table: a professional DSLR camera with a strap, resting on the tablecloth.
- Background: rustic wooden arches with strings of warm yellow festoon lights hanging between them, and through the arches a vineyard in rows under a starry night sky, dark hills on the horizon.

Atmosphere: the party is over, empty chairs slightly pushed back, warm amber light from the bulbs against deep blue night, melancholic and suspicious mood, a few fallen napkins and confetti on the floor. Same art style as the previous scene: semi-realistic game art, painterly digital illustration with ink outlines, highly detailed, clean readable shapes, eye-level camera.

No people, no text, no logos, no watermark.
```

## Capítulo 3 · La sala de control

```
Cinematic wide shot of a small control room inside a winery at night, overlooking the fermentation hall, point-and-click adventure game background, 16:9.

Composition, left to right:
- Left wall: a tall grey metal electrical cabinet with its door left wide open, showing switches and cables inside; on the inside of the open door, a small yellowed sticky note taped to the metal (blank, no readable text).
- Center: a desk with an industrial control console, two old monitors showing simple green graphs and system screens, a keyboard, an office chair pushed back and turned away from the desk as if someone left in a hurry. On the desk: a mate gourd with its metal straw, a thermos, a half-empty cup of coffee.
- Center wall above the desk: a large interior window looking down into the dim fermentation hall, where three stainless steel tanks are faintly visible in the dark with a thin mist on the floor.
- Wall next to the window: a clipboard hanging on a nail with a printed shift schedule (no readable text).
- Right side: a back door slightly ajar, letting in cold blue night light, with a small metal ashtray on a stool next to it, full of fresh cigarette butts, one still faintly smoking.

Atmosphere: night, quiet and abandoned, cold blue light from the monitors and the open door against a single warm desk lamp, deep shadows, suspicious mood. Same art style as the previous scenes: semi-realistic game art, painterly digital illustration with ink outlines, highly detailed, clean readable shapes, eye-level camera.

No people, no text, no letters, no numbers, no logos, no watermark.
```

## Capítulo 4 · La oficina de Raúl

```
Cinematic wide shot of the private office of an old winery owner at night, point-and-click adventure game background, 16:9.

Composition, left to right:
- Left: a tall wooden bookshelf with old wine bottles, framed award medals and diplomas (no readable text), and a few dusty ledgers.
- Center: a heavy dark wood desk with a green banker's lamp turned on. On the desk: an open leather folder with a thick printed contract and a fountain pen, a stack of loose shipping documents tied with a rubber band, and a smartphone lying face down.
- Center-right on the desk: a small worn leather notebook (a wine tasting notebook) open on a page with handwritten lines (no readable text), and a wine glass with a little red wine left.
- Right: a window with half-closed wooden blinds showing the vineyard and hills under a dark night sky, and a filing cabinet with one drawer pulled open, folders sticking out.
- Wall behind the desk: an old framed black-and-white photo of the winery's first harvest.

Atmosphere: warm green and amber lamp light, deep shadows, rich wood textures, sense of old money and secrets, quiet tension. Same art style as the previous scenes: semi-realistic game art, painterly digital illustration with ink outlines, highly detailed, clean readable shapes, eye-level camera.

No people, no text, no letters, no numbers, no logos, no watermark.
```

## Capítulo 5 · El lavadero de la casa

```
Cinematic wide shot of the laundry room of an old family house on a winery estate, at dawn, point-and-click adventure game background, 16:9.

Composition, left to right:
- Left: a front-loading washing machine with its round glass door closed; through the glass, a crumpled emerald green evening dress is clearly visible inside, unwashed, with dark purple stains on its hem.
- Floor next to the machine: a pair of elegant low-heeled women's party shoes, with dried dark purple grape must and dust on the soles.
- Center: a utility sink and a wooden counter; on the counter, a pair of yellow rubber gloves, a bottle of stain remover left open, and a damp towel.
- Center-right: a narrow back door with a small window, slightly open, showing the path toward the dark winery buildings in the early blue light; next to it, a coat rack with a woman's dark coat.
- Right: a small side table with a leather folder of official documents with stamps and signatures (no readable text) and a pair of white sneakers missing from an empty shoe rack (one empty space on the rack).

Atmosphere: cold blue early morning light through the window mixed with a single warm bulb, quiet, intimate and incriminating, everything looks hastily hidden. Same art style as the previous scenes: semi-realistic game art, painterly digital illustration with ink outlines, highly detailed, clean readable shapes, eye-level camera.

No people, no text, no letters, no numbers, no logos, no watermark.
```

La imagen salió con las zapatillas en el zapatero en vez del hueco, así que el caso lo aprovecha: son las zapatillas de la foto de las 00:45, con barro del camino a las naves.

## Prueba · Puerta de la nave, lado exterior

```
Forensic evidence photo, close-up of the outside of a heavy wooden sliding door in a winery, focused on a horizontal steel locking bar that slides into a metal bracket on the door frame, the bar is in the locked position.

Details:
- Fresh, bright silver scratch marks on the dark painted steel bar, right where it slides into the bracket, as if it was forced or slammed shut recently.
- Small dried dark purple stains of grape must (wine residue) on the bar and on the latch, with a partial smudged fingerprint.
- A yellow forensic evidence ruler/scale placed next to the scratches, and a small yellow evidence marker tag.
- Weathered wood planks with iron rivets around it.

Style: same art style as the previous scenes, semi-realistic game art, painterly digital illustration with ink outlines, highly detailed. Lit by a flashlight / camera flash from the front, harsh light, dark surroundings, slight vignette, shallow depth of field. Composition 16:9, the bar crosses the frame horizontally, scratches in the left third.

No people, no hands, no text, no logos, no watermark.
```

## Prueba · Puerta de la nave, lado interior (falta)

```
Forensic evidence photo, close-up of the inside of the same heavy wooden and steel sliding door of a winery fermentation hall, seen from inside the room. There is no handle, no latch and no lock on this side, only flat dented metal sheet.
Several fresh dents in the metal at chest height, as if someone hit it repeatedly with their fists, with faint smudges around the dents.
A yellow forensic evidence ruler next to the dents. Thin layer of white mist near the bottom of the frame.
Same art style as the previous scenes, semi-realistic game art, painterly digital illustration with ink outlines, harsh flash lighting, dark surroundings, 16:9.
No people, no hands, no blood, no text, no logos, no watermark.
```
