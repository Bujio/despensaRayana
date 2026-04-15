import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

/**
 * Transporter de Nodemailer configurado desde variables de entorno.
 * Compatible con cualquier proveedor SMTP: SendGrid, Resend, Gmail, Mailtrap...
 *
 * Variables necesarias en .env:
 *   EMAIL_HOST     → ej. smtp.sendgrid.net
 *   EMAIL_PORT     → ej. 587
 *   EMAIL_USER     → usuario SMTP (o "apikey" en SendGrid)
 *   EMAIL_PASS     → contraseña o API key
 *   EMAIL_FROM     → dirección remitente, ej. no-reply@despensa-rayana.com
 *   APP_BASE_URL   → URL pública del frontend (para los enlaces de los emails)
 */
/**
 * En entorno de tests usamos `jsonTransport` de nodemailer, que serializa
 * el email a JSON en lugar de abrir conexiones SMTP reales. Así los tests
 * no cuelgan esperando a un servidor que no existe y no generamos tráfico.
 */
const transporter =
    process.env.NODE_ENV === 'test'
        ? nodemailer.createTransport({ jsonTransport: true })
        : nodemailer.createTransport({
              host: process.env.EMAIL_HOST,
              port: Number(process.env.EMAIL_PORT),
              secure: Number(process.env.EMAIL_PORT) === 465, // true solo para puerto 465 (SSL)
              auth: {
                  user: process.env.EMAIL_USER,
                  pass: process.env.EMAIL_PASS,
              },
          });

/**
 * Escapa caracteres HTML peligrosos antes de interpolarlos en un template.
 * Protege contra inyección de HTML/JS si un valor proviene de input del usuario.
 */
const escapeHtml = (value) => {
    if (value == null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

/**
 * Espera `ms` milisegundos. Usado para el backoff exponencial.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_EMAIL_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 500;

/**
 * Envía un email con reintentos y backoff exponencial.
 *
 * Si el envío falla por un error transitorio (red, rate limit del SMTP,
 * 5xx del proveedor), esperamos un tiempo creciente entre intentos
 * (500ms → 1s → 2s) antes de dar por perdido el mensaje. Tras MAX_EMAIL_ATTEMPTS
 * intentos, propagamos el último error.
 *
 * Nota: estos reintentos viven solo en memoria. Si el proceso cae entre
 * intentos, el email se pierde. Para reintentos persistentes habría que
 * llevar la cola a un sistema externo (Bull/Redis, SQS, etc.).
 */
const sendWithRetry = async ({ to, subject, html }) => {
    let lastErr;
    for (let attempt = 1; attempt <= MAX_EMAIL_ATTEMPTS; attempt++) {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to,
                subject,
                html,
            });
            if (attempt > 1) {
                logger.info(`Email to ${to} sent on attempt ${attempt}`);
            }
            return;
        } catch (err) {
            lastErr = err;
            logger.warn(
                `Email attempt ${attempt}/${MAX_EMAIL_ATTEMPTS} to ${to} failed: ${err.message}`,
            );
            if (attempt < MAX_EMAIL_ATTEMPTS) {
                await sleep(INITIAL_BACKOFF_MS * 2 ** (attempt - 1));
            }
        }
    }
    throw lastErr;
};

/**
 * Envía la confirmación de un pedido recién creado.
 *
 * @param {{ email: string, _id: string, products: Array, total: number }} order
 */
export const sendOrderConfirmationEmail = async (order) => {
    const productRows = order.products
        .map(
            ({ sku, count, price }) =>
                `<tr>
                    <td>${escapeHtml(sku)}</td>
                    <td>${escapeHtml(count ?? 1)}</td>
                    <td>${escapeHtml(price.toFixed(2))} €</td>
                </tr>`,
        )
        .join('');

    const orderId = escapeHtml(order._id);

    await sendWithRetry({
        to: order.email,
        subject: `Order confirmed — #${order._id}`,
        html: `
            <h2>Thanks for your order!</h2>
            <p>Your order <strong>#${orderId}</strong> has been received and is being processed.</p>
            <table border="1" cellpadding="6" cellspacing="0">
                <thead>
                    <tr><th>SKU</th><th>Qty</th><th>Price</th></tr>
                </thead>
                <tbody>${productRows}</tbody>
            </table>
            ${order.total ? `<p><strong>Total: ${escapeHtml(order.total.toFixed(2))} €</strong></p>` : ''}
            <p>We'll notify you when the status changes.</p>
        `,
    });
};

/**
 * Envía una notificación cuando el estado de un pedido cambia.
 *
 * @param {{ email: string, _id: string, status: string }} order
 */
export const sendOrderStatusEmail = async (order) => {
    const statusMessages = {
        processing: 'Your order is being prepared.',
        shipped: 'Your order is on its way!',
        delivered: 'Your order has been delivered. Enjoy!',
        cancelled: 'Your order has been cancelled.',
    };

    const message =
        statusMessages[order.status] ??
        `Order status updated to: ${escapeHtml(order.status)}`;

    const orderId = escapeHtml(order._id);

    await sendWithRetry({
        to: order.email,
        subject: `Order #${order._id} — ${order.status}`,
        html: `
            <h2>Order update</h2>
            <p>Order <strong>#${orderId}</strong>: ${message}</p>
        `,
    });
};

/**
 * Envía el email de verificación con el enlace que contiene el token plano.
 * El token se consume en GET /api/auth/verify/:token.
 *
 * @param {{ email: string, name: string }} user
 * @param {string} plainToken - Token sin hashear (lo que el usuario recibe)
 */
export const sendEmailVerificationEmail = async (user, plainToken) => {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const link = `${baseUrl}/verify-email?token=${encodeURIComponent(plainToken)}`;
    const name = escapeHtml(user.name);

    await sendWithRetry({
        to: user.email,
        subject: 'Verify your email — Despensa Rayana',
        html: `
            <h2>Welcome, ${name}!</h2>
            <p>Thanks for signing up. Please confirm your email by clicking the link below:</p>
            <p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>
            <p>The link expires in 24 hours. If you didn't sign up, ignore this email.</p>
        `,
    });
};
