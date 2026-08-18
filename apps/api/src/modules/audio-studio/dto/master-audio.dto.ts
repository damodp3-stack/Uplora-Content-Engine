import { IsString, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum LoudnessProfileDto {
  REELS = 'REELS',     // -16 LUFS
  SHORTS = 'SHORTS',   // -14 LUFS
  PODCAST = 'PODCAST', // -18 LUFS
  CUSTOM = 'CUSTOM',
}

export class SfxCueDto {
  @IsString()
  @IsOptional()
  sfxId?: string;

  @IsNumber()
  @Min(0)
  timestampSeconds: number;

  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  @IsOptional()
  volume?: number;
}

export class MasterAudioDto {
  @IsEnum(LoudnessProfileDto)
  @IsOptional()
  loudnessProfile?: LoudnessProfileDto;

  @IsNumber()
  @IsOptional()
  targetLufs?: number;

  @IsString()
  @IsOptional()
  musicCategory?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SfxCueDto)
  @IsOptional()
  sfxCues?: SfxCueDto[];

  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  shotId?: string;
}
