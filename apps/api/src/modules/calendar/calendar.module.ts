import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Content } from "../content/entities/content.entity";
import { CalendarService } from "./calendar.service";
import { CalendarController } from "./calendar.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Content])],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
