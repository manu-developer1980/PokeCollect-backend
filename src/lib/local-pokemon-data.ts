import fs from 'fs';
import path from 'path';
import { getSpanishSetName } from '../data/set-translations';

interface PokemonCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  level?: string;
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  abilities?: Array<{
    name: string;
    text: string;
    type: string;
  }>;
  attacks?: Array<{
    name: string;
    cost?: string[];
    convertedEnergyCost?: number;
    damage?: string;
    text?: string;
  }>;
  weaknesses?: Array<{
    type: string;
    value: string;
  }>;
  resistances?: Array<{
    type: string;
    value: string;
  }>;
  retreatCost?: string[];
  convertedRetreatCost?: number;
  number: string;
  artist?: string;
  rarity?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities?: {
    [format: string]: string;
  };
  images?: {
    small: string;
    large: string;
  };
  set?: {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    total: number;
    legalities: {
      [format: string]: string;
    };
    ptcgoCode?: string;
    releaseDate: string;
    updatedAt: string;
    images: {
      symbol: string;
      logo: string;
    };
  };
}

interface PokemonSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  legalities: {
    [format: string]: string;
  };
  ptcgoCode?: string;
  releaseDate: string;
  updatedAt: string;
  images: {
    symbol: string;
    logo: string;
  };
}

class LocalPokemonDataService {
  private dataPath: string;
  private setsCache: PokemonSet[] | null = null;
  private cardsCache: Map<string, PokemonCard[]> = new Map();
  private allCardsCache: PokemonCard[] | null = null;

  constructor() {
    this.dataPath = path.join(process.cwd(), 'data', 'pokemon-tcg');
  }

  // Cargar todos los sets
  async getSets(language: string = 'en'): Promise<PokemonSet[]> {
    if (this.setsCache) {
      const translatedSets = this.applySetsTranslation(this.setsCache, language);
      return this.sortSetsAlphabetically(translatedSets);
    }

    try {
      const setsPath = path.join(this.dataPath, 'sets', 'en.json');
      const setsData = fs.readFileSync(setsPath, 'utf-8');
      this.setsCache = JSON.parse(setsData);
      const translatedSets = this.applySetsTranslation(this.setsCache || [], language);
      return this.sortSetsAlphabetically(translatedSets);
    } catch (error) {
      console.error('Error loading sets:', error);
      return [];
    }
  }

  private applySetsTranslation(sets: PokemonSet[], language: string): PokemonSet[] {
    if (language !== 'es') {
      return sets;
    }

    return sets.map(set => {
      const spanishName = getSpanishSetName(set.id, set.name);
      return {
        ...set,
        name: spanishName
      };
    });
  }

