import mongoose from 'mongoose';
import {
    createProductSupplierMessageService,
    listCustomerSupplierMessagesService,
    listSupplierMessagesService,
    markSupplierMessageThreadReadService,
    replySupplierMessageThreadService,
} from '../services/supplier-messages.js';
import { HttpError } from '../utils/http-error.js';

const assertValidObjectId = (id, label = 'id') => {
    if (!mongoose.isValidObjectId(id)) {
        throw new HttpError(`Invalid ${label} format`, 400);
    }
};

export const supplierMessagesController = () => {
    const createProductMessage = async (req, res, next) => {
        try {
            assertValidObjectId(req.params.productId, 'productId');
            const thread = await createProductSupplierMessageService(
                req.params.productId,
                req.user.id,
                req.body,
            );
            return res.status(201).json(thread);
        } catch (error) {
            next(error);
        }
    };

    const listMyMessages = async (req, res, next) => {
        try {
            const threads = await listCustomerSupplierMessagesService(
                req.user.id,
            );
            return res.status(200).json(threads);
        } catch (error) {
            next(error);
        }
    };

    const listSupplierMessages = async (req, res, next) => {
        try {
            const threads = await listSupplierMessagesService(req.user.id);
            return res.status(200).json(threads);
        } catch (error) {
            next(error);
        }
    };

    const replyMessage = async (req, res, next) => {
        try {
            assertValidObjectId(req.params.id);
            const thread = await replySupplierMessageThreadService(
                req.params.id,
                req.user,
                req.body.message,
            );
            return res.status(200).json(thread);
        } catch (error) {
            next(error);
        }
    };

    const markMessageRead = async (req, res, next) => {
        try {
            assertValidObjectId(req.params.id);
            const thread = await markSupplierMessageThreadReadService(
                req.params.id,
                req.user,
            );
            return res.status(200).json(thread);
        } catch (error) {
            next(error);
        }
    };

    return {
        createProductMessage,
        listMyMessages,
        listSupplierMessages,
        replyMessage,
        markMessageRead,
    };
};
