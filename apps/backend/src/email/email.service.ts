import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as path from 'path';
import * as fs from 'fs';
import { getEmailCopy, type EmailCopy } from './email-i18n';

type OrderItemSummary = {
  productVariant: {
    name: string | null;
    product: {
      name: string;
    };
  };
  quantity: number;
  price: any;
};

type EmailOrder = {
  id: string;
  status: string;
  total: any;
  subtotal: any;
  shipping: any;
  tax: any;
  trackingNumber?: string | null;
  shippingAddress: any;
  billingAddress: any;
  createdAt: Date;
  items: OrderItemSummary[];
  guestEmail?: string | null;
  user?: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  region?: {
    currency?: string | null;
  } | null;
};

type BrandingPalette = {
  primary?: string;
  primaryForeground?: string;
  secondary?: string;
  muted?: string;
  mutedForeground?: string;
  foreground?: string;
  background?: string;
  [key: string]: string | undefined;
};

type BrandingConfig = {
  name: string;
  shortName?: string;
  tagline?: string;
  siteUrl?: string;
  logo?: {
    primary?: string;
    favicon?: string;
    appleTouch?: string;
  };
  palette?: BrandingPalette;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private isConfigured = false;
  private branding: BrandingConfig | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const apiKeyRaw = this.configService.get<string>('RESEND_API_KEY');
    const apiKey = apiKeyRaw?.trim();
    const nodeEnv = process.env.NODE_ENV;

    if (!apiKey) {
      this.logger.warn(`Resend not configured: RESEND_API_KEY is missing or empty. NODE_ENV=${nodeEnv}`);
    } else {
      const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
      const fromName = this.configService.get<string>('RESEND_FROM_NAME') || 'Ecommerce Infinity';
      const maskedKey =
        apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '***masked***';

      this.resend = new Resend(apiKey);
      this.isConfigured = true;

      this.logger.log(
        `Resend configured successfully. key=${maskedKey}, fromEmail=${fromEmail}, fromName=${fromName}, NODE_ENV=${nodeEnv}`,
      );
    }
    this.loadBranding();
  }

  private loadBranding(): void {
    try {
      const baseDir = process.cwd();
      const candidates = [
        path.join(baseDir, 'dist', 'config', 'branding.json'),
        path.join(baseDir, 'src', 'config', 'branding.json'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          this.branding = JSON.parse(raw) as BrandingConfig;
          return;
        }
      }
    } catch {
      // ignore
    }
    this.branding = {
      name: this.configService.get<string>('BRAND_NAME') || 'Ecommerce Infinity',
      siteUrl: this.configService.get<string>('FRONTEND_URL') || this.configService.get<string>('BRAND_WEBSITE') || '',
      palette: {
        primary: this.configService.get<string>('BRAND_PRIMARY_COLOR') || '#111827',
        foreground: '#111827',
        mutedForeground: '#6b7280',
      },
    };
  }

  private getBranding() {
    const name = this.branding?.name ?? this.configService.get<string>('BRAND_NAME') ?? 'Ecommerce Infinity';
    const siteUrl =
      this.branding?.siteUrl ??
      this.configService.get<string>('FRONTEND_URL') ??
      this.configService.get<string>('BRAND_WEBSITE') ??
      '';
    const logoPath = this.branding?.logo?.primary ?? '';
    const logoUrl = logoPath && siteUrl ? `${siteUrl.replace(/\/$/, '')}${logoPath.startsWith('/') ? logoPath : `/${logoPath}`}` : (this.configService.get<string>('BRAND_LOGO_URL') || '');
    const palette = this.branding?.palette ?? {};
    const primaryColor = palette.primary ?? this.configService.get<string>('BRAND_PRIMARY_COLOR') ?? '#111827';
    const website = siteUrl || this.configService.get<string>('BRAND_WEBSITE') || '';
    const supportEmail = this.configService.get<string>('BRAND_SUPPORT_EMAIL') || '';

    return {
      name,
      logoUrl,
      primaryColor,
      mutedColor: palette.muted ?? '#f3f4f6',
      mutedForeground: palette.mutedForeground ?? '#6b7280',
      foreground: palette.foreground ?? '#111827',
      background: palette.background ?? '#ffffff',
      website,
      supportEmail,
    };
  }

  private formatCurrency(value: any, currency?: string | null) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return `${value}`;
    }
    const currencyCode = currency || this.configService.get<string>('APP_CURRENCY') || 'EUR';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(numeric);
  }

  /** Short, user-friendly order ID for display (matches frontend formatOrderIdDisplay). */
  private formatOrderIdDisplay(orderId: string): string {
    if (!orderId) return orderId;
    return orderId.replace(/-/g, '').slice(0, 8).toUpperCase();
  }

  private formatAddress(address: any) {
    if (!address) return 'N/A';
    const parts = [
      address.firstName,
      address.lastName,
      address.street,
      address.houseNumber,
      address.city,
      address.postalCode,
      address.country,
      address.phone,
    ].filter(Boolean);
    return parts.join(', ');
  }

  private getStatusLabel(status: string, copy: EmailCopy): string {
    switch (status) {
      case 'PENDING':
        return copy.statusPending;
      case 'PROCESSING':
        return copy.statusProcessing;
      case 'SHIPPED':
        return copy.statusShipped;
      case 'DELIVERED':
        return copy.statusDelivered;
      case 'CANCELLED':
        return copy.statusCancelled;
      default:
        return status;
    }
  }

  private buildEmailLayout(title: string, content: string) {
    const brand = this.getBranding();
    const logo = brand.logoUrl
      ? `<img src="${brand.logoUrl}" alt="${brand.name}" style="max-height: 40px; margin-bottom: 16px;" />`
      : `<div style="font-size: 20px; font-weight: 700; color: ${brand.primaryColor}; margin-bottom: 16px;">${brand.name}</div>`;

    const footer = `
      <div style="margin-top: 32px; font-size: 12px; color: ${brand.mutedForeground};">
        ${brand.website ? `<div>Website: <a href="${brand.website}" style="color: ${brand.primaryColor};">${brand.website}</a></div>` : ''}
        ${brand.supportEmail ? `<div>Support: ${brand.supportEmail}</div>` : ''}
      </div>
    `;

    return `
      <div style="font-family: Arial, sans-serif; color: ${brand.foreground}; background-color: ${brand.background}; line-height: 1.5;">
        ${logo}
        <h2 style="color: ${brand.primaryColor}; margin: 0 0 12px;">${title}</h2>
        <div>${content}</div>
        ${footer}
      </div>
    `;
  }

  private buildOrderItems(order: EmailOrder) {
    const currency = order.region?.currency || 'EUR';
    return order.items
      .map((item) => {
        const name = `${item.productVariant.product.name}${
          item.productVariant.name ? ` - ${item.productVariant.name}` : ''
        }`;
        return `<li>${name} × ${item.quantity} — ${this.formatCurrency(item.price, currency)}</li>`;
      })
      .join('');
  }

  private async sendMail(to: string, subject: string, html: string) {
    if (!this.resend || !this.isConfigured) {
      this.logger.warn('Resend email service not configured (RESEND_API_KEY missing). Skipping email.');
      return;
    }

    const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
    const fromName = this.configService.get<string>('RESEND_FROM_NAME') || this.getBranding().name;

    this.logger.log(
      `Attempting to send email via Resend. to=${to}, subject=${subject}, from=${fromName} <${fromEmail}>`,
    );

    try {
      const result = await this.resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        html,
      });

      const data: any = (result as any)?.data;
      const error: any = (result as any)?.error;

      if (error) {
        this.logger.error(
          `Resend reported an error while sending email. to=${to}, subject=${subject}, code=${error.code}, name=${error.name}, message=${error.message}`,
        );
      } else {
        this.logger.log(
          `Email sent via Resend successfully. to=${to}, subject=${subject}, id=${data?.id ?? 'unknown'}`,
        );
      }
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `Unexpected error while sending email via Resend. to=${to}, subject=${subject}, message=${
          error.message
        }`,
        error.stack,
      );
      throw err;
    }
  }

  async sendOrderPlacedAdmin(order: EmailOrder, language?: string) {
    const adminEmail = this.configService.get<string>('ADMIN_ORDER_EMAIL');
    if (!adminEmail) {
      this.logger.warn(
        `ADMIN_ORDER_EMAIL is not configured. Skipping admin notification email for order ${order.id}.`,
      );
      return;
    }

    const copy = getEmailCopy(language);
    const currency = order.region?.currency || 'EUR';
    const shortId = this.formatOrderIdDisplay(order.id);
    const content = `
      <p>${copy.adminOrderNewPlaced}</p>
      <p><strong>${copy.orderId}:</strong> #${shortId}</p>
      <p><strong>${copy.total}:</strong> ${this.formatCurrency(order.total, currency)}</p>
      <p><strong>${copy.customer}:</strong> ${order.user?.email || order.guestEmail || copy.guest}</p>
      <p><strong>${copy.items}:</strong></p>
      <ul>${this.buildOrderItems(order)}</ul>
    `;

    this.logger.log(
      `Sending admin order placed email. orderId=${order.id}, adminEmail=${adminEmail}, status=${order.status}`,
    );

    await this.sendMail(
      adminEmail,
      `${copy.adminOrderSubject} - #${shortId}`,
      this.buildEmailLayout(copy.adminOrderTitle, content),
    );
  }

  async sendOrderConfirmationCustomer(order: EmailOrder, language?: string) {
    const customerEmail = order.user?.email || order.guestEmail;
    if (!customerEmail) {
      this.logger.warn(
        `Customer email missing for order ${order.id}. Skipping order confirmation email.`,
      );
      return;
    }

    const copy = getEmailCopy(language);
    const currency = order.region?.currency || 'EUR';
    const shortId = this.formatOrderIdDisplay(order.id);
    const content = `
      <p>${copy.orderConfirmationIntro}</p>
      <p><strong>${copy.orderId}:</strong> #${shortId}</p>
      <p><strong>${copy.total}:</strong> ${this.formatCurrency(order.total, currency)}</p>
      <p><strong>${copy.shippingAddress}:</strong> ${this.formatAddress(order.shippingAddress)}</p>
      <p><strong>${copy.items}:</strong></p>
      <ul>${this.buildOrderItems(order)}</ul>
    `;

    this.logger.log(
      `Sending customer order confirmation email. orderId=${order.id}, customerEmail=${customerEmail}, status=${order.status}`,
    );

    await this.sendMail(
      customerEmail,
      `${copy.orderConfirmationSubject} - #${shortId}`,
      this.buildEmailLayout(copy.orderConfirmationTitle, content),
    );
  }

  /**
   * Sends a withdrawal/return/cancellation request from the customer to the company email.
   * Recipient is company email from branding or ADMIN_ORDER_EMAIL.
   * Email subject and labels use the language from the request (payload.language / frontend language).
   */
  async sendWithdrawalReturnRequest(payload: {
    orderNumber: string;
    fullName: string;
    email: string;
    deliveryAddress: string;
    requestType: string;
    reason: string;
    language?: string;
  }): Promise<void> {
    const company = (this.branding as { company?: { email?: string } })?.company;
    const toEmail =
      company?.email?.trim() || this.configService.get<string>('ADMIN_ORDER_EMAIL')?.trim();
    if (!toEmail) {
      this.logger.warn(
        'Neither branding.company.email nor ADMIN_ORDER_EMAIL is set. Skipping withdrawal/return request email.',
      );
      return;
    }

    const copy = getEmailCopy(payload.language);
    const subject = `${copy.withdrawalSubject} ${payload.orderNumber}`;
    const content = `
      <p>${copy.withdrawalIntro}</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
        <tr><td style="padding: 6px 8px; border: 1px solid #e5e7eb;"><strong>${copy.orderNumber}</strong></td><td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${escapeHtml(payload.orderNumber)}</td></tr>
        <tr><td style="padding: 6px 8px; border: 1px solid #e5e7eb;"><strong>${copy.name}</strong></td><td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${escapeHtml(payload.fullName)}</td></tr>
        <tr><td style="padding: 6px 8px; border: 1px solid #e5e7eb;"><strong>${copy.email}</strong></td><td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${escapeHtml(payload.email)}</td></tr>
        <tr><td style="padding: 6px 8px; border: 1px solid #e5e7eb;"><strong>${copy.deliveryAddress}</strong></td><td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${escapeHtml(payload.deliveryAddress)}</td></tr>
        <tr><td style="padding: 6px 8px; border: 1px solid #e5e7eb;"><strong>${copy.requestType}</strong></td><td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${escapeHtml(payload.requestType)}</td></tr>
        <tr><td style="padding: 6px 8px; border: 1px solid #e5e7eb;"><strong>${copy.reasonNotes}</strong></td><td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${escapeHtml(payload.reason)}</td></tr>
        <tr><td style="padding: 6px 8px; border: 1px solid #e5e7eb;"><strong>${copy.language}</strong></td><td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${escapeHtml(payload.language || '—')}</td></tr>
      </table>
    `;

    this.logger.log(
      `Sending withdrawal/return request email. to=${toEmail}, orderNumber=${payload.orderNumber}`,
    );
    await this.sendMail(
      toEmail,
      subject,
      this.buildEmailLayout(copy.withdrawalTitle, content),
    );
  }

  async sendOrderStatusUpdate(order: EmailOrder, language?: string) {
    const customerEmail = order.user?.email || order.guestEmail;
    if (!customerEmail) {
      this.logger.warn(
        `Customer email missing for order ${order.id}. Skipping order status update email.`,
      );
      return;
    }

    const copy = getEmailCopy(language);
    const currency = order.region?.currency || 'EUR';
    const trackingLine = order.trackingNumber
      ? `<p><strong>${copy.trackingNumber}:</strong> ${order.trackingNumber}</p>`
      : '';

    const shortId = this.formatOrderIdDisplay(order.id);
    const statusLabel = this.getStatusLabel(order.status, copy);
    const content = `
      <p>${copy.orderStatusIntro} <strong>${statusLabel}</strong>.</p>
      <p><strong>${copy.orderId}:</strong> #${shortId}</p>
      ${trackingLine}
      <p><strong>${copy.total}:</strong> ${this.formatCurrency(order.total, currency)}</p>
      <p><strong>${copy.shippingAddress}:</strong> ${this.formatAddress(order.shippingAddress)}</p>
      <p><strong>${copy.items}:</strong></p>
      <ul>${this.buildOrderItems(order)}</ul>
    `;

    this.logger.log(
      `Sending customer order status update email. orderId=${order.id}, customerEmail=${customerEmail}, status=${order.status}`,
    );

    await this.sendMail(
      customerEmail,
      `${copy.orderStatusSubject} #${shortId} - ${order.status}`,
      this.buildEmailLayout(copy.orderStatusTitle, content),
    );
  }
}
