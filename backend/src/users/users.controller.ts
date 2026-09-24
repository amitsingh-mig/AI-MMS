import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Roles(Role.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  async updateRole(@Param('id') id: string, @Body('role') role: Role, @Request() req: any) {
    const res = await this.usersService.updateRole(id, role);
    await this.auditService.logAction('USER_ROLE_CHANGE', req.user.id, undefined, { targetUserId: id, newRole: role });
    return res;
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async deleteUser(@Param('id') id: string, @Request() req: any) {
    const res = await this.usersService.deleteUser(id);
    await this.auditService.logAction('USER_DELETE', req.user.id, undefined, { targetUserId: id });
    return res;
  }
}
