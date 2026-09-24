import { Injectable, UnauthorizedException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedInitialUsers();
  }

  private async seedInitialUsers() {
    try {
      const adminCount = await this.prisma.user.count({ where: { role: Role.ADMIN } });
      if (adminCount === 0) {
        this.logger.log('Seeding initial default users (Admin, Manager, User)...');
        const salt = await bcrypt.genSalt(10);
        
        await this.prisma.user.createMany({
          data: [
            {
              email: 'admin@aimms.com',
              name: 'System Admin',
              passwordHash: await bcrypt.hash('Admin@123', salt),
              role: Role.ADMIN,
            },
            {
              email: 'manager@aimms.com',
              name: 'Media Manager',
              passwordHash: await bcrypt.hash('Manager@123', salt),
              role: Role.MANAGER,
            },
            {
              email: 'user@aimms.com',
              name: 'Standard User',
              passwordHash: await bcrypt.hash('User@123', salt),
              role: Role.USER,
            },
          ],
          skipDuplicates: true,
        });
        this.logger.log('Seeded default users successfully.');
      }
    } catch (err: any) {
      this.logger.warn(`Could not seed initial users: ${err.message}`);
    }
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(pass, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(name: string, email: string, pass: string, role: Role = Role.USER) {
    const existing = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      throw new BadRequestException('User already exists with this email');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(pass, salt);

    const user = await this.prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
      },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
