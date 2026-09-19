/**
 * Silhueta do Ícaro — garrafa PET de 2L real (barriga cheia ~0.40 de raio),
 * água azul, cone preto artesanal, região azul inferior discreta (a "saia"),
 * aletas de papelão presas na carcaça. Origem = bico (boca), +Y para o nariz;
 * alturas em eixo NORMALIZADO (corpo: y 0..2.35), raios no espaço do corpo.
 */
export const ROCKET_DIMENSIONS = {
  nozzle: {
    lipRadius: 0.115,
    baseRadius: 0.13,
    height: 0.2,
    tipRadius: 0.09,
  },
  /**
   * perfil do lathe do corpo PET — [raio, y ABSOLUTO] (raio PRIMEIRO), y antes
   * da normalização (−MIN_Y). CILINDRO reto (raio ~0.36) com leve afunilamento
   * só nas duas pontas — garrafa "de verdade", sem pescoço/ombro.
   */
  bottleProfile: [
    [0.34, 0.3],
    [0.36, 0.66],
    [0.36, 0.86],
    [0.36, 1.08],
    [0.36, 1.32],
    [0.36, 1.82],
    [0.36, 2.3],
    [0.35, 2.55],
  ] as Array<[number, number]>,
  bodyTopY: 2.25,
  /** Região azul inferior = saia do corpo (boca → início da barriga), mesma
   *  pele do lathe, tingida de azul translúcido — sem cilindro/luva extra. */
  blue: { bottomY: 0.0, topY: 0.5 },
  /** Fita única na costura azul→claro (marca de "fita adesiva"). */
  tapeEdge: { at: [0.5], offset: 0.006, tube: 0.016 },
  cone: { baseY: 2.2, baseRadius: 0.37, height: 0.72, tipRadius: 0.05 },
  water: { radius: 0.32, height: 1.02, bottomY: 0.86 },
  /** Aletas: placa fina que encosta (morde 6mm) na carcaça — "colada", sem anel. */
  fin: { halfThickness: 0.035, innerOverlap: 0.006 },
} as const