import {
    getHomeContentService,
    updateHomeContentService,
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

    return {
        getHomeContent,
        updateHomeContent,
    };
};
