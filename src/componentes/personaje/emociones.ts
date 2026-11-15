export const EMOCIONES = ["neutral", "nervioso", "enojado", "triste", "sorprendido", "evasivo", "confiado", "quebrado"] as const;
export type Emocion = (typeof EMOCIONES)[number];
