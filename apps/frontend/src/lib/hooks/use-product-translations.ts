import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { getAuthToken } from '../auth';

export interface ProductTranslation {
  id?: string;
  productId: string;
  language: string;
  name: string;
  description?: string;
  shortDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export function useProductTranslations(productId: string) {
  const token = getAuthToken();
  
  return useQuery({
    queryKey: ['product-translations', productId],
    queryFn: async () => {
      // Fetch translations directly
      const response = await apiClient.get<ProductTranslation[]>(
        `/products/${productId}/translations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data || [];
    },
    enabled: !!token && !!productId,
  });
}

export function useCreateProductTranslation() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async (data: ProductTranslation) => {
      return apiClient.post(
        `/products/${data.productId}/translations/${data.language}`,
        {
          name: data.name,
          description: data.description,
          shortDescription: data.shortDescription,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-translations', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProductTranslation() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async (data: ProductTranslation) => {
      return apiClient.post(
        `/products/${data.productId}/translations/${data.language}`,
        {
          name: data.name,
          description: data.description,
          shortDescription: data.shortDescription,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-translations', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

