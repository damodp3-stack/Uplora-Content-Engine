import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { Writable } from 'stream';

describe('MediaController Security & Tenant Authorization Suite', () => {
  let controller: MediaController;

  const mockMediaService = {
    getMediaLibrary: jest.fn().mockImplementation((workspaceId) => {
      if (workspaceId === 'workspace_a') return [{ id: 'asset_a', workspaceId: 'workspace_a' }];
      if (workspaceId === 'workspace_b') return [{ id: 'asset_b', workspaceId: 'workspace_b' }];
      return [];
    }),
    getAssetById: jest.fn().mockImplementation((id, workspaceId) => {
      if (id === 'asset_a' && workspaceId === 'workspace_a') {
        return Promise.resolve({ id: 'asset_a', workspaceId: 'workspace_a' });
      }
      if (id === 'asset_b' && workspaceId === 'workspace_b') {
        return Promise.resolve({ id: 'asset_b', workspaceId: 'workspace_b' });
      }
      throw new ForbiddenException(`Workspace ${workspaceId} does not own asset ${id}`);
    }),
    uploadAndSaveAsset: jest.fn().mockResolvedValue({ id: 'asset_123' }),
  };

  const createMockResponse = () => {
    const res = new Writable({
      write(chunk, encoding, callback) {
        callback();
      },
    });
    (res as any).setHeader = jest.fn();
    return res;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [{ provide: MediaService, useValue: mockMediaService }],
    }).compile();

    controller = module.get<MediaController>(MediaController);
  });

  it('1. User A CAN download own workspace asset', async () => {
    const req = { user: { activeWorkspaceId: 'workspace_a' } };
    const mockRes = createMockResponse();

    await expect(controller.downloadAsset('asset_a', req as any, mockRes as any)).resolves.not.toThrow();
  });

  it('2. User A CANNOT download User B asset (Cross-Tenant Rejection)', async () => {
    const reqUserA = { user: { activeWorkspaceId: 'workspace_a' } };
    const mockRes = createMockResponse();

    await expect(controller.downloadAsset('asset_b', reqUserA as any, mockRes as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('3. User A CANNOT stream User B asset (Cross-Tenant Rejection)', async () => {
    const reqUserA = { user: { activeWorkspaceId: 'workspace_a' } };
    const mockRes = createMockResponse();

    await expect(controller.streamAsset('asset_b', reqUserA as any, mockRes as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('4. Requests for non-existent assets return 403 or 404 cleanly', async () => {
    const reqUserA = { user: { activeWorkspaceId: 'workspace_a' } };
    const mockRes = createMockResponse();

    await expect(controller.downloadAsset('asset_missing', reqUserA as any, mockRes as any)).rejects.toThrow();
  });
});
