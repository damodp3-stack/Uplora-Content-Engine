import { Test, TestingModule } from '@nestjs/testing';
import { PipelineProgressGateway } from './pipeline-progress.gateway';
import { JwtService } from '@nestjs/jwt';

describe('PipelineProgressGateway Tenant Isolation & Auth Suite', () => {
  let gateway: PipelineProgressGateway;

  const mockJwtService = {
    verify: jest.fn().mockImplementation((token: string) => {
      if (token === 'valid_token_user_a') {
        return { sub: 'user_a', activeWorkspaceId: 'workspace_a' };
      }
      if (token === 'valid_token_user_b') {
        return { sub: 'user_b', activeWorkspaceId: 'workspace_b' };
      }
      throw new Error('Invalid JWT token');
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineProgressGateway,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    gateway = module.get<PipelineProgressGateway>(PipelineProgressGateway);
    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      emit: jest.fn(),
    } as any;
  });

  it('1. Unauthenticated WebSocket connection is rejected and disconnected', async () => {
    const mockSocket = {
      id: 'socket_unauth',
      handshake: { auth: {}, headers: {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
    };

    await gateway.handleConnection(mockSocket as any);
    expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: expect.stringContaining('Unauthorized') }));
    expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
  });

  it('2. Authenticated user joins ONLY their workspace room', async () => {
    const mockSocket = {
      id: 'socket_user_a',
      handshake: { auth: { token: 'valid_token_user_a' }, headers: {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
    };

    await gateway.handleConnection(mockSocket as any);
    expect(mockSocket.join).toHaveBeenCalledWith('workspace_workspace_a');
    expect(mockSocket.emit).toHaveBeenCalledWith('authenticated', expect.objectContaining({ workspaceId: 'workspace_a' }));
  });

  it('3. User A CANNOT subscribe to User B workspace room or job', async () => {
    const mockSocket = {
      id: 'socket_user_a',
      handshake: { auth: { token: 'valid_token_user_a' }, headers: {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
    };

    await gateway.handleConnection(mockSocket as any);
    const res = gateway.handleSubscribeJob(mockSocket as any, { jobId: 'job_b', workspaceId: 'workspace_b' });

    expect(res).toBeDefined();
    expect(res?.status).toBe('forbidden');
  });

  it('4. User A CAN subscribe to own workspace job room', async () => {
    const mockSocket = {
      id: 'socket_user_a',
      handshake: { auth: { token: 'valid_token_user_a' }, headers: {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
    };

    await gateway.handleConnection(mockSocket as any);
    const res = gateway.handleSubscribeJob(mockSocket as any, { jobId: 'job_a', workspaceId: 'workspace_a' });

    expect(res).toBeDefined();
    expect(res?.status).toBe('subscribed');
    expect(mockSocket.join).toHaveBeenCalledWith('job_job_a');
  });

  it('5. Pipeline progress broadcasts ONLY to target workspace room and job room (No global leak)', () => {
    const payload = {
      jobId: 'job_a',
      workspaceId: 'workspace_a',
      stage: 'AUDIO_MASTERING',
      progressPercent: 88,
      timestamp: new Date().toISOString(),
    };

    gateway.handlePipelineProgress(payload);
    expect(gateway.server.to).toHaveBeenCalledWith('job_job_a');
    expect(gateway.server.to).toHaveBeenCalledWith('workspace_workspace_a');
    // Global broadcast server.emit must NOT be called
    expect(gateway.server.emit).not.toHaveBeenCalledWith('global_pipeline_progress', payload);
  });
});
