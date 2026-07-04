import { Order } from '../db/models/order.model.js';
import { Product } from '../db/models/product.model.js';
import { Supplier } from '../db/models/supplier.model.js';
import { HttpError } from '../utils/http-error.js';

const getSupplierWithProducts = async (userId) => {
    const supplier = await Supplier.findOne({ userId });
    if (!supplier) throw new HttpError('Supplier profile not found', 404);

    const products = await Product.find({ supplierRef: supplier._id }).populate(
        'category',
        'name slug',
    );

    return { supplier, products };
};

const getOwnOrderLines = async (userId) => {
    const { products } = await getSupplierWithProducts(userId);
    const productBySku = new Map(
        products.map((product) => [product.sku, product]),
    );
    const ownSkus = [...productBySku.keys()];

    if (!ownSkus.length) return { products, orders: [] };

    const orders = await Order.find({ 'products.sku': { $in: ownSkus } }).sort({
        createdAt: -1,
    });

    return {
        products,
        orders: orders
            .map((order) => {
                const lines = order.products
                    .filter((line) => productBySku.has(line.sku))
                    .map((line) => {
                        const product = productBySku.get(line.sku);
                        const units = Number(line.count || 0);
                        const revenue = Number(
                            line.total || line.price * units || 0,
                        );
                        return {
                            sku: line.sku,
                            productId: product._id,
                            productName: product.name,
                            units,
                            price: Number(line.price || 0),
                            revenue,
                        };
                    });

                return {
                    orderId: order._id,
                    date: order.date || order.createdAt,
                    status: order.status,
                    cancellation: order.cancellation,
                    refund: order.refund,
                    lines,
                    ownRevenue: lines.reduce(
                        (total, line) => total + line.revenue,
                        0,
                    ),
                    ownUnits: lines.reduce(
                        (total, line) => total + line.units,
                        0,
                    ),
                };
            })
            .filter((order) => order.lines.length),
    };
};

export const getSupplierOrdersService = async (userId) => {
    const { orders } = await getOwnOrderLines(userId);
    return orders;
};

export const getSupplierSalesReportService = async (userId) => {
    const { orders } = await getOwnOrderLines(userId);
    const activeOrders = orders.filter((order) => order.status !== 'cancelled');
    const cancelledOrders = orders.filter(
        (order) => order.status === 'cancelled',
    );
    const revenueByDate = new Map();

    for (const order of activeOrders) {
        const key = new Date(order.date || Date.now())
            .toISOString()
            .slice(0, 10);
        revenueByDate.set(
            key,
            (revenueByDate.get(key) || 0) + order.ownRevenue,
        );
    }

    return {
        totalRevenueFromOwnProducts: activeOrders.reduce(
            (total, order) => total + order.ownRevenue,
            0,
        ),
        totalUnitsSoldFromOwnProducts: activeOrders.reduce(
            (total, order) => total + order.ownUnits,
            0,
        ),
        ordersWithOwnProducts: activeOrders.length,
        cancelledOrdersWithOwnProducts: cancelledOrders.length,
        cancellationsAmountFromOwnProducts: cancelledOrders.reduce(
            (total, order) => total + order.ownRevenue,
            0,
        ),
        refundsAmountFromOwnProducts: cancelledOrders.reduce(
            (total, order) =>
                total + Number(order.refund?.amount || order.ownRevenue || 0),
            0,
        ),
        pendingOrdersContainingOwnProducts: activeOrders.filter(
            (order) =>
                order.status === 'pending' || order.status === 'processing',
        ).length,
        revenueByDate: [...revenueByDate.entries()].map(([date, revenue]) => ({
            date,
            revenue,
        })),
    };
};

export const getSupplierProductsReportService = async (userId) => {
    const { products, orders } = await getOwnOrderLines(userId);
    const activeOrders = orders.filter((order) => order.status !== 'cancelled');
    const cancelledOrders = orders.filter(
        (order) => order.status === 'cancelled',
    );
    const statsBySku = new Map();

    for (const product of products) {
        statsBySku.set(product.sku, {
            sku: product.sku,
            productId: product._id,
            productName: product.name,
            revenue: 0,
            units: 0,
            cancellations: 0,
            cancellationAmount: 0,
            refundAmount: 0,
            stock: product.stock || 0,
            status: product.status,
        });
    }

    for (const order of activeOrders) {
        for (const line of order.lines) {
            const current = statsBySku.get(line.sku);
            if (!current) continue;
            current.revenue += line.revenue;
            current.units += line.units;
        }
    }

    for (const order of cancelledOrders) {
        for (const line of order.lines) {
            const current = statsBySku.get(line.sku);
            if (!current) continue;
            current.cancellations += line.units;
            current.cancellationAmount += line.revenue;
            current.refundAmount += line.revenue;
        }
    }

    const revenueByProduct = [...statsBySku.values()].sort(
        (a, b) => b.revenue - a.revenue,
    );

    return {
        productCount: products.length,
        activeProducts: products.filter(
            (product) => product.status === 'published',
        ).length,
        pendingProducts: products.filter(
            (product) => product.status === 'pending_review',
        ).length,
        outOfStockProducts: products.filter(
            (product) => Number(product.stock || 0) === 0,
        ).length,
        bestSellingOwnProducts: revenueByProduct
            .filter((product) => product.units > 0)
            .slice(0, 5),
        revenueByProduct,
    };
};
