import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, NotFoundException, UsePipes, ValidationPipe, BadRequestException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(@Req() req: any, @Body() dto: CreateTaskDto) {
    if (!req.session || !req.session.userId) throw new BadRequestException('Not authenticated');
    return this.tasksService.create(req.session.userId, dto);
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.tasksService.findAllForUser(req.session.userId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const task = await this.tasksService.findOneForUser(req.session.userId, id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    const task = await this.tasksService.updateForUser(req.session.userId, id, dto);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const ok = await this.tasksService.removeForUser(req.session.userId, id);
    if (!ok) throw new NotFoundException('Task not found');
    return { success: true };
  }

  @Post('for-user/:userId')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createForUser(@Req() req: any, @Param('userId') userId: string, @Body() dto: CreateTaskDto) {
    if (!req.session || !req.session.userId) throw new BadRequestException('Not authenticated');
    return this.tasksService.createForUser(userId, dto);
  }
}
