'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCardCompact } from '@/components/server/products/product-card-compact';
import { useT, translationKeys } from '@/lib/utils/translations';
import type { Product } from '@/lib/api/server';

interface SimilarProductsCarouselProps {
  products: Product[];
  currentProductSlug?: string;
}

export function SimilarProductsCarousel({ products, currentProductSlug }: SimilarProductsCarouselProps) {
  const t = useT();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [productsPerSlide, setProductsPerSlide] = useState(3);
  const [containerWidth, setContainerWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateProductsPerSlide = useRef(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.offsetWidth;
    setContainerWidth(width);
    const padding = width >= 640 ? 32 : 16;
    const gap = width >= 640 ? 16 : 8;
    const availableWidth = width - padding;
    const minProductWidth = 200;
    const maxProductWidth = 450;
    const productsWithMinWidth = Math.floor((availableWidth + gap) / (minProductWidth + gap));
    let calculatedProductsPerSlide = 1;
    if (productsWithMinWidth >= 3) calculatedProductsPerSlide = 3;
    else if (productsWithMinWidth >= 2) calculatedProductsPerSlide = 2;
    setProductsPerSlide(calculatedProductsPerSlide);
  }).current;

  // Run before first paint and again after paint so card borders/layout are correct on full-screen load
  useLayoutEffect(() => {
    updateProductsPerSlide();
    const resizeObserver = new ResizeObserver(updateProductsPerSlide);
    const el = containerRef.current;
    if (el) resizeObserver.observe(el);
    // Force a second layout pass after paint so container height (and card bottom border) is correct
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(updateProductsPerSlide);
    });
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateProductsPerSlide is stable (ref)
  }, []);

  // Limit to max 9 products for calculations
  const limitedProducts = products ? products.slice(0, 9) : [];
  const totalSlides = limitedProducts.length > 0 ? Math.ceil(limitedProducts.length / productsPerSlide) : 0;
  const maxSlide = Math.max(0, totalSlides - 1);
  
  // Check if all products fit on one slide
  const allProductsFit = totalSlides === 1;

  // Reset slide when productsPerSlide changes or when limitedProducts changes
  useEffect(() => {
    setCurrentSlide(0);
  }, [productsPerSlide, limitedProducts.length]);

  // Auto-advance functionality - only if there's more than 1 slide
  useEffect(() => {
    // Don't auto-advance if paused, only one slide, or invalid maxSlide
    if (isPaused || totalSlides <= 1 || maxSlide < 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start auto-advance timer
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = prev + 1;
        return next > maxSlide ? 0 : next;
      });
    }, 15000); // 15 seconds

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPaused, maxSlide, totalSlides]);

  const handlePrevious = () => {
    if (maxSlide < 0 || totalSlides <= 1) return;
    // Pause auto-advance when user manually navigates
    setIsPaused(true);
    setCurrentSlide((prev) => {
      const next = prev - 1;
      return next < 0 ? maxSlide : next;
    });
    // Clear timer on manual navigation
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleNext = () => {
    if (maxSlide < 0 || totalSlides <= 1) return;
    // Pause auto-advance when user manually navigates
    setIsPaused(true);
    setCurrentSlide((prev) => {
      const next = prev + 1;
      return next > maxSlide ? 0 : next;
    });
    // Clear timer on manual navigation
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Don't render if no products or less than 1 product
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="w-full mt-20 pt-12 border-t">
      <h2 className="text-4xl font-bold mb-4 text-center">
        {t(translationKeys.products.youMayAlsoLike, 'You May Also Like')}
      </h2>
      <div className="flex justify-center">
        <div
          ref={containerRef}
          className="relative max-w-7xl w-full"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Carousel Container - pb-1 + min-height avoid clipping card bottom border on first paint */}
          <div className="overflow-hidden pb-1 min-h-[260px]">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ 
                transform: `translateX(-${currentSlide * (100 / totalSlides)}%)`,
                width: `${totalSlides * 100}%`
              }}
            >
              {Array.from({ length: totalSlides }).map((_, slideIndex) => {
                const startIndex = slideIndex * productsPerSlide;
                const slideProducts = limitedProducts.slice(startIndex, startIndex + productsPerSlide);
                // Calculate max width: larger when there's space available
                // Use larger sizes when there's enough space, even if not all products fit
                const hasEnoughSpace = containerWidth >= 1024; // Large screens
                const maxWidth = allProductsFit 
                  ? (productsPerSlide === 1 ? '100%' : productsPerSlide === 3 ? '450px' : '300px')
                  : (productsPerSlide === 1 ? '100%' : hasEnoughSpace ? '300px' : '200px');
                
                return (
                  <div
                    key={slideIndex}
                    className="flex-shrink-0 flex justify-center items-start gap-2 sm:gap-4 px-2 sm:px-4"
                    style={{ width: `${100 / totalSlides}%` }}
                  >
                    {slideProducts.map((product) => {
                      // Calculate width based on products per slide
                      let productWidth = '100%';
                      if (productsPerSlide === 3) {
                        productWidth = 'calc(33.333% - 0.67rem)';
                      } else if (productsPerSlide === 2) {
                        productWidth = 'calc(50% - 0.5rem)';
                      }
                      
                      return (
                        <div key={product.id} className="flex-shrink-0" style={{ width: productWidth, maxWidth: maxWidth }}>
                          <ProductCardCompact product={product} />
                        </div>
                      );
                    })}
                    {/* Fill empty slots to maintain centering when less than expected products */}
                    {slideProducts.length < productsPerSlide && Array.from({ length: productsPerSlide - slideProducts.length }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="flex-shrink-0 hidden sm:block" style={{ width: productsPerSlide === 3 ? 'calc(33.333% - 0.67rem)' : '0px' }} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Arrows - Only show if there's more than one slide */}
          {totalSlides > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-background"
                onClick={handlePrevious}
                aria-label={t(translationKeys.products.previousProducts, 'Previous products')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-background"
                onClick={handleNext}
                aria-label={t(translationKeys.products.nextProducts, 'Next products')}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
