import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class EvaluateQcDto {
  @IsString()
  @IsNotEmpty()
  mediaPath: string;

  @IsString()
  @IsOptional()
  audioPath?: string;

  @IsNumber()
  @Min(1.0)
  @IsOptional()
  targetDurationSeconds?: number;

  @IsString()
  @IsOptional()
  expectedChecksum?: string;

  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;
}
