import { Router } from 'express';
import { supplierReportsController } from '../controllers/supplier-reports.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

const { getOrders, getProductsReport, getSalesReport } =
    supplierReportsController();

export const supplierRouter = Router();

/**
 * @openapi
 * tags:
 *   name: Supplier
 *   description: Panel privado del proveedor autenticado
 *
 * /supplier/reports/sales:
 *   get:
 *     tags: [Supplier]
 *     summary: Informe de ventas de productos propios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Métricas de ventas del proveedor }
 *       403: { description: Solo proveedores }
 *
 * /supplier/reports/products:
 *   get:
 *     tags: [Supplier]
 *     summary: Informe de rendimiento de productos propios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Métricas por producto del proveedor }
 *       403: { description: Solo proveedores }
 *
 * /supplier/orders:
 *   get:
 *     tags: [Supplier]
 *     summary: Pedidos que contienen productos del proveedor autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Pedidos filtrados a líneas propias del proveedor }
 *       403: { description: Solo proveedores }
 */
supplierRouter.get(
    '/reports/sales',
    authMiddleware,
    roleMiddleware('supplier'),
    getSalesReport,
);

supplierRouter.get(
    '/reports/products',
    authMiddleware,
    roleMiddleware('supplier'),
    getProductsReport,
);

supplierRouter.get(
    '/orders',
    authMiddleware,
    roleMiddleware('supplier'),
    getOrders,
);
