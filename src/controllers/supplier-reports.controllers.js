import {
    getSupplierOrdersService,
    getSupplierProductsReportService,
    getSupplierSalesReportService,
} from '../services/supplier-reports.js';

export const supplierReportsController = () => {
    const getSalesReport = async (req, res, next) => {
        try {
            const report = await getSupplierSalesReportService(req.user.id);
            return res.status(200).json(report);
        } catch (error) {
            next(error);
        }
    };

    const getProductsReport = async (req, res, next) => {
        try {
            const report = await getSupplierProductsReportService(req.user.id);
            return res.status(200).json(report);
        } catch (error) {
            next(error);
        }
    };

    const getOrders = async (req, res, next) => {
        try {
            const orders = await getSupplierOrdersService(req.user.id);
            return res.status(200).json({ data: orders });
        } catch (error) {
            next(error);
        }
    };

    return {
        getOrders,
        getProductsReport,
        getSalesReport,
    };
};
