import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    let projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    let serviceAccount: admin.ServiceAccount | null = null;

    const configJson = this.configService.get<string>('FIREBASE_CONFIG');
    if (configJson && typeof configJson === 'string') {
      try {
        const parsed = JSON.parse(configJson) as Record<string, unknown>;
        const fc = (parsed.firebaseConfig ?? parsed) as Record<string, unknown> | undefined;
        const sa = parsed.serviceAccount as Record<string, unknown> | undefined;
        if (fc && typeof fc.projectId === 'string') projectId = fc.projectId;
        // Firebase JSON uses snake_case; TypeScript ServiceAccount uses camelCase
        const hasKey = sa && (typeof sa.private_key === 'string' || typeof sa.privateKey === 'string');
        if (hasKey) serviceAccount = sa as admin.ServiceAccount;
      } catch {
        // ignore invalid FIREBASE_CONFIG
      }
    }
    if (!serviceAccount) {
      const cred = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');
      if (cred) {
        try {
          serviceAccount = JSON.parse(cred) as admin.ServiceAccount;
        } catch {
          serviceAccount = null;
        }
      }
    }
    if (serviceAccount && projectId) {
      try {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: projectId || serviceAccount.projectId || (serviceAccount as Record<string, unknown>).project_id as string,
          });
        }
        this.initialized = true;
      } catch {
        this.initialized = false;
      }
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
