import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

const CLOUDINARY_PLACEHOLDERS = new Set([
    'your_cloud_name',
    'your_api_key',
    'your_api_secret',
]);
const ALLOWED_IMAGE_TYPES = new Map([
    ['image/jpeg', new Set(['.jpg', '.jpeg'])],
    ['image/png', new Set(['.png'])],
    ['image/webp', new Set(['.webp'])],
]);

const hasCloudinaryConfig = [
    process.env.CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
].every((value) => value && !CLOUDINARY_PLACEHOLDERS.has(value));

/**
 * Cloudinary se configura solo cuando hay credenciales reales.
 * Si no, multer guarda los archivos localmente en uploads/products.
 */
if (hasCloudinaryConfig) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

const cloudinaryStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
            { width: 800, crop: 'limit', format: 'webp', quality: 'auto' },
        ],
    },
});

const uploadDir = path.resolve('uploads/products');
const localStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeExt = ALLOWED_IMAGE_TYPES.get(file.mimetype)?.has(ext)
            ? ext
            : '.jpg';
        cb(null, `${Date.now()}-${crypto.randomUUID()}${safeExt}`);
    },
});

/**
 * Middleware de subida de imágenes.
 * Acepta un máximo de 5 imágenes por petición bajo el campo "images".
 * Valida el tipo MIME antes de subir para rechazar archivos no permitidos.
 *
 * Uso en una ruta:
 *   router.post('/:id/images', authMiddleware, upload, uploadImagesController)
 */
export const upload = multer({
    storage: hasCloudinaryConfig ? cloudinaryStorage : localStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // máximo 5 MB por imagen
        files: 5,
        fields: 20,
    },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ALLOWED_IMAGE_TYPES.get(file.mimetype);
        if (!allowedExts?.has(ext)) {
            return cb(new Error('Only JPG, PNG or WebP images are allowed'));
        }
        cb(null, true);
    },
}).array('images', 5);
