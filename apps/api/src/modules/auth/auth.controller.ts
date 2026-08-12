import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { AuthService } from "./auth.service";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new user account" })
  async register(@Body() body: any) {
    return this.authService.register(
      body.email,
      body.password,
      body.fullName || "User",
    );
  }

  @Post("login")
  @ApiOperation({ summary: "Authenticate user and receive JWT token" })
  async login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }
}
