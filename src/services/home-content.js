import { HomeContent } from '../db/models/home-content.model.js';

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
        },
        {
            id: 'trust',
            type: 'trust',
            title: 'Mensajes de confianza',
            enabled: true,
            locked: true,
            order: 1,
        },
        {
            id: 'categories',
            type: 'categories',
            title: 'Categorias visuales',
            enabled: true,
            locked: true,
            order: 2,
        },
        {
            id: 'featured',
            type: 'featured',
            title: 'Productos destacados',
            enabled: true,
            locked: true,
            order: 3,
        },
    ],
};

const normalizeSections = (sections = defaultHomeContent.sections) =>
    sections
        .map((section, index) => ({
            subtitle: '',
            body: '',
            ...section,
            enabled: section.enabled !== false,
            order: Number.isFinite(Number(section.order))
                ? Number(section.order)
                : index,
        }))
        .sort((first, second) => first.order - second.order)
        .map((section, order) => ({ ...section, order }));

const normalizeHomeContent = (content = {}) => ({
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
});

export const getHomeContentService = async () => {
    const content = await HomeContent.findOne({ key: 'homepage' }).lean();
    return normalizeHomeContent(content || defaultHomeContent);
};

export const updateHomeContentService = async (data, userId) => {
    const current = await getHomeContentService();
    const normalized = normalizeHomeContent({
        ...current,
        ...data,
        hero: {
            ...current.hero,
            ...(data.hero || {}),
        },
        updatedBy: userId,
    });

    return await HomeContent.findOneAndUpdate(
        { key: 'homepage' },
        normalized,
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        },
    ).lean();
};
