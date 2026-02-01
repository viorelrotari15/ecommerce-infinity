'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCardCompact } from '@/components/server/products/product-card-compact';
import type { Product } from '@/lib/api/server';

interface SimilarProductsCarouselProps {
  products: Product[];
  currentProductSlug?: string;
}

export function SimilarProductsCarousel({ products, currentProductSlug }: SimilarProductsCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate number of slides (each slide shows 3 products)
  const totalSlides = products && products.length > 0 ? Math.ceil(products.length / 3) : 0;
  const maxSlide = totalSlides - 1;

  // Auto-advance functionality
  useEffect(() => {
    if (isPaused || totalSlides <= 0) {
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev >= maxSlide ? 0 : prev + 1));
    }, 10000); // 10 seconds

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, maxSlide, totalSlides]);

  // Don't render if no products or less than 1 product
  if (!products || products.length === 0) {
    return null;
  }

  const handlePrevious = () => {
    setCurrentSlide((prev) => (prev <= 0 ? maxSlide : prev - 1));
    // Reset timer on manual navigation
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev >= maxSlide ? 0 : prev + 1));
    }, 10000);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev >= maxSlide ? 0 : prev + 1));
    // Reset timer on manual navigation
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev >= maxSlide ? 0 : prev + 1));
    }, 10000);
  };

  return (
    <section className="w-full mt-16 mb-8">
      <h2 className="text-3xl font-bold mb-6 text-center">You May Also Like</h2>
      <div className="flex justify-center">
        <div
          className="relative max-w-6xl w-full"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Carousel Container */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {Array.from({ length: totalSlides }).map((_, slideIndex) => {
                const startIndex = slideIndex * 3;
                const slideProducts = products.slice(startIndex, startIndex + 3);
                
                return (
                  <div
                    key={slideIndex}
                    className="w-full flex-shrink-0 flex justify-center items-start gap-4"
                  >
                    {slideProducts.map((product) => (
                      <div key={product.id} className="flex-shrink-0 w-[280px]">
                        <ProductCardCompact product={product} />
                      </div>
                    ))}
                    {/* Fill empty slots to maintain centering when less than 3 products */}
                    {slideProducts.length < 3 && Array.from({ length: 3 - slideProducts.length }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="flex-shrink-0 w-[280px]" />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Arrows - Always visible */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-background"
            onClick={handlePrevious}
            aria-label="Previous products"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-background"
            onClick={handleNext}
            aria-label="Next products"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
