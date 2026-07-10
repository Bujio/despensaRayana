import { HomeContent } from '../db/models/home-content.model.js';
import { HomeContentRevision } from '../db/models/home-content-revision.model.js';

const getApiBaseUrl = () => {
    const configured = process.env.PUBLIC_API_URL || process.env.API_BASE_URL;
    if (configured) return configured.replace(/\/$/, '');

    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || 3000;
    return `http://${host}:${port}`;
};

const getImageUrl = (file) => {
    if (file.path?.startsWith('http')) return file.path;
    return `${getApiBaseUrl()}/uploads/products/${file.filename}`;
};

const defaultEditorialFields = {
    status: 'published',
    startDate: null,
    endDate: null,
    priority: 0,
};

const defaultMediaFields = {
    imageUrl: '',
    mobileImageUrl: '',
    altText: '',
};

const defaultTrackingFields = {
    trackingId: '',
    campaignName: '',
};

const defaultHomeContent = {
    key: 'homepage',
    hero: {
        eyebrow: 'Origen extremeno - Espiritu rayano',
        title: 'Sabores que cruzan fronteras, tradicion que nos une.',
        description:
            'Productos de origen extremeno de la zona de La Raya, donde Extremadura se encuentra con Portugal.',
        primaryLabel: 'Descubre productos',
        secondaryLabel: 'Nuestra historia',
        imageUrl: '/camino-extremadura.png',
        mobileImageUrl: '',
        altText: 'Camino rural entre Extremadura y Portugal',
        ...defaultTrackingFields,
    },
    featuredProductIds: [],
    sections: [
        {
            id: 'hero',
            type: 'hero',
            title: 'Hero principal',
            enabled: true,
            locked: true,
            order: 0,
            ...defaultEditorialFields,
        },
        {
            id: 'trust',
            type: 'trust',
            title: 'Mensajes de confianza',
            enabled: true,
            locked: true,
            order: 1,
            ...defaultEditorialFields,
        },
        {
            id: 'categories',
            type: 'categories',
            title: 'Categorias visuales',
            enabled: true,
            locked: true,
            order: 2,
            ...defaultEditorialFields,
        },
        {
            id: 'featured',
            type: 'featured',
            title: 'Productos destacados',
            enabled: true,
            locked: true,
            order: 3,
            ...defaultEditorialFields,
        },
    ],
};

const normalizeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeItems = (items = []) =>
    (Array.isArray(items) ? items : []).map((item = {}) => ({
        icon: '',
        title: '',
        body: '',
        ctaLabel: '',
        linkUrl: '',
        ...defaultMediaFields,
        ...defaultTrackingFields,
        ...item,
    }));

const normalizeSections = (sections = defaultHomeContent.sections) =>
    (Array.isArray(sections) ? sections : [])
        .map((section = {}, index) => ({
            subtitle: '',
            body: '',
            ctaLabel: '',
            linkUrl: '',
            productIds: [],
            items: [],
            ...defaultMediaFields,
            ...defaultTrackingFields,
            ...defaultEditorialFields,
            ...section,
            enabled: section.enabled !== false,
            status: section.status || 'published',
            startDate: normalizeDate(section.startDate),
            endDate: normalizeDate(section.endDate),
            priority: Number.isFinite(Number(section.priority))
                ? Number(section.priority)
                : 0,
            order: Number.isFinite(Number(section.order))
                ? Number(section.order)
                : index,
            items: normalizeItems(section.items),
            productIds: Array.isArray(section.productIds)
                ? section.productIds.map(String)
                : [],
        }))
        .sort(
            (first, second) =>
                first.order - second.order || second.priority - first.priority,
        )
        .map((section, order) => ({ ...section, order }));

