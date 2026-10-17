import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        value: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

const Settings = mongoose.model('Settings', settingsSchema);

// Called by server startup only after MongoDB is connected. Importing a model
// must not enqueue queries or create an unhandled rejection.
export async function initializeDefaultSettings() {
    await Settings.updateOne(
        { key: 'system' },
        { $setOnInsert: {
            key: 'system',
            value: {
                siteName: 'PhotoApp',
                siteDescription: 'Discover beautiful photos',
                maxUploadSize: 10,
                allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
                maintenanceMode: false,
            },
            description: 'System-wide settings',
            createdAt: new Date(),
            updatedAt: new Date(),
        } },
        { upsert: true, timestamps: false }
    );
}

export default Settings;

