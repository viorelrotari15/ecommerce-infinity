import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as path from 'path';
import * as fs from 'fs';

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

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private isConfigured = false;
  private branding: BrandingConfig | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey?.trim()) {
      this.resend = new Resend(apiKey.trim());
      this.isConfigured = true;
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

  private getStatusLabel(status: string) {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'PROCESSING':
        return 'Processing';
      case 'SHIPPED':
        return 'Shipped';
      case 'DELIVERED':
        return 'Delivered';
      case 'CANCELLED':
        return 'Cancelled';
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
      console.warn('Resend email service not configured (RESEND_API_KEY missing). Skipping email.');
      return;
    }

    const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
    const fromName = this.configService.get<string>('RESEND_FROM_NAME') || this.getBranding().name;

    await this.resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
    });
  }

  async sendOrderPlacedAdmin(order: EmailOrder) {
    const adminEmail = this.configService.get<string>('ADMIN_ORDER_EMAIL');
    if (!adminEmail) {
      return;
    }

    const currency = order.region?.currency || 'EUR';
    const content = `
      <p>A new order has been placed and paid.</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Total:</strong> ${this.formatCurrency(order.total, currency)}</p>
      <p><strong>Customer:</strong> ${order.user?.email || order.guestEmail || 'Guest'}</p>
      <p><strong>Items:</strong></p>
      <ul>${this.buildOrderItems(order)}</ul>
    `;

    await this.sendMail(adminEmail, `New order received - ${order.id}`, this.buildEmailLayout('New order received', content));
  }

  async sendOrderConfirmationCustomer(order: EmailOrder) {
    const customerEmail = order.user?.email || order.guestEmail;
    if (!customerEmail) {
      return;
    }

    const currency = order.region?.currency || 'EUR';
    const content = `
      <p>Your order has been confirmed and payment was successful.</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Total:</strong> ${this.formatCurrency(order.total, currency)}</p>
      <p><strong>Shipping address:</strong> ${this.formatAddress(order.shippingAddress)}</p>
      <p><strong>Items:</strong></p>
      <ul>${this.buildOrderItems(order)}</ul>
    `;

    await this.sendMail(
      customerEmail,
      `Order confirmation - ${order.id}`,
      this.buildEmailLayout('Order confirmed', content),
    );
  }

  async sendOrderStatusUpdate(order: EmailOrder) {
    const customerEmail = order.user?.email || order.guestEmail;
    if (!customerEmail) {
      return;
    }

    const currency = order.region?.currency || 'EUR';
    const trackingLine = order.trackingNumber
      ? `<p><strong>Tracking number (DHL):</strong> ${order.trackingNumber}</p>`
      : '';

    const content = `
      <p>Your order status has been updated to <strong>${this.getStatusLabel(order.status)}</strong>.</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      ${trackingLine}
      <p><strong>Total:</strong> ${this.formatCurrency(order.total, currency)}</p>
      <p><strong>Shipping address:</strong> ${this.formatAddress(order.shippingAddress)}</p>
      <p><strong>Items:</strong></p>
      <ul>${this.buildOrderItems(order)}</ul>
    `;

    await this.sendMail(
      customerEmail,
      `Order update - ${order.status}`,
      this.buildEmailLayout('Order status update', content),
    );
  }
}
