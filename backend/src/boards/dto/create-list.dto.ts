import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator';

export class CreateListDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
