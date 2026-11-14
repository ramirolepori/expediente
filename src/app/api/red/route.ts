import { networkInterfaces } from "node:os";

/** IP de la red local, para que el QR sirva a los celulares cuando el anfitrión abre la app como localhost. */
export async function GET() {
  const ip = Object.values(networkInterfaces())
    .flat()
    .find((i) => i && i.family === "IPv4" && !i.internal)?.address;
  return Response.json({ ip: ip ?? null });
}
