import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import * as nodemailerNamespace from 'nodemailer';

// Handle CJS/ESM interop: default import can be undefined in compiled output
const nodemailer =
  (nodemailerNamespace as { default?: typeof nodemailerNamespace }).default ?? nodemailerNamespace;

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

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') || 0);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      this.isConfigured = true;
    }
  }

  private getBranding() {
    return {
      name: this.configService.get<string>('BRAND_NAME') || 'Ecommerce Infinity',
      logoUrl: this.configService.get<string>('BRAND_LOGO_URL') || '',
      primaryColor: this.configService.get<string>('BRAND_PRIMARY_COLOR') || '#111827',
      website: this.configService.get<string>('BRAND_WEBSITE') || '',
      supportEmail: this.configService.get<string>('BRAND_SUPPORT_EMAIL') || '',
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
      <div style="margin-top: 32px; font-size: 12px; color: #6b7280;">
        ${brand.website ? `<div>Website: <a href="${brand.website}" style="color: ${brand.primaryColor};">${brand.website}</a></div>` : ''}
        ${brand.supportEmail ? `<div>Support: ${brand.supportEmail}</div>` : ''}
      </div>
    `;

    return `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
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
    if (!this.transporter || !this.isConfigured) {
      console.warn('Email service not configured. Skipping email.');
      return;
    }

    const fromAddress = this.configService.get<string>('SMTP_FROM') || 'no-reply@localhost';
    const fromName = this.configService.get<string>('SMTP_FROM_NAME') || this.getBranding().name;

    await this.transporter.sendMail({
      to,
      from: `${fromName} <${fromAddress}>`,
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
