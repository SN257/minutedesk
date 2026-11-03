import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { SchemaService } from './schema.service';
import { UsersService } from '../users/users.service';
import { resolveUserIdFromRequest } from '../common/request-user.util';

@Controller('admin/schema')
@UseGuards(SuperAdminGuard)
export class SchemaController {
  constructor(
    private readonly schemaService: SchemaService,
    private readonly usersService: UsersService,
  ) {}

  @Get('tables')
  async listTables() {
    return this.schemaService.listTables();
  }

  @Get('tables/:table/columns')
  async getColumns(@Param('table') table: string) {
    return this.schemaService.getColumns(table);
  }

  @Post('tables')
  async createTable(@Req() req: any, @Body() body: { name: string; columns: { name: string; type: string; nullable: boolean; defaultValue?: string }[] }) {
    const userId = resolveUserIdFromRequest(req);
    const user = userId ? await this.usersService.findById(userId) : null;
    return this.schemaService.createTable(body.name, body.columns, user?.email);
  }

  @Delete('tables/:table')
  async dropTable(@Param('table') table: string) {
    await this.schemaService.dropTable(table);
    return { deleted: true };
  }

  @Post('tables/:table/columns')
  async addColumn(@Param('table') table: string, @Body() body: { name: string; type: string; nullable: boolean; defaultValue?: string }) {
    return this.schemaService.addColumn(table, body);
  }

  @Delete('tables/:table/columns/:column')
  async dropColumn(@Param('table') table: string, @Param('column') column: string) {
    return this.schemaService.dropColumn(table, column);
  }

  @Get('tables/:table/rows')
  async listRows(@Param('table') table: string, @Query('limit') limit?: string) {
    return this.schemaService.listRows(table, limit ? parseInt(limit, 10) : 100);
  }

  @Post('tables/:table/rows')
  async createRow(@Param('table') table: string, @Body() body: Record<string, any>) {
    return this.schemaService.createRow(table, body);
  }

  @Patch('tables/:table/rows/:id')
  async updateRow(@Param('table') table: string, @Param('id') id: string, @Body() body: Record<string, any>) {
    return this.schemaService.updateRow(table, id, body);
  }

  @Delete('tables/:table/rows/:id')
  async deleteRow(@Param('table') table: string, @Param('id') id: string) {
    await this.schemaService.deleteRow(table, id);
    return { deleted: true };
  }
}
