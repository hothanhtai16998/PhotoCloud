import api from '@/lib/axios';
import type { Collection } from '@/types/collection';

export interface CollectionTemplate {
    _id: string;
    name: string;
    description?: string;
    templateName: string;
    category: 'travel' | 'wedding' | 'product' | 'portfolio' | 'event' | 'personal' | 'other';
    defaultTags: string[];
    defaultIsPublic: boolean;
    createdBy: {
        _id: string;
        username: string;
        displayName: string;
        avatarUrl?: string;
    };
    isSystemTemplate: boolean;
    usageCount: number;
    iconUrl?: string;
    createdAt: string;
    updatedAt: string;
}

interface TemplatesResponse {
    success: boolean;
    templates: CollectionTemplate[];
}

interface TemplateResponse {
    success: boolean;
    template: CollectionTemplate;
}

interface CreateCollectionFromTemplateData {
    name?: string;
    description?: string;
    isPublic?: boolean;
    tags?: string[];
}

export const collectionTemplateService = {
    /**
     * Get all templates
     */
    getTemplates: async (category?: string): Promise<CollectionTemplate[]> => {
        const params = category ? `?category=${encodeURIComponent(category)}` : '';
        const response = await api.get<TemplatesResponse>(`/collection-templates${params}`, {
            withCredentials: true,
        });
        return response.data.templates;
    },

    /**
     * Get a single template by ID
     */
    getTemplateById: async (templateId: string): Promise<CollectionTemplate> => {
        const response = await api.get<TemplateResponse>(`/collection-templates/${templateId}`, {
            withCredentials: true,
        });
        return response.data.template;
    },

    /**
     * Create a new template
     */
    createTemplate: async (data: {
        name: string;
        description?: string;
        templateName: string;
        category?: string;
        defaultTags?: string[];
        defaultIsPublic?: boolean;
        iconUrl?: string;
    }): Promise<CollectionTemplate> => {
        const response = await api.post<TemplateResponse>('/collection-templates', data, {
            withCredentials: true,
        });
        return response.data.template;
    },

    /**
     * Create a collection from a template
     */
    createCollectionFromTemplate: async (
        templateId: string,
        data?: CreateCollectionFromTemplateData
    ): Promise<Collection> => {
        const response = await api.post(`/collection-templates/${templateId}/collections`, data || {}, {
            withCredentials: true,
        });
        return response.data.collection;
    },

    /**
     * Update a template
     */
    updateTemplate: async (
        templateId: string,
        data: {
            name?: string;
            description?: string;
            templateName?: string;
            category?: string;
            defaultTags?: string[];
            defaultIsPublic?: boolean;
            iconUrl?: string;
        }
    ): Promise<CollectionTemplate> => {
        const response = await api.patch<TemplateResponse>(`/collection-templates/${templateId}`, data, {
            withCredentials: true,
        });
        return response.data.template;
    },

    /**
     * Delete a template
     */
    deleteTemplate: async (templateId: string): Promise<void> => {
        await api.delete(`/collection-templates/${templateId}`, {
            withCredentials: true,
        });
    },

    /**
     * Save a collection as a template
     */
    saveCollectionAsTemplate: async (
        collectionId: string,
        data: {
            templateName: string;
            category?: string;
        }
    ): Promise<CollectionTemplate> => {
        const response = await api.post<TemplateResponse>(
            `/collection-templates/from-collection/${collectionId}`,
            data,
            {
                withCredentials: true,
            }
        );
        return response.data.template;
    },
};

