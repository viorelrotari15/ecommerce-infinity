'use client';

import { useState, useRef, useEffect, MouseEvent } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductImage {
  filepath?: string;
  url: string;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
  primaryImage?: string;
}

export function ProductImageGallery({
  images,
  productName,
  primaryImage,
}: ProductImageGalleryProps) {
  // Initialize with primary image or first image
  const initialImageIndex = primaryImage
    ? images.findIndex((img) => img.url === primaryImage)
    : 0;
  const [selectedIndex, setSelectedIndex] = useState(
    initialImageIndex >= 0 ? initialImageIndex : 0
  );
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isOverImage, setIsOverImage] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });

  const currentImage = images[selectedIndex] || images[0];

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
    setIsZooming(false);
    setImageLoaded(false);
  };

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setIsZooming(false);
    setImageLoaded(false);
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setIsZooming(false);
    setImageLoaded(false);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current || !imageWrapperRef.current) return;

    const containerRect = imageContainerRef.current.getBoundingClientRect();
    const imgElement = imageWrapperRef.current.querySelector('img');
    if (!imgElement) return;

    const imgRect = imgElement.getBoundingClientRect();
    
    // Check if mouse is over the actual image (not just the container)
    const isOverImg = 
      e.clientX >= imgRect.left && 
      e.clientX <= imgRect.right &&
      e.clientY >= imgRect.top && 
      e.clientY <= imgRect.bottom;
    
    setIsOverImage(isOverImg);
    
    // Update mouse position for magnifying glass
    setMousePosition({ 
      x: e.clientX - containerRect.left, 
      y: e.clientY - containerRect.top 
    });
    
    // Calculate position relative to the actual displayed image for zoom
    const x = ((e.clientX - imgRect.left) / imgRect.width) * 100;
    const y = ((e.clientY - imgRect.top) / imgRect.height) * 100;

    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    setZoomPosition({ x: clampedX, y: clampedY });
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
  };

  // When image is already cached, load event can fire before onLoad is attached — sync state from DOM
  useEffect(() => {
    const img = imageWrapperRef.current?.querySelector('img');
    if (img?.complete && img.naturalWidth > 0) {
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
    }
  }, [selectedIndex, currentImage?.url]);

  if (!currentImage || images.length === 0) {
    return (
      <div className="relative w-full max-h-[600px] min-h-[400px] overflow-hidden rounded-lg bg-background border border-border flex items-center justify-center">
        <span className="text-muted-foreground">No Image</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div
        ref={imageContainerRef}
        className={`relative w-full max-h-[600px] min-h-[400px] overflow-hidden rounded-lg bg-background border border-border flex items-center justify-center ${isZooming && imageLoaded ? 'cursor-zoom-in' : ''}`}
        onMouseEnter={() => setIsZooming(true)}
        onMouseLeave={() => {
          setIsZooming(false);
          setIsOverImage(false);
        }}
        onMouseMove={handleMouseMove}
      >
        {currentImage.url && currentImage.url !== '/placeholder-image.jpg' ? (
          <>
            {/* Main Image - Preserves aspect ratio, displays at natural size if smaller */}
            <div ref={imageWrapperRef} className="relative w-full h-full flex items-center justify-center">
              <img
                src={currentImage.url}
                alt={productName}
                className="max-w-full max-h-full w-auto h-auto"
                style={{ maxHeight: '600px' }}
                onLoad={handleImageLoad}
              />
            </div>

            {/* Zoom Indicator - Only show when image is loaded and hovering over container but not image */}
            {isZooming && imageLoaded && !isOverImage && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-medium shadow-lg backdrop-blur-sm">
                  <ZoomIn className="h-4 w-4" />
                  <span>Hover over image to zoom</span>
                </div>
              </div>
            )}

            {/* Magnifying Glass / Zoom View - Follows mouse cursor, only when over image */}
            {isZooming && imageLoaded && isOverImage && imageNaturalSize.width > 0 && (
              <div
                className="pointer-events-none absolute z-20 hidden border-2 border-primary bg-background shadow-2xl md:block"
                style={{
                  width: '300px',
                  height: '300px',
                  left: `${mousePosition.x}px`,
                  top: `${mousePosition.y}px`,
                  transform: 'translate(-50%, -50%)',
                  backgroundImage: `url(${currentImage.url})`,
                  backgroundSize: `${imageNaturalSize.width * 2}px ${imageNaturalSize.height * 2}px`,
                  backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                  backgroundRepeat: 'no-repeat',
                  borderRadius: '8px',
                }}
              />
            )}

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 z-30 h-10 w-10 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
                  onClick={handlePrevious}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 z-30 h-10 w-10 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
                  onClick={handleNext}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-muted-foreground">No Image</span>
          </div>
        )}
      </div>

      {/* Thumbnail Grid */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-4">
          {images.map((image, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleThumbnailClick(idx)}
              className={`relative aspect-square overflow-hidden rounded-lg bg-background border border-border transition-all ${
                selectedIndex === idx
                  ? 'ring-2 ring-primary ring-offset-2'
                  : 'hover:opacity-80'
              }`}
              aria-label={`View image ${idx + 1}`}
            >
              <Image
                src={image.url}
                alt={`${productName} ${idx + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
