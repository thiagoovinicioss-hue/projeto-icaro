import * as THREE from 'three'
import { clamp01 } from '../memory/memoryGeometry'

/**
 * Geometria e constantes do "escritório retrô" (§59).
 *
 * Sistema de coordenadas: tampo da mesa em y = 0; câmera = pessoa sentada
 * olhando levemente para baixo. +Z vem em direção à câmera (frente da mesa são
 * valores positivos). Unidades são metros aproximados.
 */

export const DESK_W = 2.6
export const DESK_D = 1.2
export const DESK_THICK = 0.07
export const DESK_TOP_Y = DESK_THICK
export const DESK_LEG_H = 0.72
export const FLOOR_Y = -(DESK_LEG_H + DESK_THICK)
export const WALL_Z = -1.05

/* console/monitor (direita) — TV CRT de mesa ~14", carcaça creme volumosa,
   traseira afunilada de tubo, face frontal com moldura escura e painel de
   controles analógicos à direita. A face frontal fica em CRT_POS.z +
   CRT_SHELL_D/2 e o tampo em deskTopY. */
export const CRT_POS: [number, number, number] = [0.52, 0, -0.4]
/** largura total da carcaça (creme). */
export const CRT_SHELL_W = 0.8
/** altura total da carcaça (creme), sem pés. */
export const CRT_SHELL_H = 0.62
/** profundidade total (frente→trás): MUITO importante, silhueta de tubo. */
export const CRT_SHELL_D = 0.5
/** pés: separação da mesa (contact shadow). */
export const CRT_FOOT_H = 0.016
/** plano Z da face frontal externa (frente = +Z). */
export const CRT_FACE_Z = CRT_SHELL_D / 2
/** centro Y da face frontal (mundo local do grupo). */
export const CRT_FACE_CY = CRT_FOOT_H + CRT_SHELL_H / 2

/* janela da tela (furo real da carcaça) — 4:3, deslocada à esquerda para
   deixar o painel de controle à direita (§6). */
export const CRT_OPEN_W = 0.575
export const CRT_OPEN_H = 0.45
export const CRT_OPEN_CX = -0.075
export const CRT_OPEN_CY = CRT_FACE_CY + 0.004
export const CRT_OPEN_R = 0.03

/* vidro útil (CRTContentSurface): 4:3 exato do canvas 480×360. */
export const CRT_SCREEN_W = 0.5
export const CRT_SCREEN_H = 0.375

/* painel de controles (direita). */
export const CRT_PANEL_W = 0.16
export const CRT_PANEL_H = 0.5
export const CRT_PANEL_CX = 0.31
export const CRT_PANEL_CY = CRT_FACE_CY

/* aliases legados (compat). */
export const CRT_BEZEL_W = CRT_SHELL_W
export const CRT_BEZEL_H = CRT_SHELL_H
export const CRT_BEZEL_D = CRT_SHELL_D

/* impressora (esquerda) — laser compacta dos anos 2000, base no tampo.
   W:H:D ≈ 1:0.55:0.70, menor que o CRT; leve rotação contra a parede (§24/§25) */
export const PRINT_POS: [number, number, number] = [-0.42, 0, -0.32]
export const PRINT_W = 0.36
export const PRINT_H = 0.198
export const PRINT_D = 0.25
export const PRINT_ROT_Y = 0.12
/**
 * Saída frontal do papel — a folha nasce DENTRO da boca frontal (não do topo).
 * `PAPER_EXIT_ORIGIN` fica centralizado em X, pouco atrás da face externa da
 * fenda (z≈0.127), na altura dos roletes da saída. A folha estende-se a partir
 * daí ao longo de +Z local (para fora da máquina), com uma leve inclinação de
 * "nariz para baixo" seguindo a geometria da bandeja.
 */
