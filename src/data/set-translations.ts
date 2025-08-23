/**
 * Mapeo de traducciones de nombres de sets de Pokémon TCG al español
 * Basado en las traducciones oficiales de WikiDex y The Pokémon Company
 */

export interface SetTranslation {
  id: string;
  englishName: string;
  spanishName: string;
}

/**
 * Mapeo de traducciones de sets de Pokémon TCG
 * Incluye las traducciones oficiales disponibles en español
 */
export const setTranslations: Record<string, string> = {
  // Serie Escarlata y Púrpura (Scarlet & Violet Series)
  'sv1': 'Escarlata y Púrpura',
  'sv2': 'Evoluciones en Paldea',
  'sv3': 'Obsidiana Flamígera',
  'sv3pt5': 'Fuerzas Temporales',
  'sv4': 'Destinos de Paldea',
  'sv4pt5': 'Paraíso Dracónico',
  'sv5': 'Fábula Oculta',
  'sv6': 'Corona Astral',
  'sv6pt5': 'Chispas Fulgurantes',
  'sv7': 'Evoluciones Prismáticas',
  
  // Serie Espada y Escudo (Sword & Shield Series)
  'swsh1': 'Espada y Escudo',
  'swsh2': 'Furia Rebelde',
  'swsh3': 'Cielos en Llamas',
  'swsh4': 'Voltaje Vívido',
  'swsh5': 'Estilos de Combate',
  'swsh6': 'Reinado Escalofriante',
  'swsh7': 'Skies Evolving',
  'swsh8': 'Fusión Strike',
  'swsh9': 'Estrella Brillante',
  'swsh10': 'Astral Radiance',
  'swsh11': 'Mundo Perdido',
  'swsh12': 'Cenit Supremo',
  
  // Serie Sol y Luna (Sun & Moon Series)
  'sm1': 'Sol y Luna',
  'sm2': 'Guardianes Crecientes',
  'sm3': 'Sombras Ardientes',
  'sm4': 'Invasión Carmesí',
  'sm5': 'Ultraprisma',
  'sm6': 'Tormenta Celestial',
  'sm7': 'Majestad de Dragones',
  'sm8': 'Tormenta Perdida',
  'sm9': 'Equipo Up',
  'sm10': 'Vínculos Indestructibles',
  'sm11': 'Mentes Unificadas',
  'sm12': 'Destino Oculto',
  
  // Serie XY
  'xy1': 'XY',
  'xy2': 'Destellos de Fuego',
  'xy3': 'Puños Furiosos',
  'xy4': 'Fantasmas',
  'xy5': 'Cielo Rugiente',
  'xy6': 'Cielos Emergentes',
  'xy7': 'Fuerza Ancestral',
  'xy8': 'BREAKthrough',
  'xy9': 'BREAKpoint',
  'xy10': 'Generaciones',
  'xy11': 'Vapor Sitiado',
  'xy12': 'Evoluciones',
  
  // Serie Negro y Blanco (Black & White Series)
  'bw1': 'Negro y Blanco',
  'bw2': 'Fronteras Cruzadas',
  'bw3': 'Tormenta de Rayos',
  'bw4': 'Dragones Exaltados',
  'bw5': 'Límites Cruzados',
  'bw6': 'Tormenta de Plasma',
  'bw7': 'Explosión de Plasma',
  'bw8': 'Cielo Legendario',
  
  // Serie Diamante & Perla (Diamond & Pearl Series)
  'dp1': 'Diamante & Perla',
  'dp2': 'Tesoros Misteriosos',
  'dp3': 'Maravillas Secretas',
  'dp4': 'Grandes Encuentros',
  'dp5': 'Despertar de las Leyendas',
  'dp6': 'Frente Tormentoso',
  
  // Serie Platino (Platinum Series)
  'pl1': 'Platino',
  'pl2': 'Rivales Emergentes',
  'pl3': 'Arceus',
  'pl4': 'Arceus',
  
  // Serie HeartGold & SoulSilver
  'hgss1': 'HeartGold & SoulSilver',
  'hgss2': 'Desatado',
  'hgss3': 'Triunfadores',
  'hgss4': 'Llamada de las Leyendas',
  
  // Serie ex (EX Series)
  'ex1': 'Rubí & Zafiro',
  'ex10': 'Fuerzas Ocultas',
  
  // Serie Clásica (Original Series)
  'base1': 'Base Set',
  'jungle': 'Jungla',
  'fossil': 'Fósil',
  
  // Serie Neo
  'neo1': 'Neo Génesis',
  
  // Serie E-Card
  'ecard1': 'Expedición',
  'ecard2': 'Aquapolis',
  'ecard3': 'Skyridge',
  
  // Otros sets populares
  'base2': 'Base Set 2',
  'gym1': 'Gym Heroes',
  'gym2': 'Gym Challenge',
  'neo2': 'Neo Discovery',
  'neo3': 'Neo Destiny',
  'neo4': 'Neo Revelation',
  'legendary': 'Legendary Collection',
  'expedition': 'Expedición'
};

/**
 * Obtiene la traducción al español de un nombre de set
 * @param setId ID del set
 * @param fallbackName Nombre en inglés como fallback
 * @returns Nombre traducido al español o el nombre original si no hay traducción
 */
export function getSpanishSetName(setId: string, fallbackName: string): string {
  return setTranslations[setId] || fallbackName;
}

/**
 * Verifica si existe una traducción para un set específico
 * @param setId ID del set
 * @returns true si existe traducción, false en caso contrario
 */
export function hasSpanishTranslation(setId: string): boolean {
  return setId in setTranslations;
}