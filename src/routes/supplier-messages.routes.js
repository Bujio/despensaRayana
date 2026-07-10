import { Router } from 'express';
import { supplierMessagesController } from '../controllers/supplier-messages.controllers.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { writeLimiter } from '../middlewares/ratelimit.middleware.js';
import {
    createSupplierMessageSchema,
    replySupplierMessageSchema,
} from '../schemas/supplier-message.schema.js';

const {
    createProductMessage,
    listMyMessages,
    listSupplierMessages,
    replyMessage,
    markMessageRead,
} = supplierMessagesController();

export const supplierMessagesRouter = Router();

supplierMessagesRouter.get('/me', authMiddleware, listMyMessages);
supplierMessagesRouter.get(
    '/supplier',
    authMiddleware,
    roleMiddleware('supplier'),
    listSupplierMessages,
);
supplierMessagesRouter.post(
    '/product/:productId',
    writeLimiter,
    authMiddleware,
    roleMiddleware('user', 'admin'),
    validate(createSupplierMessageSchema),
    createProductMessage,
);
supplierMessagesRouter.post(
    '/:id/reply',
    writeLimiter,
    authMiddleware,
    validate(replySupplierMessageSchema),
    replyMessage,
);
supplierMessagesRouter.patch('/:id/read', authMiddleware, markMessageRead);
