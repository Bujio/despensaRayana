import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

/**
 * Cloudinary se configura desde variables de entorno.
 * Variables necesarias en .env:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Storage de Cloudinary para multer.
 * Las imágenes se suben a la carpeta "products" en Cloudinary
 * y se convierten automáticamente a WebP para optimizar el peso.
 */
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
            { width: 800, crop: 'limit', format: 'webp', quality: 'auto' },
        ],
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
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // máximo 5 MB por imagen
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'));
        }
        cb(null, true);
    },
}).array('images', 5);
