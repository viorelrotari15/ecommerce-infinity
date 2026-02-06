'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/auth';
import {
  getCarouselSlides,
  getCarouselSlidesAdmin,
  createCarouselSlide,
  updateCarouselSlide,
  deleteCarouselSlide,
} from '@/lib/api/client';
import { carouselQueryKeys } from '@/lib/api/queries';

export function useCarouselSlides() {
  return useQuery({
    queryKey: carouselQueryKeys.list(),
    queryFn: getCarouselSlides,
  });
}

export function useCarouselSlidesAdmin() {
  return useQuery({
    queryKey: carouselQueryKeys.admin(),
    queryFn: getCarouselSlidesAdmin,
  });
}

export function useCreateCarouselSlide() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      if (!token) throw new Error('Not authenticated');
      return createCarouselSlide(formData, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: carouselQueryKeys.all });
    },
  });
}

export function useUpdateCarouselSlide() {
  const queryClient = useQueryClient();
  const token = getAuthToken();

  return useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: FormData }) => {
      if (!token) throw new Error('Not authenticated');
      return updateCarouselSlide(id, formData, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: carouselQueryKeys.all });
    },
  });
}

export function useDeleteCarouselSlide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCarouselSlide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: carouselQueryKeys.all });
    },
  });
}
