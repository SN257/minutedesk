import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CenterService } from './center.service';
import { RoleService } from './role.service';

// Read-only lists any logged-in user needs (meeting center dropdown, role
// labels), backed by the same data the Admin Center manages — so changes
// made there show up here immediately, no redeploy required.
@Controller()
@UseGuards(AuthGuard)
export class PublicListsController {
  constructor(
    private readonly centerService: CenterService,
    private readonly roleService: RoleService,
  ) {}

  @Get('centers')
  async centers() {
    return this.centerService.listActive();
  }

  @Get('roles')
  async roles() {
    return this.roleService.list();
  }
}
