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
    if (!this.prisma.isConnected) {
      this.logger.warn('PostgreSQL DB disconnected: skipping seedInitialUsers.');
      return;
    }
    try {
      const salt = await bcrypt.genSalt(10);
      const passHashAdmin1 = await bcrypt.hash('AdminPassword123!', salt);
      const passHashAdmin2 = await bcrypt.hash('Admin@123', salt);
      const passHashMgr1 = await bcrypt.hash('ManagerPassword123!', salt);
      const passHashMgr2 = await bcrypt.hash('Manager@123', salt);
      const passHashUser1 = await bcrypt.hash('UserPassword123!', salt);
      const passHashUser2 = await bcrypt.hash('User@123', salt);

      const defaultUsers = [
        { email: 'admin@pixai.com', name: 'System Admin', passwordHash: passHashAdmin1, role: Role.ADMIN },
        { email: 'admin@aimms.com', name: 'System Admin', passwordHash: passHashAdmin2, role: Role.ADMIN },
        { email: 'manager@pixai.com', name: 'Media Manager', passwordHash: passHashMgr1, role: Role.MANAGER },
        { email: 'manager@aimms.com', name: 'Media Manager', passwordHash: passHashMgr2, role: Role.MANAGER },
        { email: 'user@pixai.com', name: 'Standard User', passwordHash: passHashUser1, role: Role.USER },
        { email: 'user@aimms.com', name: 'Standard User', passwordHash: passHashUser2, role: Role.USER },
      ];

      for (const u of defaultUsers) {
        const existing = await this.prisma.user.findUnique({ where: { email: u.email } });
        if (!existing) {
          await this.prisma.user.create({ data: u });
        }
      }
      this.logger.log('Seeded default users successfully.');
    } catch (err: any) {
      this.logger.warn(`Could not seed initial users: ${err.message}`);
    }
  }

  async login(email: string, pass: string) {
    const cleanEmail = email.toLowerCase().trim();

    // --- DB-connected path: real password verification ---
    if (this.prisma.isConnected) {
      try {
        const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });

        if (!user) {
          throw new UnauthorizedException('Invalid email or password.');
        }

        const passwordValid = await bcrypt.compare(pass, user.passwordHash);
        if (!passwordValid) {
          throw new UnauthorizedException('Invalid email or password.');
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
      } catch (err: any) {
        // Re-throw auth errors directly
        if (err instanceof UnauthorizedException) throw err;
        // DB error: fall through to offline fallback
        this.logger.warn(`DB login error, attempting offline fallback: ${err.message}`);
      }
    }

    // --- DB-offline fallback: check known seeded credentials ---
    this.logger.warn('PostgreSQL DB offline: attempting offline credential fallback for login.');

    const offlineAccounts: { email: string; password: string; name: string; role: Role; id: string }[] = [
      { email: 'admin@pixai.com', password: 'AdminPassword123!', name: 'System Admin', role: Role.ADMIN, id: 'usr_admin_pixai' },
      { email: 'admin@aimms.com', password: 'Admin@123', name: 'System Admin', role: Role.ADMIN, id: 'usr_admin_aimms' },
      { email: 'manager@pixai.com', password: 'ManagerPassword123!', name: 'Media Manager', role: Role.MANAGER, id: 'usr_manager_pixai' },
      { email: 'manager@aimms.com', password: 'Manager@123', name: 'Media Manager', role: Role.MANAGER, id: 'usr_manager_aimms' },
      { email: 'user@pixai.com', password: 'UserPassword123!', name: 'Standard User', role: Role.USER, id: 'usr_user_pixai' },
      { email: 'user@aimms.com', password: 'User@123', name: 'Standard User', role: Role.USER, id: 'usr_user_aimms' },
    ];

    const match = offlineAccounts.find(
      (a) => a.email === cleanEmail && a.password === pass,
    );

    if (!match) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = { sub: match.id, email: match.email, role: match.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: match.id,
        email: match.email,
        name: match.name,
        role: match.role,
      },
    };
  }



  async register(name: string, email: string, pass: string, role: Role = Role.USER) {
    const cleanEmail = email.toLowerCase().trim();

    if (!this.prisma.isConnected) {
      this.logger.warn(`PostgreSQL DB disconnected: registering ${cleanEmail} via Direct Auth mode.`);
      const id = 'usr_' + Date.now();
      const payload = { sub: id, email: cleanEmail, role };
      return {
        accessToken: this.jwtService.sign(payload),
        user: {
          id,
          email: cleanEmail,
          name,
          role,
        },
      };
    }

    const existing = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      throw new BadRequestException('User already exists with this email');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(pass, salt);

    const user = await this.prisma.user.create({
      data: {
        name,
        email: cleanEmail,
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
