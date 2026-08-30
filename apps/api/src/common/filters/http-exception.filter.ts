import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'An unexpected server error occurred. Please try again.';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resObj = exceptionResponse as Record<string, any>;
        message = resObj.message || message;
        error = resObj.error || (status === 400 ? 'Bad Request' : 'Error');
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Database Request Error';
      this.logger.error(`Prisma Error Code: ${exception.code} - ${exception.message}`);

      switch (exception.code) {
        case 'P2002': {
          const target = (exception.meta?.target as string[])?.join(', ') || 'field';
          message = `A record with this ${target} already exists.`;
          break;
        }
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'The requested record was not found.';
          break;
        case 'P2003':
          message = 'Foreign key constraint failed on reference field.';
          break;
        default:
          message = 'A database operation error occurred.';
          break;
      }
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      error = 'Database Connection Failure';
      message = 'Unable to connect to the database service. Please ensure database is running.';
      this.logger.error(`Prisma Init Error: ${exception.message}`);
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Error: ${exception.message}`, exception.stack);
    }

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - Status ${status}`,
        exception instanceof Error ? exception.stack : String(exception)
      );
      message = 'An unexpected server error occurred. Please try again.';
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
