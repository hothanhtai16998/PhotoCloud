import api, { get } from '@/lib/api';

export interface Category {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  imageCount?: number;
}

// Simple cache to prevent duplicate requests
let categoriesCache: { data: Category[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to clear the categories cache
export const clearCategoriesCache = () => {
  categoriesCache = null;
};

export const categoryService = {
  fetchCategories: async (forceRefresh = false): Promise<Category[]> => {
    // Return cached data if available and not expired
    if (!forceRefresh && categoriesCache) {
      const now = Date.now();
      if (now - categoriesCache.timestamp < CACHE_DURATION) {
        return categoriesCache.data;
      }
    }

    const res = await get('/categories', {
      withCredentials: true,
    });
    const categories = (res.data as { categories?: Category[] }).categories || [];

    // Update cache
    categoriesCache = {
      data: categories,
      timestamp: Date.now(),
    };

    return categories;
  },

  getAllCategoriesAdmin: async (): Promise<Category[]> => {
    const res = await get('/categories/admin', {
      withCredentials: true,
    });
    return (res.data as { categories?: Category[] }).categories || [];
  },

  createCategory: async (data: {
    name: string;
    description?: string;
  }): Promise<Category> => {
    const res = await api.post('/categories/admin', data, {
      withCredentials: true,
    });
    return res.data.category;
  },

  updateCategory: async (
    categoryId: string,
    data: { name?: string; description?: string; isActive?: boolean }
  ): Promise<Category> => {
    const res = await api.put(`/categories/admin/${categoryId}`, data, {
      withCredentials: true,
    });
    return res.data.category;
  },

  deleteCategory: async (categoryId: string): Promise<void> => {
    await api.delete(`/categories/admin/${categoryId}`, {
      withCredentials: true,
    });
  },
};
