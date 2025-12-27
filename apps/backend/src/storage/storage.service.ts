import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

export interface UploadFileOptions {
  bucket: string;
  filepath: string;
  file: Buffer;
  mimeType: string;
}

export interface FileMetadata {
  bucket: string;
  filepath: string;
  filename: string;
  size: number;
  mimeType: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: Minio.Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin');

    this.bucketName = this.configService.get<string>('MINIO_BUCKET', 'products');
    this.publicUrl = this.configService.get<string>('MINIO_PUBLIC_URL', `http://localhost:9000`);

    this.minioClient = new Minio.Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    });

    this.logger.log(`MinIO client initialized: ${endpoint}:${port}`);
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket '${this.bucketName}' created`);
      } else {
        this.logger.log(`Bucket '${this.bucketName}' already exists`);
      }
    } catch (error) {
      this.logger.error(`Error ensuring bucket exists: ${error.message}`, error.stack);
      throw error;
    }
  }

  async uploadFile(options: UploadFileOptions): Promise<FileMetadata> {
    const { bucket, filepath, file, mimeType } = options;

    try {
      await this.minioClient.putObject(bucket, filepath, file, file.length, {
        'Content-Type': mimeType,
      });

      const filename = filepath.split('/').pop() || 'unknown';
      const size = file.length;

      this.logger.log(`File uploaded: ${bucket}/${filepath}`);

      return {
        bucket,
        filepath,
        filename,
        size,
        mimeType,
      };
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async deleteFile(bucket: string, filepath: string): Promise<void> {
    try {
      await this.minioClient.removeObject(bucket, filepath);
      this.logger.log(`File deleted: ${bucket}/${filepath}`);
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`, error.stack);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async deleteFiles(bucket: string, filepaths: string[]): Promise<void> {
    try {
      await this.minioClient.removeObjects(bucket, filepaths);
      this.logger.log(`Files deleted: ${filepaths.length} files from ${bucket}`);
    } catch (error) {
      this.logger.error(`Error deleting files: ${error.message}`, error.stack);
      throw new Error(`Failed to delete files: ${error.message}`);
    }
  }

  getPublicUrl(bucket: string, filepath: string): string {
    // In development: http://localhost:9000/products/...
    // In production: https://cdn.myshop.com/products/...
    
    // Remove bucket name from filepath if it's already there (for backward compatibility)
    let cleanPath = filepath;
    if (filepath.startsWith(`${bucket}/`)) {
      cleanPath = filepath.slice(bucket.length + 1);
    }
    
    if (this.publicUrl.includes('cdn.') || this.publicUrl.includes('https://')) {
      // Production CDN URL
      return `${this.publicUrl}/${bucket}/${cleanPath}`;
    }
    // Development MinIO direct URL
    return `${this.publicUrl}/${bucket}/${cleanPath}`;
  }

  getBucketName(): string {
    return this.bucketName;
  }
}