export const isHomeSectionPublic = (section, now = new Date()) => {
    if (!section || section.enabled === false) return false;
    const status = section.status || 'published';
    if (status === 'draft' || status === 'archived') return false;
    if (status !== 'published' && status !== 'scheduled') return false;

    const startDate = normalizeDate(section.startDate);
    const endDate = normalizeDate(section.endDate);
    if (startDate && startDate > now) return false;
    if (endDate && endDate < now) return false;

    return true;
};

const normalizeHomeContent = (content = {}, { publicOnly = false } = {}) => {
    const normalized = {
        key: 'homepage',
        hero: {
            ...defaultHomeContent.hero,
            ...(content.hero || {}),
        },
        featuredProductIds: Array.isArray(content.featuredProductIds)
            ? content.featuredProductIds.map(String)
            : [],
        sections: normalizeSections(
            Array.isArray(content.sections) && content.sections.length
                ? content.sections
                : defaultHomeContent.sections,
        ),
        updatedBy: content.updatedBy,
    };

    if (publicOnly) {
        normalized.sections = normalized.sections.filter((section) =>
            isHomeSectionPublic(section),
        );
    }

    return normalized;
};

export const getHomeContentService = async (options = {}) => {
    const content = await HomeContent.findOne({ key: 'homepage' }).lean();
    return normalizeHomeContent(content || defaultHomeContent, options);
};

const createHomeContentRevision = async (
    snapshot,
    userId,
    restoredFrom = null,
) => {
    if (!snapshot) return null;
    return HomeContentRevision.create({
        key: 'homepage',
        snapshot: normalizeHomeContent(snapshot, { publicOnly: false }),
        updatedBy: userId,
        restoredFrom,
    });
};

export const updateHomeContentService = async (data, userId) => {
    const currentDocument = await HomeContent.findOne({
        key: 'homepage',
    }).lean();
    const current = normalizeHomeContent(
        currentDocument || defaultHomeContent,
        {
            publicOnly: false,
        },
    );
    const normalized = normalizeHomeContent({
        ...current,
        ...data,
        hero: {
            ...current.hero,
            ...(data.hero || {}),
        },
        updatedBy: userId,
    });

    if (currentDocument) {
        await createHomeContentRevision(currentDocument, userId);
    }

    return await HomeContent.findOneAndUpdate({ key: 'homepage' }, normalized, {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true,
    }).lean();
};

export const getHomeContentRevisionsService = async ({ limit = 20 } = {}) => {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const revisions = await HomeContentRevision.find({ key: 'homepage' })
        .sort({ createdAt: -1 })
        .limit(safeLimit)
        .populate('updatedBy', 'name email')
        .lean();

    return revisions.map((revision) => ({
        id: String(revision._id),
        createdAt: revision.createdAt,
        updatedBy: revision.updatedBy,
        restoredFrom: revision.restoredFrom,
        sectionsCount: Array.isArray(revision.snapshot?.sections)
            ? revision.snapshot.sections.length
            : 0,
        heroTitle: revision.snapshot?.hero?.title || '',
        snapshot: normalizeHomeContent(revision.snapshot || {}, {
            publicOnly: false,
        }),
    }));
};

export const restoreHomeContentRevisionService = async (revisionId, userId) => {
    const revision = await HomeContentRevision.findOne({
        _id: revisionId,
        key: 'homepage',
    }).lean();

    if (!revision) {
        const error = new Error('Home content revision not found');
        error.status = 404;
        throw error;
    }

    const currentDocument = await HomeContent.findOne({
        key: 'homepage',
    }).lean();
    if (currentDocument) {
        await createHomeContentRevision(currentDocument, userId, revision._id);
    }

    const restored = normalizeHomeContent({
        ...(revision.snapshot || {}),
        updatedBy: userId,
    });

    return await HomeContent.findOneAndUpdate({ key: 'homepage' }, restored, {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true,
    }).lean();
};

export const uploadHomeImagesService = async (files) => {
    return files.map((file) => ({
        url: getImageUrl(file),
        name: file.filename || file.originalname || 'Imagen de portada',
    }));
};