  private sortSetsAlphabetically(sets: PokemonSet[]): PokemonSet[] {
    return sets.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Cargar cartas de un set específico
  async getCardsBySet(setId: string): Promise<PokemonCard[]> {
    if (this.cardsCache.has(setId)) {
      return this.cardsCache.get(setId) || [];
    }

    try {
      const cardsPath = path.join(this.dataPath, 'cards', 'en', `${setId}.json`);
      if (!fs.existsSync(cardsPath)) {
        return [];
      }

      const cardsData = fs.readFileSync(cardsPath, 'utf-8');
      const cards: PokemonCard[] = JSON.parse(cardsData);
      
      // Agregar información del set a cada carta
      const sets = await this.getSets('en');
      const setInfo = sets.find(s => s.id === setId);
      
      if (setInfo) {
        cards.forEach(card => {
          card.set = setInfo;
        });
      }

      this.cardsCache.set(setId, cards);
      return cards;
    } catch (error) {
      console.error(`Error loading cards for set ${setId}:`, error);
      return [];
    }
  }

  // Cargar todas las cartas (lazy loading)
  async getAllCards(): Promise<PokemonCard[]> {
    if (this.allCardsCache) {
      return this.allCardsCache;
    }

    try {
      const sets = await this.getSets('en');
      const allCards: PokemonCard[] = [];

      for (const set of sets) {
        const setCards = await this.getCardsBySet(set.id);
        allCards.push(...setCards);
      }

      this.allCardsCache = allCards;
      return allCards;
    } catch (error) {
      console.error('Error loading all cards:', error);
      return [];
    }
  }

  // Buscar cartas por nombre
  async searchCardsByName(name: string, limit: number = 20): Promise<PokemonCard[]> {
    const allCards = await this.getAllCards();
    const searchTerm = name.toLowerCase();
    
    return allCards
      .filter(card => card.name.toLowerCase().includes(searchTerm))
      .slice(0, limit);
  }

  // Buscar cartas por tipo
  async searchCardsByType(type: string, limit: number = 20): Promise<PokemonCard[]> {
    const allCards = await this.getAllCards();
    
    return allCards
      .filter(card => card.types?.some(t => t.toLowerCase() === type.toLowerCase()))
      .slice(0, limit);
  }

  // Buscar cartas por supertipo
  async searchCardsBySupertype(supertype: string, limit: number = 20): Promise<PokemonCard[]> {
    const allCards = await this.getAllCards();
    
    return allCards
      .filter(card => card.supertype.toLowerCase() === supertype.toLowerCase())
      .slice(0, limit);
  }

  // Obtener carta por ID
  async getCardById(cardId: string): Promise<PokemonCard | null> {
    const allCards = await this.getAllCards();
    return allCards.find(card => card.id === cardId) || null;
  }

  // Obtener set por ID
  async getSetById(setId: string): Promise<PokemonSet | null> {
    const sets = await this.getSets('en');
    return sets.find(set => set.id === setId) || null;
  }

  // Buscar sets por nombre
  async searchSetsByName(name: string, limit: number = 20): Promise<PokemonSet[]> {
    const sets = await this.getSets('en');
    const searchTerm = name.toLowerCase();
    
    return sets
      .filter(set => set.name.toLowerCase().includes(searchTerm))
      .slice(0, limit);
  }

  // Obtener tipos únicos
  async getTypes(): Promise<string[]> {
    const allCards = await this.getAllCards();
    const typesSet = new Set<string>();
    
    allCards.forEach(card => {
      card.types?.forEach(type => typesSet.add(type));
    });
    
    return Array.from(typesSet).sort();
  }

  // Obtener supertipos únicos
  async getSupertypes(): Promise<string[]> {
    const allCards = await this.getAllCards();
    const supertypesSet = new Set<string>();
    
    allCards.forEach(card => {
      supertypesSet.add(card.supertype);
    });
    
    return Array.from(supertypesSet).sort();
  }

  // Obtener subtipos únicos
  async getSubtypes(): Promise<string[]> {
    const allCards = await this.getAllCards();
    const subtypesSet = new Set<string>();
    
    allCards.forEach(card => {
      card.subtypes?.forEach(subtype => subtypesSet.add(subtype));
    });
    
    return Array.from(subtypesSet).sort();
  }

  // Obtener raridades únicas
  async getRarities(): Promise<string[]> {
    const allCards = await this.getAllCards();
    const raritiesSet = new Set<string>();
    
    allCards.forEach(card => {
      if (card.rarity) {
        raritiesSet.add(card.rarity);
      }
    });
    
    return Array.from(raritiesSet).sort();
  }

  // Limpiar cache
  clearCache(): void {
    this.setsCache = null;
    this.cardsCache.clear();
    this.allCardsCache = null;
  }

  // Obtener estadísticas
  async getStats(): Promise<{
    totalSets: number;
    totalCards: number;
    cacheStatus: {
      setsLoaded: boolean;
      cardsLoaded: number;
      allCardsLoaded: boolean;
    };
  }> {
    const sets = await this.getSets('en');
    const allCards = await this.getAllCards();
    
    return {
      totalSets: sets.length,
      totalCards: allCards.length,
      cacheStatus: {
        setsLoaded: this.setsCache !== null,
        cardsLoaded: this.cardsCache.size,
        allCardsLoaded: this.allCardsCache !== null
      }
    };
  }
}

export const localPokemonData = new LocalPokemonDataService();
export type { PokemonCard, PokemonSet };