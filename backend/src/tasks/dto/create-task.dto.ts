import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string; // YYYY-MM-DD
  @IsOptional()
  @IsString()
  status?: 'todo' | 'inprogress' | 'done';
}
