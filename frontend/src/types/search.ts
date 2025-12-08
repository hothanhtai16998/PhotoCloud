export interface SearchSuggestion {
  type: 'title' | 'tag' | 'location' | 'category';
  text: string;
  query: string;
}

export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[];
  query?: string;
}

export interface PopularSearchesResponse {
  popular: SearchSuggestion[];
}

