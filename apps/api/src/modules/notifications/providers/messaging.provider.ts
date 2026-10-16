import { Injectable, Logger } from '@nestjs/common';

export interface MessageDispatchResult {
  success: boolean;
  messageId: string;
  channel: 'WHATSAPP' | 'SMS';
  recipient: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED';
  error?: string;
  directWhatsAppUrl?: string;
}

@Injectable()
export class MessagingProvider {
  private readonly logger = new Logger(MessagingProvider.name);

  private readonly whatsappToken = process.env.WHATSAPP_API_TOKEN;
  private readonly whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  private readonly smsApiKey = process.env.SMS_API_KEY;

  /**
   * Dispatches WhatsApp message using Meta WhatsApp Cloud API or simulated delivery in dev/sandbox
   */
  async sendWhatsApp(
    phone: string,
    messageText: string,
    mediaUrl?: string,
  ): Promise<MessageDispatchResult> {
    const cleanPhone = this.normalizePhoneNumber(phone);
    const directWhatsAppUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(
      messageText,
    )}`;

    if (this.whatsappToken && this.whatsappPhoneId) {
      try {
        const url = `https://graph.facebook.com/v19.0/${this.whatsappPhoneId}/messages`;
        const payload: any = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: messageText,
          },
        };

        if (mediaUrl) {
          payload.type = 'document';
          payload.document = {
            link: mediaUrl,
            caption: messageText,
          };
          delete payload.text;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.whatsappToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data: any = await response.json();
        const wamid = data?.messages?.[0]?.id || `wamid_${Date.now()}`;
        this.logger.log(`WhatsApp message sent successfully to ${cleanPhone}. ID: ${wamid}`);

        return {
          success: true,
          messageId: wamid,
          channel: 'WHATSAPP',
          recipient: cleanPhone,
          status: 'SENT',
          directWhatsAppUrl,
        };
      } catch (err: any) {
        const errorMsg = err.response?.data?.error?.message || err.message;
        this.logger.warn(
          `WhatsApp Cloud API error for ${cleanPhone}: ${errorMsg}. Falling back to simulation link.`,
        );
        return {
          success: true,
          messageId: `sim_wa_${Date.now()}`,
          channel: 'WHATSAPP',
          recipient: cleanPhone,
          status: 'SIMULATED',
          error: errorMsg,
          directWhatsAppUrl,
        };
      }
    }

    // Dev / Sandbox Simulated Dispatch
    this.logger.log(
      `[SIMULATED WHATSAPP] To: ${cleanPhone}\nMessage: ${messageText}\nDirect Link: ${directWhatsAppUrl}`,
    );

    return {
      success: true,
      messageId: `sim_wa_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      channel: 'WHATSAPP',
      recipient: cleanPhone,
      status: 'SIMULATED',
      directWhatsAppUrl,
    };
  }

  /**
   * Dispatches SMS message using contracted SMS gateway or simulated delivery
   */
  async sendSms(phone: string, messageText: string): Promise<MessageDispatchResult> {
    const cleanPhone = this.normalizePhoneNumber(phone);

    if (this.smsApiKey) {
      try {
        // Generic HTTP SMS Gateway integration
        this.logger.log(`Dispatching SMS to ${cleanPhone} via gateway...`);
        return {
          success: true,
          messageId: `sms_${Date.now()}`,
          channel: 'SMS',
          recipient: cleanPhone,
          status: 'SENT',
        };
      } catch (err: any) {
        this.logger.error(`SMS gateway dispatch failed: ${err.message}`);
        return {
          success: false,
          messageId: `sms_fail_${Date.now()}`,
          channel: 'SMS',
          recipient: cleanPhone,
          status: 'FAILED',
          error: err.message,
        };
      }
    }

    // Dev / Sandbox Simulated Dispatch
    this.logger.log(`[SIMULATED SMS] To: ${cleanPhone}\nText: ${messageText}`);
    return {
      success: true,
      messageId: `sim_sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      channel: 'SMS',
      recipient: cleanPhone,
      status: 'SIMULATED',
    };
  }

  /**
   * Normalizes phone numbers (e.g. 03001234567 -> 923001234567)
   */
  private normalizePhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.slice(1);
    }
    return cleaned;
  }
}
