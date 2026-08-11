import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from './entities/workspace.entity';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
  ) {}

  async getWorkspace(id: string) {
    let ws = await this.workspaceRepo.findOne({ where: { id } });
    if (!ws) {
      ws = this.workspaceRepo.create({
        id: 'default-workspace',
        name: 'Default Workspace',
        slug: 'default-workspace',
      });
      await this.workspaceRepo.save(ws);
    }
    return ws;
  }
}
