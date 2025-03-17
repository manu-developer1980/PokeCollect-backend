import { Request, Response } from "express";
import axios from "axios";

const POKEMON_TCG_API_BASE = "https://api.pokemontcg.io/v2";
const API_KEY = process.env.POKEMON_TCG_API_KEY || "";

// Configuración de headers para la API de Pokémon TCG
const apiHeaders = API_KEY ? { "X-Api-Key": API_KEY } : {};

// Función de utilidad para reintentar peticiones
async function fetchWithRetry(url: string, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, { headers: apiHeaders });
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// Controlador para buscar cartas
export const searchCards = async (req: Request, res: Response) => {
  const { q, page, pageSize, orderBy, set, rarity } = req.query;

  try {
    let queryString = "";

    // Construir la query base
    if (q) queryString += `q=${q}&`;

    // Añadir filtro por set si está presente
    if (set && set !== "all") {
      const setQuery = q ? ` set.id:"${set}"` : `q=set.id:"${set}"`;
      queryString += setQuery;
    }

    // Añadir filtro por rareza si está presente
    if (rarity && rarity !== "all") {
      const rarityQuery = queryString.includes('q=') ? ` rarity:"${rarity}"` : `q=rarity:"${rarity}"`;
      queryString += rarityQuery;
    }

    // Añadir paginación y ordenación
    if (page) queryString += `page=${page}&`;
    if (pageSize) queryString += `pageSize=${pageSize}&`;
    if (orderBy) queryString += `orderBy=${orderBy}`;

    const response = await axios.get(
      `${POKEMON_TCG_API_BASE}/cards?${queryString}`,
      {
        headers: apiHeaders,
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("API request failed:", error);
    res.status(500).json({
      data: [],
      page: 1,
      pageSize: 20,
      count: 0,
      totalCount: 0,
      error: "Failed to fetch cards",
    });
  }
};

// Controlador para obtener una carta por ID
export const getCardById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const data = await fetchWithRetry(`${POKEMON_TCG_API_BASE}/cards/${id}`);
    res.json(data);
  } catch (error) {
    console.error(`Failed to fetch card details for ${id}:`, error);
    res.status(404).json({
      data: {
        id,
        name: "Card Unavailable",
        images: {
          small: "/placeholder-card.png",
          large: "/placeholder-card.png",
        },
      },
    });
  }
};

// Controlador para obtener sets
export const getSets = async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${POKEMON_TCG_API_BASE}/sets`, {
      headers: apiHeaders,
      params: {
        orderBy: "-releaseDate", // Ordenar por fecha de lanzamiento, más recientes primero
      },
    });

    // Transformar y enriquecer la respuesta
    const sets = response.data.data.map((set: any) => ({
      id: set.id,
      name: set.name,
      series: set.series,
      printedTotal: set.printedTotal,
      releaseDate: set.releaseDate,
      images: set.images,
      symbol: set.images?.symbol || null,
      logo: set.images?.logo || null,
    }));

    res.json({
      data: sets,
      count: sets.length,
    });
  } catch (error) {
    console.error("Error fetching sets:", error);
    res.status(500).json({
      error: "Failed to fetch sets",
      data: [],
    });
  }
};

// Controlador para obtener tipos
export const getTypes = async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${POKEMON_TCG_API_BASE}/types`, {
      headers: apiHeaders,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching types:", error);
    res.status(500).json({ error: "Failed to fetch types", data: [] });
  }
};

// Controlador para obtener raridades
export const getRarities = async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${POKEMON_TCG_API_BASE}/rarities`, {
      headers: apiHeaders,
    });

    res.header("Access-Control-Allow-Origin", "*");
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching rarities:", error);
    res.status(500).json({ error: "Failed to fetch rarities", data: [] });
  }
};
