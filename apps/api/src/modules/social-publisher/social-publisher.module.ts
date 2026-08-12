import { Module } from "@nestjs/common";
import { SocialPublisherService } from "./social-publisher.service";
import { SocialPublisherController } from "./social-publisher.controller";

@Module({
  controllers: [SocialPublisherController],
  providers: [SocialPublisherService],
  exports: [SocialPublisherService],
})
export class SocialPublisherModule {}
