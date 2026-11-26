import { Injectable } from '@nestjs/common';

/**
 * Minimal, table-based HTML email templates.
 * Built for Gmail, Outlook, Apple Mail and mobile: inline styles only, PNG assets
 * (Gmail strips inline SVG), a 560px single column and system fonts.
 */

interface EmailStep {
  title: string;
  description: string;
}

export interface BaseEmailTemplateOptions {
  preheader?: string;
  heading: string;
  intro: string;
  steps?: EmailStep[];
  detailsHtml?: string;
  ctaText?: string;
  ctaUrl?: string;
  noteTitle?: string;
  noteBody?: string;
}

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif";

const color = {
  brand: '#007595',
  brandTint: '#ECFEFF',
  ink: '#0F172A',
  body: '#475569',
  muted: '#94A3B8',
  border: '#E5E7EB',
  canvas: '#F6F8FA',
  surface: '#F8FAFC',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class EmailTemplatesService {
  /** Public site that hosts the logo/icon assets and receives CTA clicks. */
  private readonly siteUrl = (process.env.APP_PUBLIC_URL || 'https://www.dispenco.com').replace(
    /\/$/,
    '',
  );
  private readonly whatsappNumber = '+923186942546';
  private readonly whatsappDisplay = '+92 318 6942546';

  logoUrl = `${this.siteUrl}/brand/dispenco-logo.png`;
  whatsappIconUrl = `${this.siteUrl}/brand/whatsapp-icon.png`;

  private get whatsappHref() {
    return `https://wa.me/${this.whatsappNumber.replace(/\D/g, '')}`;
  }

  private renderSteps(steps: EmailStep[]): string {
    const rows = steps
      .map(
        (step, index) => `
          <tr>
            <td valign="top" width="36" style="padding: 0 0 18px;">
              <div style="width: 24px; height: 24px; line-height: 24px; border-radius: 12px; background-color: ${color.brandTint}; color: ${color.brand}; font-family: ${FONT}; font-size: 12px; font-weight: 600; text-align: center;">${index + 1}</div>
            </td>
            <td valign="top" style="padding: 2px 0 18px; font-family: ${FONT};">
              <div style="font-size: 14px; font-weight: 600; color: ${color.ink}; line-height: 20px;">${step.title}</div>
              <div style="font-size: 14px; color: ${color.body}; line-height: 22px; margin-top: 2px;">${step.description}</div>
            </td>
          </tr>`,
      )
      .join('');

    return `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 8px 0 8px;">
        ${rows}
      </table>`;
  }

  private renderButton(text: string, url: string): string {
    return `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 12px 0 0;">
        <tr>
          <td align="center" bgcolor="${color.brand}" style="border-radius: 8px;">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${url}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="${color.brand}"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">${text}</center></v:roundrect><![endif]-->
            <!--[if !mso]><!-->
            <a href="${url}" target="_blank" style="display: inline-block; padding: 12px 22px; font-family: ${FONT}; font-size: 14px; font-weight: 600; line-height: 20px; color: #ffffff; text-decoration: none; border-radius: 8px;">${text}</a>
            <!--<![endif]-->
          </td>
        </tr>
      </table>
      <p style="margin: 14px 0 0; font-family: ${FONT}; font-size: 12px; line-height: 18px; color: ${color.muted};">
        Button not working? Paste this link into your browser:<br />
        <a href="${url}" target="_blank" style="color: ${color.brand}; text-decoration: none; word-break: break-all;">${url}</a>
      </p>`;
  }

  private renderNote(title: string | undefined, body: string): string {
    return `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 0;">
        <tr>
          <td style="padding: 16px 18px; background-color: ${color.surface}; border: 1px solid ${color.border}; border-radius: 10px; font-family: ${FONT};">
            ${title ? `<div style="font-size: 13px; font-weight: 600; color: ${color.ink}; line-height: 20px;">${title}</div>` : ''}
            <div style="font-size: 13px; color: ${color.body}; line-height: 21px; ${title ? 'margin-top: 4px;' : ''}">${body}</div>
          </td>
        </tr>
      </table>`;
  }

  /** Shared shell: logo header, WhatsApp support pill, content card and quiet footer. */
  wrapTemplate(options: BaseEmailTemplateOptions): string {
    const preheader = options.preheader
      ? `<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: ${color.canvas}; opacity: 0;">${options.preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>`
      : '';

    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${options.heading}</title>
  <style>
    @media (max-width: 600px) {
      .card-pad { padding: 28px 22px !important; }
      .head-pad { padding: 20px 22px !important; }
      .wa-label { display: none !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${color.canvas}; -webkit-font-smoothing: antialiased;">
  ${preheader}
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${color.canvas}" style="background-color: ${color.canvas};">
    <tr>
      <td align="center" style="padding: 40px 12px;">

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border: 1px solid ${color.border}; border-radius: 14px;">
          <!-- Header -->
          <tr>
            <td class="head-pad" style="padding: 22px 36px; border-bottom: 1px solid ${color.border};">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${this.siteUrl}" target="_blank" style="text-decoration: none;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td valign="middle" style="padding-right: 10px;">
                            <img src="${this.logoUrl}" width="30" height="30" alt="Dispenco" style="display: block; border: 0; border-radius: 7px;" />
                          </td>
                          <td valign="middle" style="font-family: ${FONT}; font-size: 17px; font-weight: 700; letter-spacing: -0.3px; color: ${color.ink};">
                            Dispenco
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <a href="${this.whatsappHref}" target="_blank" style="display: inline-block; padding: 6px 12px; border: 1px solid ${color.border}; border-radius: 999px; text-decoration: none;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td valign="middle">
                            <img src="${this.whatsappIconUrl}" width="16" height="16" alt="WhatsApp" style="display: block; border: 0;" />
                          </td>
                          <td class="wa-label" valign="middle" style="padding-left: 7px; font-family: ${FONT}; font-size: 13px; font-weight: 500; color: ${color.ink}; white-space: nowrap;">
                            WhatsApp support
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="card-pad" style="padding: 40px 36px 36px; font-family: ${FONT};">
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 600; letter-spacing: -0.4px; line-height: 30px; color: ${color.ink};">${options.heading}</h1>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 25px; color: ${color.body};">${options.intro}</p>
              ${options.steps?.length ? this.renderSteps(options.steps) : ''}
              ${options.detailsHtml ?? ''}
              ${options.ctaText && options.ctaUrl ? this.renderButton(options.ctaText, options.ctaUrl) : ''}
              ${options.noteBody ? this.renderNote(options.noteTitle, options.noteBody) : ''}
              <p style="margin: 32px 0 0; font-size: 14px; line-height: 22px; color: ${color.body};">
                Regards,<br />
                <span style="color: ${color.ink}; font-weight: 600;">The Dispenco team</span>
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;">
          <tr>
            <td align="center" style="padding: 24px 24px 0; font-family: ${FONT}; font-size: 12px; line-height: 20px; color: ${color.muted};">
              <a href="${this.siteUrl}" target="_blank" style="color: ${color.body}; text-decoration: none; font-weight: 600;">Dispenco</a>
              &nbsp;&middot;&nbsp; Pharmacy inventory &amp; billing software<br />
              <a href="${this.whatsappHref}" target="_blank" style="color: ${color.muted}; text-decoration: none;">WhatsApp ${this.whatsappDisplay}</a>
              &nbsp;&middot;&nbsp;
              <a href="mailto:dispenco@gmail.com" style="color: ${color.muted}; text-decoration: none;">dispenco@gmail.com</a>
              <div style="margin-top: 10px; font-size: 11px; line-height: 17px;">
                You're receiving this service email because you have a Dispenco account.
              </div>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /** 1. Welcome & onboarding */
  getWelcomeEmail(ownerName: string, storeName: string): { subject: string; html: string } {
    const owner = escapeHtml(ownerName);
    const store = escapeHtml(storeName);

    const html = this.wrapTemplate({
      preheader: `${storeName} is set up on Dispenco. Here's how to start billing in about 10 minutes.`,
      heading: `Welcome to Dispenco, ${owner}`,
      intro: `Assalam-o-Alaikum! <strong style="color: ${color.ink}; font-weight: 600;">${store}</strong> is ready on Dispenco, and your 30-day free trial has started. Three steps to get your counter running:`,
      steps: [
        {
          title: 'Connect your counter',
          description: 'Plug in any USB or Bluetooth barcode scanner and a 58mm or 80mm thermal printer.',
        },
        {
          title: 'Add your stock',
          description: 'Import a CSV, or scan distributor invoices. Dispenco sells the nearest-expiry batch first.',
        },
        {
          title: 'Start billing',
          description: 'Ring up sales, print receipts and record Khata credit for regular customers.',
        },
      ],
      ctaText: 'Open your dashboard',
      ctaUrl: `${this.siteUrl}/dashboard`,
      noteTitle: 'We can load your stock for you',
      noteBody:
        'Send us your medicine list or distributor invoices by WhatsApp, or reply to this email. Our team will set up your catalog for free.',
    });

    return { subject: `Welcome to Dispenco — ${storeName} is ready`, html };
  }

  /** 2. Password reset */
  getPasswordResetEmail(userName: string, resetUrl: string): { subject: string; html: string } {
    const html = this.wrapTemplate({
      preheader: 'Use this link to set a new password. It expires in 15 minutes.',
      heading: 'Reset your password',
      intro: `Hi ${escapeHtml(userName)}, we received a request to reset the password for your Dispenco account. This link expires in <strong style="color: ${color.ink}; font-weight: 600;">15 minutes</strong>.`,
      ctaText: 'Choose a new password',
      ctaUrl: resetUrl,
      noteBody:
        "Didn't request this? You can ignore this email. Your password stays the same and no one can change it without this link.",
    });

    return { subject: 'Reset your Dispenco password', html };
  }

  /** 3. Monthly subscription receipt */
  getPaymentReceiptEmail(options: {
    ownerName: string;
    storeName: string;
    invoiceNumber: string;
    amountPkr: number;
    billingPeriod: string;
    receiptUrl?: string;
  }): { subject: string; html: string } {
    const amount = `PKR ${options.amountPkr.toLocaleString('en-PK')}`;
    const row = (label: string, value: string, emphasis = false, last = false) => `
      <tr>
        <td style="padding: 12px 0; ${last ? '' : `border-bottom: 1px solid ${color.border};`} font-family: ${FONT}; font-size: 14px; color: ${color.body};">${label}</td>
        <td align="right" style="padding: 12px 0; ${last ? '' : `border-bottom: 1px solid ${color.border};`} font-family: ${FONT}; font-size: ${emphasis ? '16px' : '14px'}; font-weight: ${emphasis ? 700 : 500}; color: ${color.ink};">${value}</td>
      </tr>`;

    const detailsHtml = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 4px 0 20px;">
        ${row('Store', escapeHtml(options.storeName))}
        ${row('Invoice', escapeHtml(options.invoiceNumber))}
        ${row('Billing period', escapeHtml(options.billingPeriod))}
        ${row('Amount paid', amount, true, true)}
      </table>`;

    const html = this.wrapTemplate({
      preheader: `We received ${amount} for ${options.storeName}. Thank you.`,
      heading: 'Payment received',
      intro: `Thank you, ${escapeHtml(options.ownerName)}. Your Dispenco subscription has been renewed, and your store keeps running without interruption.`,
      detailsHtml,
      ctaText: 'View billing',
      ctaUrl: options.receiptUrl || `${this.siteUrl}/settings`,
    });

    return { subject: `Receipt for ${amount} — Dispenco invoice ${options.invoiceNumber}`, html };
  }
}
