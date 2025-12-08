import mongoose from 'mongoose';

const systemLogSchema = new mongoose.Schema(
    {
        level: {
            type: String,
            enum: ['info', 'warn', 'error', 'debug'],
            default: 'info',
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        action: {
            type: String,
            default: null,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
systemLogSchema.index({ createdAt: -1 });
systemLogSchema.index({ level: 1 });
systemLogSchema.index({ userId: 1 });
systemLogSchema.index({ action: 1 }); // For filtering permission audit logs

const SystemLog = mongoose.model('SystemLog', systemLogSchema);

export default SystemLog;

