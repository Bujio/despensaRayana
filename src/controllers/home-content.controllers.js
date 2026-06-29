import {
    getHomeContentService,
    updateHomeContentService,
    uploadHomeImagesService,
} from '../services/home-content.js';

export const homeContentController = () => {
    const getHomeContent = async (_req, res, next) => {
        try {
            const content = await getHomeContentService();
            return res.status(200).json(content);
        } catch (error) {
            next(error);
        }
    };

    const updateHomeContent = async (req, res, next) => {
        try {
            const content = await updateHomeContentService(
                req.body,
                req.user?.id,
            );
            return res.status(200).json(content);
        } catch (error) {
            next(error);
        }
    };

    const uploadHomeImages = async (req, res, next) => {
        try {
            if (!req.files?.length) {
                return res.status(400).json({ message: 'No images provided' });
            }
            const images = await uploadHomeImagesService(req.files);
            return res.status(200).json({ images });
        } catch (error) {
            next(error);
        }
    };

    return {
        getHomeContent,
        updateHomeContent,
        uploadHomeImages,
    };
};
