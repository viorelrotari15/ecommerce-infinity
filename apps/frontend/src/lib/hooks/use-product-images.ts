'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadImage, deleteImage, setPrimaryImage } from '@/lib/api/client';
import { getAuthToken } from '@/lib/auth';
import { productQueryKeys } from '@/lib/api/queries';

/**
 * Hook for uploading product images
 * Invalidates product cache after successful upload
 */
export function useUploadProductImage(productId: string) {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async (data: {
      file: File;
      options?: { isPrimary?: boolean; order?: number };
    }) => {
      if (!token) throw new Error('Not authenticated');
      return uploadImage(productId, data.file, token, data.options);
    },
    onSuccess: () => {
      // Invalidate all product queries to refetch with new images
      queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
    },
  });
}

/**
 * Hook for deleting product images
 * Invalidates product cache after successful deletion
 */
export function useDeleteProductImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId: string) => {
      return deleteImage(imageId);
    },
    onSuccess: () => {
      // Invalidate all product queries to refetch with updated images
      queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
    },
  });
}

/**
 * Hook for setting primary image
 * Invalidates product cache after successful update
 */
export function useSetPrimaryImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId: string) => {
      return setPrimaryImage(imageId);
    },
    onSuccess: () => {
      // Invalidate all product queries to refetch with updated primary image
      queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
    },
  });
}

