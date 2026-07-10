import { Product } from '../db/models/product.model.js';
import { SupplierMessageThread } from '../db/models/supplier-message.model.js';
import { Supplier } from '../db/models/supplier.model.js';
import { HttpError } from '../utils/http-error.js';

const populateThread = (query) =>
    query
        .populate('product', 'name sku images supplierRef supplier')
        .populate('supplier', 'name supplierCode status logo mainImage')
        .populate('customer', 'name email')
        .populate('messages.sender', 'name email role');

const enrichThread = (thread) => {
    if (!thread) return null;
    const data =
        typeof thread.toObject === 'function' ? thread.toObject() : thread;
    const lastMessage = data.messages?.[data.messages.length - 1] || null;
    const lastDate = lastMessage?.createdAt
        ? new Date(lastMessage.createdAt)
        : null;
    const supplierReadAt = data.supplierReadAt
        ? new Date(data.supplierReadAt)
        : null;
    const customerReadAt = data.customerReadAt
        ? new Date(data.customerReadAt)
        : null;

    return {
        ...data,
        lastMessage,
        supplierUnread:
            Boolean(lastDate) &&
            lastMessage?.senderRole === 'user' &&
            (!supplierReadAt || lastDate > supplierReadAt),
        customerUnread:
            Boolean(lastDate) &&
            lastMessage?.senderRole === 'supplier' &&
            (!customerReadAt || lastDate > customerReadAt),
    };
};

const enrichThreads = (threads) => threads.map(enrichThread);

const getSupplierForUser = async (userId) => {
    const supplier = await Supplier.findOne({ userId });
    if (!supplier) throw new HttpError('Supplier profile not found', 404);
    return supplier;
};

const getThreadForParticipant = async (threadId, user) => {
    const thread = await SupplierMessageThread.findById(threadId);
    if (!thread) throw new HttpError('Message thread not found', 404);

    if (String(thread.customer) === String(user.id)) {
        return { thread, senderRole: 'user' };
    }

    if (user.role === 'supplier') {
        const supplier = await getSupplierForUser(user.id);
        if (String(thread.supplier) === String(supplier._id)) {
            return { thread, senderRole: 'supplier' };
        }
    }

    throw new HttpError('Forbidden', 403);
};

export const createProductSupplierMessageService = async (
    productId,
    userId,
    data,
) => {
    const product = await Product.findById(productId).populate(
        'supplierRef',
        'name supplierCode status userId',
    );
    if (!product) throw new HttpError('Product not found', 404);
    if (!product.supplierRef)
        throw new HttpError('This product does not have a supplier', 400);
    if (String(product.supplierRef.userId || '') === String(userId)) {
        throw new HttpError('Suppliers cannot contact themselves', 400);
    }

    const now = new Date();
    const thread = await SupplierMessageThread.create({
        product: product._id,
        supplier: product.supplierRef._id,
        customer: userId,
        subject: data.subject || '',
        status: 'open',
        messages: [
            {
                sender: userId,
                senderRole: 'user',
                body: data.message,
            },
        ],
        customerReadAt: now,
        lastMessageAt: now,
    });

    return enrichThread(
        await populateThread(SupplierMessageThread.findById(thread._id)),
    );
};

export const listCustomerSupplierMessagesService = async (userId) => {
    const threads = await populateThread(
        SupplierMessageThread.find({ customer: userId }).sort({
            lastMessageAt: -1,
            updatedAt: -1,
        }),
    );
    return enrichThreads(threads);
};

export const listSupplierMessagesService = async (userId) => {
    const supplier = await getSupplierForUser(userId);
    const threads = await populateThread(
        SupplierMessageThread.find({ supplier: supplier._id }).sort({
            lastMessageAt: -1,
            updatedAt: -1,
        }),
    );
    return enrichThreads(threads);
};

export const replySupplierMessageThreadService = async (
    threadId,
    user,
    message,
) => {
    const { thread, senderRole } = await getThreadForParticipant(
        threadId,
        user,
    );
    const now = new Date();
    thread.messages.push({
        sender: user.id,
        senderRole,
        body: message,
    });
    thread.status = senderRole === 'supplier' ? 'answered' : 'open';
    thread.lastMessageAt = now;
    if (senderRole === 'supplier') thread.supplierReadAt = now;
    if (senderRole === 'user') thread.customerReadAt = now;
    await thread.save();

    return enrichThread(
        await populateThread(SupplierMessageThread.findById(thread._id)),
    );
};

export const markSupplierMessageThreadReadService = async (threadId, user) => {
    const { thread, senderRole } = await getThreadForParticipant(
        threadId,
        user,
    );
    const now = new Date();
    if (senderRole === 'supplier') thread.supplierReadAt = now;
    if (senderRole === 'user') thread.customerReadAt = now;
    await thread.save();

    return enrichThread(
        await populateThread(SupplierMessageThread.findById(thread._id)),
    );
};
