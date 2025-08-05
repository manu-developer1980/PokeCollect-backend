import { Request, Response } from "express";

// Datos mock para pruebas cuando la API externa no está disponible
const mockCards = [
  {
    id: "base1-25",
    name: "Pikachu",
    supertype: "Pokémon",
    subtypes: ["Basic"],
    hp: "60",
    types: ["Lightning"],
    attacks: [
      {
        name: "Gnaw",
        cost: ["Colorless"],
        convertedEnergyCost: 1,
        damage: "10",
        text: ""
      },
      {
        name: "Thunder Jolt",
        cost: ["Lightning", "Lightning"],
        convertedEnergyCost: 2,
        damage: "30",
        text: "Flip a coin. If tails, Pikachu does 10 damage to itself."
      }
    ],
    weaknesses: [
      {
        type: "Fighting",
        value: "+10"
      }
    ],
    retreatCost: ["Colorless"],
    convertedRetreatCost: 1,
    set: {
      id: "base1",
      name: "Base",
      series: "Base",
      printedTotal: 102,
      total: 102,
      legalities: {
        unlimited: "Legal"
      },
      ptcgoCode: "BS",
      releaseDate: "1999/01/09",
      updatedAt: "2020/08/14 09:35:00",
      images: {
        symbol: "https://images.pokemontcg.io/base1/symbol.png",
        logo: "https://images.pokemontcg.io/base1/logo.png"
      }
    },
    number: "25",
    artist: "Atsuko Nishida",
    rarity: "Common",
    flavorText: "When several of these POKéMON gather, their electricity could build and cause lightning storms.",
    nationalPokedexNumbers: [25],
    legalities: {
      unlimited: "Legal"
    },
    images: {
      small: "https://images.pokemontcg.io/base1/25.png",
      large: "https://images.pokemontcg.io/base1/25_hires.png"
    },
    tcgplayer: {
      url: "https://prices.pokemontcg.io/tcgplayer/base1-25",
      updatedAt: "2023/03/29",
      prices: {
        normal: {
          low: 1.0,
          mid: 2.5,
          high: 5.0,
          market: 2.0
        }
      }
    }
  },
  {
    id: "base1-4",
    name: "Charizard",
    supertype: "Pokémon",
    subtypes: ["Stage 2"],
    hp: "120",
    types: ["Fire"],
    evolvesFrom: "Charmeleon",
    attacks: [
      {
        name: "Energy Burn",
        cost: ["Fire"],
        convertedEnergyCost: 1,
        damage: "",
        text: "As often as you like during your turn (before your attack), you may turn all Energy attached to Charizard into Fire Energy for the rest of the turn. This power can't be used if Charizard is Asleep, Confused, or Paralyzed."
      },
      {
        name: "Fire Spin",
        cost: ["Fire", "Fire", "Fire", "Fire"],
        convertedEnergyCost: 4,
        damage: "100",
        text: "Discard 2 Energy cards attached to Charizard in order to use this attack."
      }
    ],
    weaknesses: [
      {
        type: "Water",
        value: "+30"
      }
    ],
    resistances: [
      {
        type: "Fighting",
        value: "-30"
      }
    ],
    retreatCost: ["Colorless", "Colorless", "Colorless"],
    convertedRetreatCost: 3,
    set: {
      id: "base1",
      name: "Base",
      series: "Base",
      printedTotal: 102,
      total: 102,
      legalities: {
        unlimited: "Legal"
      },
      ptcgoCode: "BS",
      releaseDate: "1999/01/09",
      updatedAt: "2020/08/14 09:35:00",
      images: {
        symbol: "https://images.pokemontcg.io/base1/symbol.png",
        logo: "https://images.pokemontcg.io/base1/logo.png"
      }
    },
    number: "4",
    artist: "Mitsuhiro Arita",
    rarity: "Rare Holo",
    flavorText: "Spits fire that is hot enough to melt boulders. Known to cause forest fires unintentionally.",
    nationalPokedexNumbers: [6],
    legalities: {
      unlimited: "Legal"
    },
    images: {
      small: "https://images.pokemontcg.io/base1/4.png",
      large: "https://images.pokemontcg.io/base1/4_hires.png"
    },
    tcgplayer: {
      url: "https://prices.pokemontcg.io/tcgplayer/base1-4",
      updatedAt: "2023/03/29",
      prices: {
        holofoil: {
          low: 100.0,
          mid: 250.0,
          high: 500.0,
          market: 200.0
        }
      }
    }
  }
];

const mockSets = [
  {
    id: "base1",
    name: "Base",
    series: "Base",
    printedTotal: 102,
    total: 102,
    legalities: {
      unlimited: "Legal"
    },
    ptcgoCode: "BS",
    releaseDate: "1999/01/09",
    updatedAt: "2020/08/14 09:35:00",
    images: {
      symbol: "https://images.pokemontcg.io/base1/symbol.png",
      logo: "https://images.pokemontcg.io/base1/logo.png"
    }
  },
  {
    id: "base2",
    name: "Jungle",
    series: "Base",
    printedTotal: 64,
    total: 64,
    legalities: {
      unlimited: "Legal"
    },
    ptcgoCode: "JU",
    releaseDate: "1999/06/16",
    updatedAt: "2020/08/14 09:35:00",
    images: {
      symbol: "https://images.pokemontcg.io/base2/symbol.png",
      logo: "https://images.pokemontcg.io/base2/logo.png"
    }
  }
];

