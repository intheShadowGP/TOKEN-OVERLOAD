/**
 * Seuils de renaissance (tokens à générer pendant la partie), indexés par le
 * nombre de renaissances déjà faites : REBIRTH_THRESHOLDS[0] = 1re renaissance.
 * FICHIER GÉNÉRÉ par tests/calibrate.mjs (q = 1.656) — ne pas modifier à la main.
 * Courbe visée : 45 min pour la 1re, ~36 h cumulées pour la 20e, ~72 h pour la
 * 30e, ~720 h (1 mois) pour la Super Renaissance.
 */
export const REBIRTH_THRESHOLDS = Object.freeze([
  2.73e7, 2.44e9, 3.91e11, 5.77e14, 2.68e20,
  8.37e21, 3.01e22, 7.72e22, 1.87e23, 1.45e24,
  2.50e25, 1.21e27, 3.76e29, 3.93e32, 4.25e34,
  4.23e35, 1.51e36, 6.49e36, 1.90e37, 4.73e37,
  1.66e38, 3.78e38, 8.49e38, 1.88e39, 6.29e39,
  1.63e40, 3.79e40, 8.45e40, 1.84e41, 3.99e41,
  9.26e41, 2.00e42, 6.34e42, 1.60e43, 3.63e43,
  7.92e43, 1.69e44, 3.59e44, 7.59e44, 1.60e45,
  4.34e45, 1.17e46, 2.70e46, 5.89e46, 1.25e47,
  2.63e47, 5.50e47, 1.14e48, 2.37e48, 4.92e48,
  1.02e49, 2.11e49, 4.36e49, 9.00e49, 1.86e50,
  3.83e50, 7.94e50, 1.64e51, 4.00e51, 1.12e52,
  2.59e52, 5.64e52, 1.19e53, 2.47e53, 5.11e53,
  1.05e54, 2.16e54, 4.43e54, 9.09e54, 1.86e55,
  3.82e55, 7.82e55, 1.60e56, 3.27e56, 6.72e56,
  1.38e57, 2.82e57, 8.29e57, 2.03e58, 4.50e58,
  9.53e58, 1.98e59, 4.08e59, 8.35e59, 1.71e60,
  3.49e60, 7.11e60, 1.45e61, 2.95e61, 6.02e61,
  1.23e62, 2.50e62, 5.08e62, 1.04e63, 2.12e63,
  4.85e63, 1.38e64, 3.19e64, 6.90e64, 1.44e65,
]);
