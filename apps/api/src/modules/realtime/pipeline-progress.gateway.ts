import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';

export interface PipelineProgressPayload {
  jobId: string;
  workspaceId?: string;
  projectId?: string;
  stage: string;
  progressPercent: number;
  message?: string;
  details?: any;
  timestamp: string;
}

@WebSocketGateway({
  namespace: 'pipeline-progress',
  cors: { origin: '*' },
})
export class PipelineProgressGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(PipelineProgressGateway.name);

  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, { userId: string; workspaceId: string }>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(`Unauthorized WebSocket connection attempt rejected (missing token): ${client.id}`);
        client.emit('error', { message: 'Unauthorized: missing JWT token' });
        client.disconnect(true);
        return;
      }

      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub || decoded.userId || 'anonymous-user';
      const workspaceId = decoded.activeWorkspaceId || decoded.workspaceId || 'default-workspace';

      this.connectedClients.set(client.id, { userId, workspaceId });
      client.join(`workspace_${workspaceId}`);

      this.logger.log(`Authenticated WS client ${client.id} [User=${userId}, Workspace=${workspaceId}] joined room: workspace_${workspaceId}`);
      client.emit('authenticated', { status: 'ok', userId, workspaceId });
    } catch (err: any) {
      this.logger.warn(`WebSocket authentication failed for client ${client.id}: ${err.message}`);
      client.emit('error', { message: 'Unauthorized: invalid or expired JWT token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      this.logger.log(`Client ${client.id} [Workspace=${clientData.workspaceId}] disconnected`);
      this.connectedClients.delete(client.id);
    }
  }

  @SubscribeMessage('subscribe_job')
  handleSubscribeJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { jobId: string; workspaceId?: string },
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (!clientData) {
      return { status: 'unauthorized', error: 'Unauthenticated socket client' };
    }

    const targetWorkspaceId = payload.workspaceId || clientData.workspaceId;

    // Cross-workspace subscription rejection
    if (targetWorkspaceId !== clientData.workspaceId) {
      this.logger.warn(`Forbidden WS room subscription attempt by client ${client.id} (Workspace ${clientData.workspaceId}) for target Workspace ${targetWorkspaceId}`);
      return {
        status: 'forbidden',
        error: `Forbidden: Socket workspace ${clientData.workspaceId} cannot subscribe to target workspace ${targetWorkspaceId} job`,
      };
    }

    if (payload?.jobId) {
      client.join(`job_${payload.jobId}`);
      this.logger.log(`Client ${client.id} subscribed to authorized job room: job_${payload.jobId}`);
      return { status: 'subscribed', room: `job_${payload.jobId}`, workspaceId: clientData.workspaceId };
    }
  }

  // ----------------------------------------------------
  // Broadcast Event Listeners — Tenant & Workspace Scoped
  // ----------------------------------------------------
  @OnEvent('pipeline.progress')
  handlePipelineProgress(event: PipelineProgressPayload) {
    const targetWorkspaceId = event.workspaceId || 'default-workspace';
    this.logger.log(`Broadcasting progress [Job=${event.jobId}, Workspace=${targetWorkspaceId}, Stage=${event.stage}, Progress=${event.progressPercent}%]`);

    // Emit ONLY to authorized job room and tenant workspace room
    this.server.to(`job_${event.jobId}`).emit('job_progress', event);
    this.server.to(`workspace_${targetWorkspaceId}`).emit('workspace_job_progress', event);
    
    // NOTE: Global broadcast (this.server.emit('global_pipeline_progress')) is intentionally REMOVED for tenant security!
  }

  @OnEvent('pipeline.self_healing.started')
  handleSelfHealingStarted(event: any) {
    this.server.to(`job_${event.jobId}`).emit('job_self_healing_started', event);
    if (event.workspaceId) {
      this.server.to(`workspace_${event.workspaceId}`).emit('workspace_self_healing_started', event);
    }
  }

  @OnEvent('pipeline.self_healing.completed')
  handleSelfHealingCompleted(event: any) {
    this.server.to(`job_${event.jobId}`).emit('job_self_healing_completed', event);
    if (event.workspaceId) {
      this.server.to(`workspace_${event.workspaceId}`).emit('workspace_self_healing_completed', event);
    }
  }

  @OnEvent('pipeline.qc.completed')
  handleQcCompleted(event: any) {
    this.server.to(`job_${event.jobId}`).emit('job_qc_completed', event);
    if (event.workspaceId) {
      this.server.to(`workspace_${event.workspaceId}`).emit('workspace_qc_completed', event);
    }
  }
}
