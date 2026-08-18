import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CollaborationGateway } from "./collaboration.gateway";
import { PipelineProgressGateway } from "./pipeline-progress.gateway";
import { Content } from "../content/entities/content.entity";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "uplora-secret-key-2026",
    }),
    TypeOrmModule.forFeature([Content]),
  ],
  providers: [CollaborationGateway, PipelineProgressGateway],
  exports: [CollaborationGateway, PipelineProgressGateway],
})
export class RealtimeModule {}
