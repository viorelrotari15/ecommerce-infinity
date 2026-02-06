'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCarouselSlides } from '@/lib/hooks/use-carousel';
import { useT, translationKeys } from '@/lib/utils/translations';

const LOGO_SLIDE_SRC = '/branding/full_logo.svg';
const AUTO_ADVANCE_MS = 15000; // Same as similar-products-carousel (15 seconds)

export function AdvertisementCarousel() {
  const t = useT();
  const { data: slides = [], isLoading } = useCarouselSlides();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSlides = 1 + slides.length;
  const maxSlide = Math.max(0, totalSlides - 1);

  // Auto-advance functionality - only if there's more than 1 slide (same logic as similar-products-carousel)
  useEffect(() => {
    if (isPaused || totalSlides <= 1 || maxSlide < 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = prev + 1;
        return next > maxSlide ? 0 : next;
      });
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPaused, maxSlide, totalSlides]);

  const handlePrevious = () => {
    if (maxSlide < 0 || totalSlides <= 1) return;
    setIsPaused(true);
    setCurrentSlide((prev) => {
      const next = prev - 1;
      return next < 0 ? maxSlide : next;
    });
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleNext = () => {
    if (maxSlide < 0 || totalSlides <= 1) return;
    setIsPaused(true);
    setCurrentSlide((prev) => {
      const next = prev + 1;
      return next > maxSlide ? 0 : next;
    });
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  if (isLoading) return null;

  return (
    <section className="w-full overflow-hidden" aria-label="Advertisement carousel">
      <div
        className="relative w-full"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${currentSlide * (100 / totalSlides)}%)`,
              width: `${totalSlides * 100}%`,
            }}
          >
            {/* First slide: logo (no link) */}
            <div
              className="flex-shrink-0 flex items-center justify-center bg-muted/30"
              style={{ width: `${100 / totalSlides}%` }}
            >
              <div className="relative w-full aspect-[5/2] min-h-[180px] md:min-h-[280px] flex items-center justify-center p-4 md:p-8">
                <Image
                  src={LOGO_SLIDE_SRC}
                  alt=""
                  fill
                  className="object-contain object-center"
                  priority
                  sizes="100vw"
                />
              </div>
            </div>

            {/* Admin slides */}
            {slides.map((slide) => {
              const content = (
                <div className="relative w-full h-full min-h-[180px] md:min-h-[280px] aspect-[5/2] bg-muted">
                  <picture className="block w-full h-full">
                    {slide.mobileUrl && (
                      <source
                        media="(max-width: 767px)"
                        srcSet={slide.mobileUrl}
                      />
                    )}
                    <img
                      src={slide.desktopUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      sizes="100vw"
                    />
                  </picture>
                </div>
              );

              return (
                <div
                  key={slide.id}
                  className="flex-shrink-0 flex flex-col"
                  style={{ width: `${100 / totalSlides}%` }}
                >
                  {slide.link ? (
                    <Link
                      href={slide.link}
                      className="block w-full flex-1 min-h-0"
                      target={slide.link.startsWith('http') ? '_blank' : undefined}
                      rel={slide.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {totalSlides > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-background"
              onClick={handlePrevious}
              aria-label={t(translationKeys.carousel.previousSlide, 'Previous slide')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg hover:bg-background"
              onClick={handleNext}
              aria-label={t(translationKeys.carousel.nextSlide, 'Next slide')}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
