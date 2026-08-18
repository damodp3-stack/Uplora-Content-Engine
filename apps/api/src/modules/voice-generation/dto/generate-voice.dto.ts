import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export enum VoiceGender {
  FEMALE = 'female',
  MALE = 'male',
}

export enum VoiceOutputFormat {
  MP3 = 'mp3',
  WAV = 'wav',
}

export class GenerateVoiceDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  voiceId?: string;

  @IsEnum(VoiceGender)
  @IsOptional()
  gender?: VoiceGender;

  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  @IsOptional()
  speakingRate?: number;

  @IsEnum(VoiceOutputFormat)
  @IsOptional()
  outputFormat?: VoiceOutputFormat;

  @IsString()
  @IsOptional()
  contentId?: string;

  @IsString()
  @IsOptional()
  sceneId?: string;
}
