import { PartialType, ApiPropertyOptional } from "@nestjs/swagger";
import { CreateContentDto } from "./create-content.dto";
import { IsOptional, IsString } from "class-validator";

export class UpdateContentDto extends PartialType(CreateContentDto) {
  @ApiPropertyOptional({ description: "Description of changes made" })
  @IsOptional()
  @IsString()
  changeDescription?: string;
}
