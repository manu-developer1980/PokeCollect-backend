export interface PokemonCardSearchParams {
  q?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
}

export interface PokemonCardSearchResponse {
  data: any[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}
