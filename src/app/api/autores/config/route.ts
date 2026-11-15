import { connection } from "next/server";

/** Cómo se puede entrar: con Google y GitHub si hay Supabase, o con el login falso en tests y desarrollo. */
export async function GET() {
  // se lee en cada pedido, no en el build
  await connection();
  const falso = process.env.AUTH_FALSO === "1" && !process.env.VERCEL;
  const supabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SECRET_KEY;
  return Response.json({ falso, proveedores: !falso && supabase ? ["google", "github"] : [] });
}
