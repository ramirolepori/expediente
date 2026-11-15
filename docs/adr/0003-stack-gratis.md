# 0003. Todo gratis

**Contexto.** Es un proyecto lúdico. Ramiro no quiere pagar nada.

**Decisión.** Vercel Hobby, Supabase Free (tabla `salas`, Realtime), Gemini en el plan gratis y repo público en GitHub (`ramirolepori/expediente`) para tener Actions gratis.

**Consecuencias.** Cualquier servicio nuevo tiene que tener plan gratis suficiente. No se configura facturación en Google AI Studio. Supabase Free pausa proyectos con 7 días sin actividad: el cron diario de limpieza (`/api/cron/limpiar`) le hace una consulta todos los días y con eso alcanza, siempre que `CRON_SECRET` esté cargada en Vercel. GitHub Actions está bloqueado por un problema de la cuenta (ticket #5006449), por eso Vercel corre los tests antes de compilar.
