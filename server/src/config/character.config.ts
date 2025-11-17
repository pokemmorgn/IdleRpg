/**
 * Configuration des slots de personnages par serveur
 */

/**
 * Nombre maximum de personnages qu'un joueur peut avoir sur un même serveur
 * IMPORTANT : Modifie cette valeur pour changer la limite
 */
export const MAX_CHARACTERS_PER_SERVER = 5;

/**
 * Vérifie si un slot est valide
 */
export function isValidCharacterSlot(slot: number): boolean {
  return slot >= 1 && slot <= MAX_CHARACTERS_PER_SERVER;
}

/**
 * Liste de tous les slots valides
 */
export const VALID_CHARACTER_SLOTS = Array.from(
  { length: MAX_CHARACTERS_PER_SERVER }, 
  (_, i) => i + 1
);
