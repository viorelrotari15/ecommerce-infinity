import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../api/client';

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
  return useQuery({
    queryKey: ['product-translations', productId],
    queryFn: async () => {
      // Fetch translations directly
      return apiService.get<ProductTranslation[]>(`/products/${productId}/translations`);
    },
    // Only depend on productId; translations should load regardless of auth token state.
    enabled: !!productId,
  });
}

export function useCreateProductTranslation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProductTranslation) => {
      return apiService.post(`/products/${data.productId}/translations/${data.language}`, {
        name: data.name,
        description: data.description,
        shortDescription: data.shortDescription,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-translations', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProductTranslation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProductTranslation) => {
      return apiService.post(`/products/${data.productId}/translations/${data.language}`, {
        name: data.name,
        description: data.description,
        shortDescription: data.shortDescription,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-translations', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

