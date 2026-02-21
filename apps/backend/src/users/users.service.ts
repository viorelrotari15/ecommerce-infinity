import { Injectable, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password: _, ...result } = user;
    return result;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto) {
    const data: Prisma.UserUpdateInput = {};
    if (updateProfileDto.firstName !== undefined) data.firstName = updateProfileDto.firstName;
    if (updateProfileDto.lastName !== undefined) data.lastName = updateProfileDto.lastName;
    if (updateProfileDto.phone !== undefined) data.phone = updateProfileDto.phone;
    if (updateProfileDto.defaultShippingAddress !== undefined) {
      data.defaultShippingAddress = updateProfileDto.defaultShippingAddress as unknown as Prisma.InputJsonValue;
    }
    if (updateProfileDto.defaultBillingAddress !== undefined) {
      data.defaultBillingAddress = updateProfileDto.defaultBillingAddress as unknown as Prisma.InputJsonValue;
    }
    if (Array.isArray(updateProfileDto.savedAddresses)) {
      data.savedAddresses = updateProfileDto.savedAddresses as unknown as Prisma.InputJsonValue;
    }
    if (Array.isArray(updateProfileDto.hiddenAddressKeys)) {
      data.hiddenAddressKeys = updateProfileDto.hiddenAddressKeys as unknown as Prisma.InputJsonValue;
    }
    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          defaultShippingAddress: true,
          defaultBillingAddress: true,
          savedAddresses: true,
          hiddenAddressKeys: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (err: any) {
      const message = err?.message ?? String(err);
      if (
        typeof message === 'string' &&
        (message.includes('savedAddresses') || message.includes('column') || message.includes('does not exist'))
      ) {
        throw new ServiceUnavailableException(
          'Database schema is outdated. Please run: npx prisma migrate deploy',
        );
      }
      throw err;
    }
  }
}

