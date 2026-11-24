import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly resend: Resend | null = null;
  private readonly defaultFrom: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.defaultFrom =
      this.config.get<string>('RESEND_FROM_EMAIL') || 'Dispenco <noreply@dispenco.com>';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email provider initialized for production delivery.');
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not defined. Email delivery will run in simulated development mode.',
      );
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailDispatchResult> {
    const from = options.from || this.defaultFrom;

    if (!this.resend) {
      this.logger.log(
        `[SIMULATED EMAIL]\nFrom: ${from}\nTo: ${JSON.stringify(options.to)}\nSubject: ${
          options.subject
        }\nHTML Length: ${options.html.length} chars`,
      );
      return {
        success: true,
        messageId: `sim_email_${Date.now()}`,
      };
    }

    try {
      const response = await this.resend.emails.send({
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
      });

      if (response.error) {
        this.logger.error(`Resend email delivery failed: ${response.error.message}`);
        return {
          success: false,
          error: response.error.message,
        };
      }

      this.logger.log(`Email dispatched via Resend. ID: ${response.data?.id}`);
      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (err: any) {
      this.logger.error(`Unexpected error dispatching email: ${err.message}`, err.stack);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}
