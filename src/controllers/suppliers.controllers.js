import {
    approveSupplierService,
    deactivateSupplierService,
    getSupplierByIdService,
    getSupplierForUserService,
    listSuppliersService,
    reactivateSupplierService,
    registerSupplierService,
    rejectSupplierService,
    setSupplierFeaturedService,
    setSupplierInternalNotesService,
    updateSupplierProfileService,
} from '../services/suppliers.js';
import { HttpError } from '../utils/http-error.js';

export const suppliersController = () => {
    const registerSupplier = async (req, res, next) => {
        try {
            const { user, supplier } = await registerSupplierService(req.body);
            return res.status(201).json({
                user,
                supplier,
                message:
                    'Tu solicitud de proveedor se ha registrado correctamente. Te hemos asignado el código de proveedor: ' +
                    supplier.supplierCode +
                    '. Tu perfil queda pendiente de revisión por parte de La Despensa Rayana. Podrás completar tu perfil y preparar tus productos, pero no serán visibles en la tienda hasta que tu proveedor sea aprobado.',
            });
        } catch (error) {
            next(error);
        }
    };

    const listSuppliers = async (req, res, next) => {
        try {
            const suppliers = await listSuppliersService({
                status: req.query.status,
                search: req.query.search?.trim() || undefined,
            });
            return res.status(200).json({ data: suppliers });
        } catch (error) {
            next(error);
        }
    };

    const getSupplier = async (req, res, next) => {
        try {
            const supplier = await getSupplierByIdService(req.params.id);
            if (!supplier) throw new HttpError('Supplier not found', 404);
            return res.status(200).json(supplier);
        } catch (error) {
            next(error);
        }
    };

    const getMySupplier = async (req, res, next) => {
        try {
            const supplier = await getSupplierForUserService(req.user.id);
            if (!supplier)
                throw new HttpError('Supplier profile not found', 404);
            return res.status(200).json(supplier);
        } catch (error) {
            next(error);
        }
    };

    const updateMySupplier = async (req, res, next) => {
        try {
            const supplier = await updateSupplierProfileService(
                req.user.id,
                req.body,
            );
            return res.status(200).json(supplier);
        } catch (error) {
            next(error);
        }
    };

    const approveSupplier = async (req, res, next) => {
        try {
            const supplier = await approveSupplierService(
                req.params.id,
                req.user.id,
            );
            return res.status(200).json(supplier);
        } catch (error) {
            next(error);
        }
    };

    const rejectSupplier = async (req, res, next) => {
        try {
            const supplier = await rejectSupplierService(
                req.params.id,
                req.user.id,
                req.body.reason || '',
            );
            return res.status(200).json(supplier);
        } catch (error) {
            next(error);
        }
    };

    const deactivateSupplier = async (req, res, next) => {
        try {
            const supplier = await deactivateSupplierService(
                req.params.id,
                req.user.id,
            );
            return res.status(200).json(supplier);
        } catch (error) {
            next(error);
        }
    };

    const reactivateSupplier = async (req, res, next) => {
        try {
            const supplier = await reactivateSupplierService(
                req.params.id,
                req.user.id,
            );
            return res.status(200).json(supplier);
        } catch (error) {
            next(error);
        }
    };

    const setFeatured = async (req, res, next) => {
        try {
            const supplier = await setSupplierFeaturedService(
                req.params.id,
                req.body.featured,
            );
            return res.status(200).json(supplier);
        } catch (error) {
            next(error);
        }
    };

    const setInternalNotes = async (req, res, next) => {
        try {
            const supplier = await setSupplierInternalNotesService(
                req.params.id,
                req.body.internalNotes || '',
            );
            return res.status(200).json(supplier);
        } catch (error) {
            next(error);
        }
    };

    return {
        approveSupplier,
        deactivateSupplier,
        getMySupplier,
        getSupplier,
        listSuppliers,
        reactivateSupplier,
        registerSupplier,
        rejectSupplier,
        setFeatured,
        setInternalNotes,
        updateMySupplier,
    };
};
