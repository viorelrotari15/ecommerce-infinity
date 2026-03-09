import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
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
      const filePathRaw = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_FILE');
      const filePath = typeof filePathRaw === 'string' ? filePathRaw.replace(/^["']|["']$/g, '').trim() : undefined;
      if (filePath) {
        this.logger.log(`Firebase: FIREBASE_SERVICE_ACCOUNT_FILE="${filePath}" (length=${filePath.length})`);
        try {
          const exists = fs.existsSync(filePath);
          this.logger.log(`Firebase: file exists=${exists}`);
          if (!exists) {
            this.logger.warn(`Firebase: path does not exist in container; check volume mount ./.firebase-service-account.json:/app/.firebase-service-account.json`);
          }
          const raw = fs.readFileSync(filePath, 'utf-8');
          this.logger.log(`Firebase: file size=${raw.length} bytes`);
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          const hasKey = parsed && (typeof parsed.private_key === 'string' || typeof parsed.privateKey === 'string');
          if (hasKey) {
            serviceAccount = parsed as admin.ServiceAccount;
            source = 'FIREBASE_SERVICE_ACCOUNT_FILE';
            this.logger.log(`Firebase: service account loaded from file, project_id=${(parsed as { project_id?: string }).project_id ?? 'n/a'}`);
          } else {
            this.logger.warn(
              `Firebase: file read but no private_key in JSON (size=${raw.length}). Ensure .firebase-service-account.json on host has full service account from Firebase Console.`,
            );
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
        // PEM requires real newlines; JSON may have literal \n (backslash-n). Normalize so Firebase SDK accepts it.
        const sa = serviceAccount as Record<string, unknown>;
        const pk = (sa.privateKey ?? sa.private_key) as string | undefined;
        if (typeof pk === 'string' && pk.includes('\\n')) {
          sa.privateKey = pk.replace(/\\n/g, '\n');
          if (sa.private_key !== undefined) sa.private_key = sa.privateKey;
        }
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

  /**
   * Create an email/password user in Firebase Auth so that password reset (sendPasswordResetEmail) works.
   * Returns uid if successful, null otherwise (e.g. email already exists in Firebase).
   */
  async createUserWithEmailPassword(email: string, password: string): Promise<{ uid: string } | null> {
    if (!this.initialized) return null;
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        emailVerified: false,
      });
      return userRecord?.uid ? { uid: userRecord.uid } : null;
    } catch (e) {
      this.logger.warn(
        `Firebase createUser failed for ${email}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }

  /**
   * Get or create a Firebase Auth user for the given email (with a random password).
   * Used so that existing DB-only users can receive password reset emails.
   * Returns Firebase uid if the user exists or was created, null on failure.
   */
  async getOrCreateFirebaseUserForEmail(email: string): Promise<string | null> {
    if (!this.initialized) return null;
    const randomPassword = crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) + 'Aa1!';
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password: randomPassword,
        emailVerified: false,
      });
      return userRecord?.uid ?? null;
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === 'auth/email-already-exists') {
        try {
          const existing = await admin.auth().getUserByEmail(email);
          return existing?.uid ?? null;
        } catch {
          return null;
        }
      }
      this.logger.warn(
        `Firebase getOrCreateUser failed for ${email}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }
  }
}
