import { Controller, Get, Post, Put, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles('admin')
  @Post()
  async create(
    @Body() body: { email: string; password: string; name: string; role: string },
    @Request() req: any,
  ) {
    return this.usersService.create(body, req.user.id);
  }

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Roles('admin')
  @Put(':id/toggle')
  async toggle(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
    @Request() req: any,
  ) {
    return this.usersService.toggleActive(id, body.isActive, req.user.id);
  }
}
