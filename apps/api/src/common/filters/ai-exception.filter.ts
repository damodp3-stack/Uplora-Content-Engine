import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId =
      (request.headers["x-request-id"] as string) ||
      Math.random().toString(36).substring(7);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "An unexpected error occurred";
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        code = (resp.code as string) || this.statusToCode(status);
        details = resp.details;
      } else {
        message = exceptionResponse as string;
        code = this.statusToCode(status);
      }
    } else if (exception instanceof Error) {
      const axiosErr = exception as any;
      if (axiosErr.isAxiosError) {
        if (axiosErr.code === "ECONNREFUSED") {
          status = HttpStatus.SERVICE_UNAVAILABLE;
          code = "AI_PROVIDER_UNAVAILABLE";
          message = "AI provider is currently unavailable. Using fallback.";
        } else if (axiosErr.code === "ETIMEDOUT") {
          status = HttpStatus.GATEWAY_TIMEOUT;
          code = "AI_PROVIDER_TIMEOUT";
          message = "AI generation timed out. Please try again.";
        } else if (axiosErr.response?.status === 429) {
          status = HttpStatus.TOO_MANY_REQUESTS;
          code = "AI_RATE_LIMIT";
          message = "AI provider rate limit reached. Please wait.";
        } else {
          message = "AI provider error. Fallback activated.";
          code = "AI_PROVIDER_ERROR";
        }
      } else {
        message = exception.message;
      }

      this.logger.error(
        `[${requestId}] ${exception.constructor.name}: ${exception.message}`,
        exception.stack,
      );
    }

    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${status} ${request.method} ${request.url}: ${message}`,
      );
    } else {
      this.logger.warn(
        `[${requestId}] ${status} ${request.method} ${request.url}: ${message}`,
      );
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      },
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "UNPROCESSABLE_ENTITY",
      429: "RATE_LIMIT_EXCEEDED",
      500: "INTERNAL_ERROR",
      502: "BAD_GATEWAY",
      503: "SERVICE_UNAVAILABLE",
      504: "GATEWAY_TIMEOUT",
    };
    return map[status] || "UNKNOWN_ERROR";
  }
}