export const PAPER_EXIT_ORIGIN: [number, number, number] = [0, 0.063, 0.098]
/** inclinação (rad) da direção de saída: ~4.9°, nariz ligeiramente para baixo */
export const PAPER_EXIT_TILT = 0.085
/**
 * Repouso do papel impresso: a folha deita com a FRENTE apoiada no tampo e a
 * TRASEIRA descansando sobre a bandeja de saída (levemente nariz-para-baixo),
 * de modo que não atravesse nem a bandeja nem a mesa.
 */
export const PAPER_PARK_Y = 0.009
export const PAPER_PARK_Z = 0.32
/** inclinação de repouso (rad): ~3.4° nariz-para-baixo */
export const PAPER_PARK_PITCH = 0.06
export const PAPER_PARK_ROLL = 0.005

/* teclado e mouse — descansando SOBRE o tampo (bases alinhadas à mesa), logo
   os Y aqui refletem DESK_TOP_Y. O mouse também usa office.deskTopY. */
export const KB_POS: [number, number, number] = [-0.3, DESK_TOP_Y + 0.026, 0.26]
/* mouse ao lado direito do teclado, na frente da mesa e no pool da luminária */
export const MB_POS: [number, number, number] = [0.05, DESK_TOP_Y, 0.34]

/* luminária (centro-fundo) — base apoiada no tampo */
export const LAMP_POS: [number, number, number] = [-0.16, DESK_TOP_Y, -0.56]

/* pequenos objetos de mesa (estações fictícias, §16) — superfície apoiada no tampo */
export const PAD_POS: [number, number, number] = [-0.46, DESK_TOP_Y - 0.004, 0.3]
export const PEN_POS: [number, number, number] = [-0.46, DESK_TOP_Y + 0.007, 0.34]
export const FLOPPY_POS: [number, number, number] = [0.95, DESK_TOP_Y + 0.0025, 0.06]
export const POSTER_POS: [number, number, number] = [-0.86, 1.02, WALL_Z + 0.02]

/* lente humana — ~45mm equivalente, pessoa sentada, borda da mesa no
   canto inferior da viewport (§14/§15). Ponto de vista levemente mais alto
   para que a face e o topo do CRT entrem no quadro sem distorção. */
export const CAM_SEATED: [number, number, number] = [0.02, 0.66, 1.18]
export const CAM_TARGET: [number, number, number] = [0.08, 0.1, -0.3]
export const CAM_MOBILE: [number, number, number] = [0.06, 0.6, 1.5]
export const CAM_MOBILE_TARGET: [number, number, number] = [0.3, 0.1, -0.25]
export const CAM_FOV = 42
export const CAM_FOV_MOBILE = 66

/* ---------------------------------- curvas da tela CRT ---------------------------------- */

/**
 * Superfície convexa tipo tubo para a tela do monitor, com UVs 0..1 que casam
 * 1:1 com o canvas 480×360 do sistema (NearestFilter). O bojo é quadrático e
 * perceptível nos DOIS eixos (canto recuado, centro em relevo) — leitura
 * imediata de vidro de tubo. Malha subdividida o suficiente para a curvatura
 * sobreviver ao raycast e às sombras.
 */
export function makeCrtScreenGeometry(w: number, h: number, curve = 0.045): THREE.BufferGeometry {
  const segX = 36
  const segY = 28
  const geo = new THREE.PlaneGeometry(w, h, segX, segY)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (w / 2)
    const y = pos.getY(i) / (h / 2)
    // bojo de tubo: centro em relevo, cantos recuados (X e Y perceptíveis)
    const z = -curve * (x * x * 0.85 + y * y * 0.6)
    pos.setZ(i, z)
  }
  geo.computeVertexNormals()
  return geo
}

/** Cantos da borda da tela (para reforçar o vidro). */
export function crtScreenCorner(w: number, h: number, xSign: number, ySign: number): THREE.Vector3 {
  return new THREE.Vector3((xSign * w) / 2, (ySign * h) / 2, -Math.sqrt(Math.max(0, 1 - xSign * xSign)) * 0.025)
}

export { clamp01 }