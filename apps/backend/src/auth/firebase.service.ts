import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as admin from 'firebase-admin';

export interface FirebaseDecodedToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
  private initialized = false;
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    let projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    let serviceAccount: admin.ServiceAccount | null = null;
    let source = 'none';

    if (projectId) {
      this.logger.log(`Firebase: FIREBASE_PROJECT_ID is set (projectId=${projectId})`);
    } else {
      this.logger.log('Firebase: FIREBASE_PROJECT_ID is not set');
    }

    const configJson = this.configService.get<string>('FIREBASE_CONFIG');
    if (configJson && typeof configJson === 'string') {
      try {
        const parsed = JSON.parse(configJson) as Record<string, unknown>;
        const fc = (parsed.firebaseConfig ?? parsed) as Record<string, unknown> | undefined;
        const sa = parsed.serviceAccount as Record<string, unknown> | undefined;
        if (fc && typeof fc.projectId === 'string') projectId = fc.projectId;
        const hasKey = sa && (typeof sa.private_key === 'string' || typeof sa.privateKey === 'string');
        if (hasKey) {
          serviceAccount = sa as admin.ServiceAccount;
          source = 'FIREBASE_CONFIG';
          this.logger.log('Firebase: service account loaded from FIREBASE_CONFIG');
        }
      } catch {
        this.logger.warn('Firebase: FIREBASE_CONFIG present but invalid JSON');
      }
    }
    if (!serviceAccount) {
      const filePath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_FILE');
      if (filePath) {
        this.logger.log(`Firebase: FIREBASE_SERVICE_ACCOUNT_FILE=${filePath}`);
        try {
          const exists = fs.existsSync(filePath);
          this.logger.log(`Firebase: file exists=${exists}`);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          const hasKey = parsed && (typeof parsed.private_key === 'string' || typeof parsed.privateKey === 'string');
          if (hasKey) {
            serviceAccount = parsed as admin.ServiceAccount;
            source = 'FIREBASE_SERVICE_ACCOUNT_FILE';
            this.logger.log(`Firebase: service account loaded from file, project_id=${(parsed as { project_id?: string }).project_id ?? 'n/a'}`);
          } else {
            this.logger.warn('Firebase: file read but no private_key in JSON (empty or invalid object)');
          }
        } catch (e) {
          this.logger.warn(`Firebase: failed to read/parse file: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        this.logger.log('Firebase: FIREBASE_SERVICE_ACCOUNT_FILE is not set');
      }
      if (!serviceAccount) {
        const cred = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');
        if (cred) {
          try {
            serviceAccount = JSON.parse(cred) as admin.ServiceAccount;
            source = 'FIREBASE_SERVICE_ACCOUNT';
            this.logger.log('Firebase: service account loaded from FIREBASE_SERVICE_ACCOUNT (inline)');
          } catch {
            this.logger.warn('Firebase: FIREBASE_SERVICE_ACCOUNT present but invalid JSON');
          }
        } else {
          this.logger.log('Firebase: FIREBASE_SERVICE_ACCOUNT is not set');
        }
      }
    } else {
      this.logger.log(`Firebase: service account loaded from ${source}`);
    }
    const resolvedProjectId = projectId || serviceAccount?.projectId || (serviceAccount as Record<string, unknown> | undefined)?.project_id as string | undefined;
    if (serviceAccount && resolvedProjectId) {
      try {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: resolvedProjectId,
          });
        }
        this.initialized = true;
        this.logger.log(`Firebase: initialized successfully (source=${source}, projectId=${resolvedProjectId})`);
      } catch (e) {
        this.initialized = false;
        this.logger.error(`Firebase: initializeApp failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      this.logger.warn(
        `Firebase: not configured. serviceAccount=${!!serviceAccount}, resolvedProjectId=${resolvedProjectId ?? 'missing'}`,
      );
    }
  }

  isConfigured(): boolean {
    return this.initialized;
  }

  async verifyIdToken(idToken: string): Promise<FirebaseDecodedToken | null> {
    if (!this.initialized) return null;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      };
    } catch {
      return null;
    }
  }
}
