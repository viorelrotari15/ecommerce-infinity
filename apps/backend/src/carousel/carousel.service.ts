import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const MAX_SLIDES = 9;
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
];

@Injectable()
export class CarouselService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  private validateImageFile(file: Express.Multer.File | undefined) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Desktop image is required');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  private getFileExtension(originalname: string): string {
    return path.extname(originalname) || '.jpg';
  }

  async findAll() {
    const slides = await this.prisma.carouselSlide.findMany({
      orderBy: { order: 'asc' },
    });
    const bucket = this.storageService.getBucketName();
    return slides.map((slide) => ({
      id: slide.id,
      order: slide.order,
      link: slide.link,
      desktopUrl: this.storageService.getPublicUrl(
        bucket,
        slide.desktopFilepath,
      ),
      mobileUrl: slide.mobileFilepath
        ? this.storageService.getPublicUrl(bucket, slide.mobileFilepath)
        : null,
    }));
  }

  async findAllAdmin() {
    const slides = await this.prisma.carouselSlide.findMany({
      orderBy: { order: 'asc' },
    });
    const bucket = this.storageService.getBucketName();
    return slides.map((slide) => ({
      id: slide.id,
      order: slide.order,
      link: slide.link,
      desktopFilepath: slide.desktopFilepath,
      mobileFilepath: slide.mobileFilepath,
      desktopUrl: this.storageService.getPublicUrl(
        bucket,
        slide.desktopFilepath,
      ),
      mobileUrl: slide.mobileFilepath
        ? this.storageService.getPublicUrl(bucket, slide.mobileFilepath)
        : null,
      createdAt: slide.createdAt,
      updatedAt: slide.updatedAt,
    }));
  }

  async create(
    dto: { link?: string },
    fileDesktop: Express.Multer.File,
    fileMobile?: Express.Multer.File,
  ) {
    const count = await this.prisma.carouselSlide.count();
    if (count >= MAX_SLIDES) {
      throw new BadRequestException(
        `Maximum of ${MAX_SLIDES} advertisement slides reached. Delete or edit an existing slide to add a new one.`,
      );
    }

    this.validateImageFile(fileDesktop);
    if (fileMobile) {
      if (!fileMobile.buffer) {
        throw new BadRequestException('Invalid mobile image file');
      }
      if (!ALLOWED_MIME_TYPES.includes(fileMobile.mimetype)) {
        throw new BadRequestException(
          `Invalid mobile file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        );
      }
    }

    const bucket = this.storageService.getBucketName();
    const prefix = `carousel/${uuidv4()}`;
    const desktopExt = this.getFileExtension(fileDesktop.originalname);
    const desktopFilepath = `${prefix}_desktop${desktopExt}`;

    await this.storageService.uploadFile({
      bucket,
      filepath: desktopFilepath,
      file: fileDesktop.buffer,
      mimeType: fileDesktop.mimetype,
    });

    let mobileFilepath: string | null = null;
    if (fileMobile?.buffer) {
      const mobileExt = this.getFileExtension(fileMobile.originalname);
      mobileFilepath = `${prefix}_mobile${mobileExt}`;
      await this.storageService.uploadFile({
        bucket,
        filepath: mobileFilepath,
        file: fileMobile.buffer,
        mimeType: fileMobile.mimetype,
      });
    }

    const slide = await this.prisma.carouselSlide.create({
      data: {
        order: count,
        link: dto.link || null,
        bucket,
        desktopFilepath,
        mobileFilepath,
      },
    });

    return {
      id: slide.id,
      order: slide.order,
      link: slide.link,
      desktopUrl: this.storageService.getPublicUrl(bucket, slide.desktopFilepath),
      mobileUrl: slide.mobileFilepath
        ? this.storageService.getPublicUrl(bucket, slide.mobileFilepath)
        : null,
    };
  }

  async update(
    id: string,
    dto: { link?: string },
    fileDesktop?: Express.Multer.File,
    fileMobile?: Express.Multer.File,
  ) {
    const slide = await this.prisma.carouselSlide.findUnique({
      where: { id },
    });
    if (!slide) {
      throw new NotFoundException(`Carousel slide with ID ${id} not found`);
    }

    const bucket = this.storageService.getBucketName();
    let desktopFilepath = slide.desktopFilepath;
    let mobileFilepath = slide.mobileFilepath;

    if (fileDesktop?.buffer) {
      if (!ALLOWED_MIME_TYPES.includes(fileDesktop.mimetype)) {
        throw new BadRequestException(
          `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        );
      }
      await this.storageService.deleteFile(bucket, slide.desktopFilepath);
      const ext = this.getFileExtension(fileDesktop.originalname);
      desktopFilepath = `carousel/${uuidv4()}_desktop${ext}`;
      await this.storageService.uploadFile({
        bucket,
        filepath: desktopFilepath,
        file: fileDesktop.buffer,
        mimeType: fileDesktop.mimetype,
      });
    }

    if (fileMobile?.buffer) {
      if (slide.mobileFilepath) {
        await this.storageService.deleteFile(bucket, slide.mobileFilepath);
      }
      if (!ALLOWED_MIME_TYPES.includes(fileMobile.mimetype)) {
        throw new BadRequestException(
          `Invalid mobile file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        );
      }
      const ext = this.getFileExtension(fileMobile.originalname);
      mobileFilepath = `carousel/${uuidv4()}_mobile${ext}`;
      await this.storageService.uploadFile({
        bucket,
        filepath: mobileFilepath,
        file: fileMobile.buffer,
        mimeType: fileMobile.mimetype,
      });
    }

    const updated = await this.prisma.carouselSlide.update({
      where: { id },
      data: {
        ...(dto.link !== undefined && { link: dto.link || null }),
        desktopFilepath,
        mobileFilepath,
      },
    });

    return {
      id: updated.id,
      order: updated.order,
      link: updated.link,
      desktopUrl: this.storageService.getPublicUrl(bucket, updated.desktopFilepath),
      mobileUrl: updated.mobileFilepath
        ? this.storageService.getPublicUrl(bucket, updated.mobileFilepath)
        : null,
    };
  }

  async remove(id: string) {
    const slide = await this.prisma.carouselSlide.findUnique({
      where: { id },
    });
    if (!slide) {
      throw new NotFoundException(`Carousel slide with ID ${id} not found`);
    }

    const bucket = this.storageService.getBucketName();
    await this.storageService.deleteFile(bucket, slide.desktopFilepath);
    if (slide.mobileFilepath) {
      await this.storageService.deleteFile(bucket, slide.mobileFilepath);
    }

    await this.prisma.carouselSlide.delete({
      where: { id },
    });

    const slides = await this.prisma.carouselSlide.findMany({
      orderBy: { order: 'asc' },
    });
    for (let i = 0; i < slides.length; i++) {
      await this.prisma.carouselSlide.update({
        where: { id: slides[i].id },
        data: { order: i },
      });
    }

    return { message: 'Carousel slide deleted successfully' };
  }
}
