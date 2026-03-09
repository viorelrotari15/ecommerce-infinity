import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Patch,
  Request,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { FirebaseLoginDto } from './dto/firebase-login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

const FIREBASE_NOT_CONFIGURED_MSG =
  'Firebase auth is not configured on the server. Set FIREBASE_PROJECT_ID and either FIREBASE_SERVICE_ACCOUNT_FILE (path to .firebase-service-account.json) or FIREBASE_SERVICE_ACCOUNT (JSON string). Use setup-server.sh option 19 to configure, then restart the backend.';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      this.logger.warn('Login failed: invalid credentials');
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('firebase')
  @ApiOperation({ summary: 'Login with Firebase ID token (Google, Facebook, etc. via Firebase Auth)' })
  async loginWithFirebase(@Body() dto: FirebaseLoginDto) {
    if (!this.authService.isFirebaseConfigured()) {
      this.logger.warn(`POST /auth/firebase rejected: ${FIREBASE_NOT_CONFIGURED_MSG}`);
      throw new UnauthorizedException(FIREBASE_NOT_CONFIGURED_MSG);
    }
    const result = await this.authService.loginWithFirebaseToken(dto.idToken);
    if (!result) {
      this.logger.warn('POST /auth/firebase rejected: invalid or expired Firebase token');
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }
    return result;
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Ensure user exists in Firebase so client can send password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.ensureFirebaseUserForPasswordReset(dto.email);
    return { ok: true };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.firstName,
      registerDto.lastName,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, updateProfileDto);
  }

  @Post('create-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create admin account (Admin only)' })
  async createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.authService.createAdmin(
      createAdminDto.email,
      createAdminDto.password,
      createAdminDto.firstName,
      createAdminDto.lastName,
    );
  }
}

