import type { Metadata } from "next";
import { PanelAutores } from "./PanelAutores";

export const metadata: Metadata = { title: "Autores · Expediente" };

/** Página para quienes escriben casos (ADR 0012). Por ahora: entrar con una cuenta y, si sos administrador, nombrar moderadores. */
export default function Pagina() {
  return <PanelAutores />;
}
