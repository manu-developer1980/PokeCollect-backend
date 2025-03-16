import fetch from "node-fetch";
import {
  PokemonCardSearchParams,
  PokemonCardSearchResponse,
} from "../types/pokemon.js";

const POKEMON_TCG_API_BASE = "https://api.pokemontcg.io/v2";
const API_KEY = process.env.POKEMON_TCG_API_KEY;

const headers = {
  "Content-Type": "application/json",
  "X-Api-Key": API_KEY as string,
};

export async function searchCards(
  params: PokemonCardSearchParams
): Promise<PokemonCardSearchResponse> {
  const queryParams = new URLSearchParams();

  if (params.q) queryParams.append("q", params.q);
  if (params.page) queryParams.append("page", params.page.toString());
  if (params.pageSize)
    queryParams.append("pageSize", params.pageSize.toString());
  if (params.orderBy) queryParams.append("orderBy", params.orderBy);

  try {
    const response = await fetch(
      `${POKEMON_TCG_API_BASE}/cards?${queryParams.toString()}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as any;

    return {
      data: data.data || [],
      page: parseInt(data.page) || 1,
      pageSize: parseInt(data.pageSize) || 20,
      count: parseInt(data.count) || 0,
      totalCount: parseInt(data.totalCount) || 0,
    };
  } catch (error) {
    console.error("API request failed:", error);
    return {
      data: [],
      page: 1,
      pageSize: 20,
      count: 0,
      totalCount: 0,
    };
  }
}

export async function getCardById(id: string) {
  try {
    const response = await fetch(`${POKEMON_TCG_API_BASE}/cards/${id}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Error fetching card: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    return data.data;
  } catch (error) {
    console.error(`Failed to fetch card details for ${id}:`, error);
    return {
      id,
      name: "Card Unavailable",
      images: {
        small: "/placeholder-card.png",
        large: "/placeholder-card.png",
      },
    };
  }
}

export async function getSets() {
  try {
    const response = await fetch(`${POKEMON_TCG_API_BASE}/sets`, { headers });

    if (!response.ok) {
      throw new Error("Error fetching sets");
    }

    const data = (await response.json()) as any;
    return data.data;
  } catch (error) {
    console.error("Failed to fetch sets:", error);
    return [];
  }
}

export async function getTypes() {
  try {
    const response = await fetch(`${POKEMON_TCG_API_BASE}/types`, { headers });

    if (!response.ok) {
      throw new Error("Error fetching types");
    }

    const data = (await response.json()) as any;
    return data.data;
  } catch (error) {
    console.error("Failed to fetch types:", error);
    return [];
  }
}

export async function getRarities() {
  try {
    const response = await fetch(`${POKEMON_TCG_API_BASE}/rarities`, {
      headers,
    });

    if (!response.ok) {
      throw new Error("Error fetching rarities");
    }

    const data = (await response.json()) as any;
    return data.data;
  } catch (error) {
    console.error("Failed to fetch rarities:", error);
    return [];
  }
}
