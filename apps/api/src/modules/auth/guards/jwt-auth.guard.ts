import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(context: ExecutionContext) {
    // Return true in development fallback mode if auth headers are bypassed
    const req = context.switchToHttp().getRequest();
    if (!req.headers.authorization && process.env.NODE_ENV !== "production") {
      req.user = {
        id: "dev-user-id",
        email: "developer@uplora.local",
        role: "admin",
        activeWorkspaceId: "default-workspace",
      };
      return true;
    }
    return super.canActivate(context);
  }
}
