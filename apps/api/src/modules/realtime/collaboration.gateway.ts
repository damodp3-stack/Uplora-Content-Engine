import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Content } from "../content/entities/content.entity";

interface ConnectedUser {
  userId: string;
  name: string;
  email: string;
  color: string;
  contentId: string;
  cursor?: { anchor: number; head: number };
  lastSeen: Date;
}

interface DocumentOperation {
  type: "insert" | "delete" | "replace" | "format";
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: number;
  version: number;
}

const USER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#82E0AA",
  "#F8C471",
];

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
  namespace: "/collaboration",
  transports: ["websocket", "polling"],
})
export class CollaborationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CollaborationGateway.name);
  private connectedUsers = new Map<string, ConnectedUser>();
  private contentRooms = new Map<string, Set<string>>();
  private documentVersions = new Map<string, number>();
  private operationHistory = new Map<string, DocumentOperation[]>();

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Content)
    private readonly contentRepo: Repository<Content>,
  ) {}

  afterInit() {
    this.logger.log("✅ Collaboration WebSocket Gateway initialized");
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token);
      const colorIndex = this.connectedUsers.size % USER_COLORS.length;

      this.connectedUsers.set(client.id, {
        userId: payload.sub || payload.userId || "user-1",
        name: payload.name || payload.email || "User",
        email: payload.email || "user@uplora.ai",
        color: USER_COLORS[colorIndex],
        contentId: "",
        lastSeen: new Date(),
      });

      client.emit("connected", {
        socketId: client.id,
        color: USER_COLORS[colorIndex],
      });
    } catch (error) {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user?.contentId) {
      const room = this.contentRooms.get(user.contentId);
      if (room) {
        room.delete(client.id);
        if (room.size === 0) this.contentRooms.delete(user.contentId);
      }
      this.server.to(`content:${user.contentId}`).emit("user:left", {
        userId: user.userId,
        presentUsers: this.getPresentUsers(user.contentId),
      });
    }
    this.connectedUsers.delete(client.id);
  }

  @SubscribeMessage("document:join")
  async handleJoinDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { contentId: string },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    const { contentId } = payload;
    client.join(`content:${contentId}`);
    user.contentId = contentId;

    if (!this.contentRooms.has(contentId)) {
      this.contentRooms.set(contentId, new Set());
      this.documentVersions.set(contentId, 0);
      this.operationHistory.set(contentId, []);
    }

    this.contentRooms.get(contentId)!.add(client.id);

    const presentUsers = this.getPresentUsers(contentId);
    const version = this.documentVersions.get(contentId) || 0;

    client.emit("document:joined", { contentId, version, presentUsers });
    client.to(`content:${contentId}`).emit("user:joined", {
      userId: user.userId,
      name: user.name,
      color: user.color,
      presentUsers,
    });
  }

  @SubscribeMessage("document:operation")
  handleOperation(
    @ConnectedSocket() client: Socket,
    @MessageBody() operation: DocumentOperation,
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user?.contentId) return;

    const contentId = user.contentId;
    const currentVersion = this.documentVersions.get(contentId) || 0;
    const newVersion = currentVersion + 1;
    this.documentVersions.set(contentId, newVersion);

    const history = this.operationHistory.get(contentId) || [];
    history.push({ ...operation, version: newVersion });
    if (history.length > 100) history.shift();
    this.operationHistory.set(contentId, history);

    this.server.to(`content:${contentId}`).emit("document:operation", {
      ...operation,
      version: newVersion,
      userId: user.userId,
    });
  }

  @SubscribeMessage("cursor:move")
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() cursor: { anchor: number; head: number },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user?.contentId) return;
    user.cursor = cursor;

    client.to(`content:${user.contentId}`).emit("cursor:moved", {
      userId: user.userId,
      socketId: client.id,
      name: user.name,
      color: user.color,
      cursor,
    });
  }

  @SubscribeMessage("comment:add")
  handleAddComment(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { contentId: string; text: string; selectedText?: string },
  ) {
    const user = this.connectedUsers.get(client.id);
    if (!user) return;

    const comment = {
      id: Math.random().toString(36).substring(7),
      contentId: payload.contentId,
      text: payload.text,
      selectedText: payload.selectedText,
      author: { id: user.userId, name: user.name, color: user.color },
      createdAt: new Date().toISOString(),
    };

    this.server
      .to(`content:${payload.contentId}`)
      .emit("comment:added", comment);
  }

  private getPresentUsers(contentId: string) {
    const room = this.contentRooms.get(contentId);
    if (!room) return [];

    return Array.from(room)
      .map((socketId) => {
        const u = this.connectedUsers.get(socketId);
        return u
          ? {
              userId: u.userId,
              socketId,
              name: u.name,
              color: u.color,
              cursor: u.cursor,
            }
          : null;
      })
      .filter(Boolean);
  }
}