const mockTypes = [
  "Colorless",
  "Darkness",
  "Dragon",
  "Fairy",
  "Fighting",
  "Fire",
  "Grass",
  "Lightning",
  "Metal",
  "Psychic",
  "Water"
];

const mockRarities = [
  "Amazing Rare",
  "Common",
  "LEGEND",
  "Promo",
  "Rare",
  "Rare ACE",
  "Rare BREAK",
  "Rare Holo",
  "Rare Holo EX",
  "Rare Holo GX",
  "Rare Holo LV.X",
  "Rare Holo V",
  "Rare Holo VMAX",
  "Rare Prime",
  "Rare Prism Star",
  "Rare Rainbow",
  "Rare Secret",
  "Rare Shining",
  "Rare Shiny",
  "Rare Shiny GX",
  "Rare Ultra",
  "Uncommon"
];

// Función para filtrar cartas mock basado en parámetros
function filterMockCards(params: any) {
  let filteredCards = [...mockCards];
  
  // Filtrar por nombre si hay query
  if (params.q) {
    const query = params.q.toLowerCase();
    filteredCards = filteredCards.filter(card => 
      card.name.toLowerCase().includes(query) ||
      card.types.some(type => type.toLowerCase().includes(query))
    );
  }
  
  // Filtrar por set
  if (params.set && params.set !== 'all') {
    filteredCards = filteredCards.filter(card => card.set.id === params.set);
  }
  
  // Filtrar por rareza
  if (params.rarity && params.rarity !== 'all') {
    filteredCards = filteredCards.filter(card => card.rarity === params.rarity);
  }
  
  return filteredCards;
}

// Controlador mock para búsqueda de cartas
export const searchCardsMock = async (req: Request, res: Response) => {
  const { q, page = 1, pageSize = 20, orderBy, set, rarity } = req.query;
  
  console.log('🎭 Usando datos mock para búsqueda de cartas:', {
    q, page, pageSize, orderBy, set, rarity
  });
  
  try {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const filteredCards = filterMockCards({ q, set, rarity });
    
    // Paginación
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const startIndex = (pageNum - 1) * pageSizeNum;
    const endIndex = startIndex + pageSizeNum;
    const paginatedCards = filteredCards.slice(startIndex, endIndex);
    
    const response = {
      data: paginatedCards,
      page: pageNum,
      pageSize: pageSizeNum,
      count: paginatedCards.length,
      totalCount: filteredCards.length
    };
    
    console.log('✅ Respuesta mock generada:', {
      cartas: response.count,
      total: response.totalCount,
      página: response.page
    });
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error en mock:', error);
    res.status(500).json({
      data: [],
      page: 1,
      pageSize: 20,
      count: 0,
      totalCount: 0,
      error: "Mock data error"
    });
  }
};

// Controlador mock para obtener carta por ID
export const getCardByIdMock = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  console.log(`🎭 Buscando carta mock con ID: ${id}`);
  
  try {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const card = mockCards.find(c => c.id === id);
    
    if (card) {
      res.json({ data: card });
    } else {
      res.status(404).json({ error: "Card not found" });
    }
  } catch (error) {
    console.error('❌ Error en mock getCardById:', error);
    res.status(500).json({ error: "Mock data error" });
  }
};

// Controladores mock para datos estáticos
export const getSetsMock = async (req: Request, res: Response) => {
  console.log('🎭 Devolviendo sets mock');
  await new Promise(resolve => setTimeout(resolve, 200));
  res.json({ data: mockSets });
};

export const getTypesMock = async (req: Request, res: Response) => {
  console.log('🎭 Devolviendo tipos mock');
  await new Promise(resolve => setTimeout(resolve, 200));
  res.json({ data: mockTypes });
};

export const getRaritiesMock = async (req: Request, res: Response) => {
  console.log('🎭 Devolviendo rarezas mock');
  await new Promise(resolve => setTimeout(resolve, 200));
  res.json({ data: mockRarities });
};

// Función para verificar si la API externa está disponible
export const checkAPIHealth = async (): Promise<boolean> => {
  try {
    const axios = require('axios');
    const response = await axios.get('https://api.pokemontcg.io/v2/cards?page=1&pageSize=1', {
      timeout: 3000, // Reducido el timeout
      headers: {
        'User-Agent': 'PokeCollector/1.0'
      }
    });
    
    // Verificar que la respuesta tenga datos válidos
    if (response.status === 200 && response.data && response.data.data) {
      console.log('✅ API externa disponible');
      return true;
    } else {
      console.log('🔴 API externa responde pero sin datos válidos');
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.log('🔴 API externa no disponible:', errorMessage);
    return false;
  }
};