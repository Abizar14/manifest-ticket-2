import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import * as Sentry from "@sentry/node";
import type { Request, Response } from "express";

/**
 * Global exception filter:
 *  - Format response error konsisten (tetap mempertahankan body asli Nest +
 *    menambah path & timestamp) → kompatibel dengan parser error frontend.
 *  - Error tak terduga (5xx) dilaporkan ke Sentry + di-log; 4xx (validasi/auth
 *    normal) tidak, supaya tidak membanjiri alert.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exception");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Pertahankan bentuk body asli (statusCode/message/error) agar FE tak rusak.
    const raw =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: "Internal server error" };
    const body =
      typeof raw === "string" ? { statusCode: status, message: raw } : { ...raw };

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      Sentry.captureException(exception);
    }

    res.status(status).json({
      ...body,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
