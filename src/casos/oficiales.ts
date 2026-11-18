export const CASOS_OFICIALES = [
  { id: "hotel_aurora", carpeta: "hotel-aurora" },
  { id: "vendimia", carpeta: "vendimia" },
] as const;

export const BUCKET_CASOS = "casos-autores";
export const prefijoOficial = (id: string) => `oficiales/${id}/`;
