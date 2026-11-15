import { NavLaboratorio } from "./NavLaboratorio";

/** Páginas de prueba para decidir diseño: no son parte del juego. */
export default function LayoutLaboratorio({ children }: LayoutProps<"/laboratorio">) {
  return (
    <>
      <NavLaboratorio />
      {children}
    </>
  );
}
