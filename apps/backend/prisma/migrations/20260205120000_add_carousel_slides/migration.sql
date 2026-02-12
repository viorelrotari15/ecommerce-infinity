-- CreateTable
CREATE TABLE "carousel_slides" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "link" TEXT,
    "bucket" TEXT NOT NULL,
    "desktopFilepath" TEXT NOT NULL,
    "mobileFilepath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carousel_slides_pkey" PRIMARY KEY ("id")
);
