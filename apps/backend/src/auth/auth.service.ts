import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { FirebaseService } from './firebase.service';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private firebaseService: FirebaseService,
  ) {}

  isFirebaseConfigured(): boolean {
    return this.firebaseService.isConfigured();
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user?.password) return null;
    if (await bcrypt.compare(password, user.password)) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Verify Firebase ID token and find or create user. Stores Firebase data (email, name, picture) in DB.
   */
  async loginWithFirebaseToken(idToken: string): Promise<{ access_token: string; user: any } | null> {
    if (!this.firebaseService.isConfigured()) return null;
    const decoded = await this.firebaseService.verifyIdToken(idToken);
    if (!decoded?.uid) return null;

    let user = await this.usersService.findByFirebaseUid(decoded.uid);
    if (user) {
      const { password: _, ...result } = user;
      return this.login(result);
    }

    const email = decoded.email || `${decoded.uid}@firebase.local`;
    const existingByEmail = await this.usersService.findByEmail(email);
    if (existingByEmail) {
      await this.usersService.linkFirebaseUid(existingByEmail.id, decoded.uid, decoded.picture);
      const updated = await this.usersService.findByFirebaseUid(decoded.uid);
      if (updated) {
        const { password: __, ...result } = updated;
        return this.login(result);
      }
    }

    const nameParts = (decoded.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || undefined;
    const lastName = nameParts.slice(1).join(' ') || undefined;
    const newUser = await this.usersService.createFirebaseUser({
      email,
      firebaseUid: decoded.uid,
      firstName,
      lastName,
      avatarUrl: decoded.picture,
    });
    const { password: __, ...result } = newUser;
    return this.login(result);
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    };
  }

  async register(email: string, password: string, firstName?: string, lastName?: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });
    // Create same user in Firebase so forgot-password (sendPasswordResetEmail) works
    if (this.firebaseService.isConfigured()) {
      const firebaseUser = await this.firebaseService.createUserWithEmailPassword(email, password);
      if (firebaseUser?.uid) {
        await this.usersService.linkFirebaseUid(user.id, firebaseUser.uid);
        const updated = await this.usersService.findByEmail(email);
        if (updated) return this.login(updated);
      }
    }
    return this.login(user);
  }

  async createAdmin(email: string, password: string, firstName?: string, lastName?: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'ADMIN',
    });
    return this.login(user);
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  /**
   * Ensure the user exists in Firebase Auth so the client can send a password reset email.
   * If the user exists in our DB but has no firebaseUid, create them in Firebase (with a random password) and link.
   * Always returns without throwing (no info leak about whether the email exists).
   */
  async ensureFirebaseUserForPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.firebaseUid) return;
    if (!this.firebaseService.isConfigured()) return;
    const uid = await this.firebaseService.getOrCreateFirebaseUserForEmail(email);
    if (uid) {
      await this.usersService.linkFirebaseUid(user.id, uid);
    }
  }
}

