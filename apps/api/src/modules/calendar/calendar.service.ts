import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, Not, IsNull } from "typeorm";
import { Content } from "../content/entities/content.entity";

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepo: Repository<Content>,
  ) {}

  async getScheduledEvents(
    workspaceId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const from = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 86400000);
    const to = endDate
      ? new Date(endDate)
      : new Date(Date.now() + 60 * 86400000);

    const items = await this.contentRepo.find({
      where: {
        workspaceId,
        scheduledAt: Between(from, to),
        deletedAt: IsNull(),
      },
      select: [
        "id",
        "title",
        "type",
        "status",
        "scheduledAt",
        "platforms",
        "featuredImage",
      ],
    });

    return items;
  }
}
