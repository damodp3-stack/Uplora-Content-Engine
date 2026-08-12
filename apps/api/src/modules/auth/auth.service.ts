import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import * as bcrypt from "bcryptjs";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string, fullName: string) {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException("User with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({
      email,
      passwordHash,
      fullName,
      activeWorkspaceId: "default-workspace",
    });

    const saved = await this.userRepo.save(user);
    const token = this.generateToken(saved);

    return {
      user: {
        id: saved.id,
        email: saved.email,
        fullName: saved.fullName,
        role: saved.role,
        activeWorkspaceId: saved.activeWorkspaceId,
      },
      accessToken: token,
    };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({
      where: { email },
      select: [
        "id",
        "email",
        "passwordHash",
        "fullName",
        "role",
        "activeWorkspaceId",
      ],
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        activeWorkspaceId: user.activeWorkspaceId,
      },
      accessToken: token,
    };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.activeWorkspaceId,
    };
    return this.jwtService.sign(payload);
  }
}
