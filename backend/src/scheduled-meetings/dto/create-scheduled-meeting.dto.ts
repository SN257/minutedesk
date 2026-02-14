import { IsString, IsInt, IsArray, IsOptional, IsDateString } from 'class-validator';

export class CreateScheduledMeetingDto {
  @IsDateString()
  date: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsInt()
  duration: number;

  @IsOptional()
  @IsString()
  meetingType?: string;

  @IsOptional()
  @IsString()
  center?: string;

  @IsInt()
  participants: number;

  @IsOptional()
  @IsArray()
  agenda?: string[];
}
