import {
    getHomeContentService,
    getHomeContentRevisionsService,
    restoreHomeContentRevisionService,
    updateHomeContentService,
    uploadHomeImagesService,
} from '../services/home-content.js';

export const homeContentController = () => {
    const getPublicHomeContent = async (_req, res, next) => {
        try {
            const content = await getHomeContentService({ publicOnly: true });
            return res.status(200).json(content);
        } catch (error) {
            next(error);
        }
    };

    const getAdminHomeContent = async (_req, res, next) => {
        try {
            const content = await getHomeContentService({ publicOnly: false });
            return res.status(200).json(content);
        } catch (error) {
            next(error);
        }
    };

    const getHomeContentRevisions = async (req, res, next) => {
        try {
            const revisions = await getHomeContentRevisionsService({
                limit: req.query.limit,
            });
            return res.status(200).json({ revisions });
        } catch (error) {
            next(error);
        }
    };

    const restoreHomeContentRevision = async (req, res, next) => {
        try {
            const content = await restoreHomeContentRevisionService(
                req.params.revisionId,
                req.user?.id,
            );
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
        getHomeContent: getPublicHomeContent,
        getPublicHomeContent,
        getAdminHomeContent,
        getHomeContentRevisions,
        restoreHomeContentRevision,
        updateHomeContent,
        uploadHomeImages,
    };
};
