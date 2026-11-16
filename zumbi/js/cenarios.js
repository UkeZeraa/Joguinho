// Distribui o construtor de cenário de cada zona.
import { suburbio } from './cen_suburbio.js';
import { centro } from './cen_centro.js';
import { lab } from './cen_lab.js';
import { base } from './cen_base.js';
import { ninho } from './cen_ninho.js';

const CONSTRUTORES = { suburbio, centro, lab, base, ninho };

export function montarCenario(zonaId, A) {
  (CONSTRUTORES[zonaId] || centro)(A);
}
