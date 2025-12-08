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

// Initialize default settings if they don't exist
Settings.findOne({ key: 'system' }).then(async (settings) => {
    if (!settings) {
        await Settings.create({
            key: 'system',
            value: {
                siteName: 'PhotoApp',
                siteDescription: 'Discover beautiful photos',
                maxUploadSize: 10, // MB
                allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
                maintenanceMode: false,
            },
            description: 'System-wide settings',
        });
    }
});

export default Settings;

