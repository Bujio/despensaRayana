import nodemailer from 'nodemailer';

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
 */
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465, // true solo para puerto 465 (SSL)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Envía un email genérico. Función base usada por las demás.
 *
 * @param {{ to: string, subject: string, html: string }} options
 * @returns {Promise<void>}
 */
const sendEmail = async ({ to, subject, html }) => {
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
    });
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
                    <td>${sku}</td>
                    <td>${count ?? 1}</td>
                    <td>${price.toFixed(2)} €</td>
                </tr>`,
        )
        .join('');

    await sendEmail({
        to: order.email,
        subject: `Order confirmed — #${order._id}`,
        html: `
            <h2>Thanks for your order!</h2>
            <p>Your order <strong>#${order._id}</strong> has been received and is being processed.</p>
            <table border="1" cellpadding="6" cellspacing="0">
                <thead>
                    <tr><th>SKU</th><th>Qty</th><th>Price</th></tr>
                </thead>
                <tbody>${productRows}</tbody>
            </table>
            ${order.total ? `<p><strong>Total: ${order.total.toFixed(2)} €</strong></p>` : ''}
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
        `Order status updated to: ${order.status}`;

    await sendEmail({
        to: order.email,
        subject: `Order #${order._id} — ${order.status}`,
        html: `
            <h2>Order update</h2>
            <p>Order <strong>#${order._id}</strong>: ${message}</p>
        `,
    });
};
