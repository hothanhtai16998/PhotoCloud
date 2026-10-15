import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Category from '../src/models/Category.js';
import Image from '../src/models/Image.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(root, 'backend/.env'), quiet: true });
const descriptions = {
    'Chân dung': 'Ảnh chân dung cá nhân, biểu cảm và phong cách của người được chụp.',
    'Du lịch': 'Ảnh điểm đến, hành trình khám phá và trải nghiệm văn hóa.',
    'Kiến trúc': 'Ảnh công trình, không gian nội thất và đường nét kiến trúc.',
    'Ngoài trời': 'Ảnh chụp trong không gian ngoài trời, khai thác ánh sáng tự nhiên.',
    'Phong cảnh': 'Ảnh cảnh quan thiên nhiên, núi rừng, biển và bầu trời.',
    'Thời trang': 'Ảnh trang phục, phụ kiện và phong cách thời trang.',
    'Thú cưng': 'Ảnh thú cưng và những khoảnh khắc gần gũi bên vật nuôi.',
    'Ẩm thực': 'Ảnh món ăn, đồ uống và cách trình bày ẩm thực.',
};
const fingerprint = value => JSON.stringify(value);
try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    const categories = await Category.find().sort({ _id: 1 }).lean();
    const removals = categories.filter(c => c.name === 'Nho');
    const affected = await Image.find({ imageCategory: { $in: removals.map(c => c._id) } }).select('_id imageCategory').sort({ _id: 1 }).lean();
    const updates = categories.filter(c => descriptions[c.name] && c.description !== descriptions[c.name]);
    console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'preview', updateDescriptions: updates.map(c => c.name), removeCategories: removals.map(c => c.name), imagesToUncategorize: affected.length, keepOtherCategories: categories.filter(c => !descriptions[c.name] && c.name !== 'Nho').map(c => c.name) }));
    if (process.argv.includes('--apply') && (updates.length || removals.length)) {
        const totalImages = await Image.countDocuments();
        const backupDir = path.join(root, '.local-backups');
        await fs.mkdir(backupDir, { recursive: true });
        const backupPath = path.join(backupDir, 'categories-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
        await fs.writeFile(backupPath, JSON.stringify({ database: mongoose.connection.name, categories, affectedImages: affected, totalImages }, null, 2), { flag: 'wx' });
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const current = await Category.find().sort({ _id: 1 }).session(session).lean();
                const currentImages = await Image.find({ imageCategory: { $in: removals.map(c => c._id) } }).select('_id imageCategory').sort({ _id: 1 }).session(session).lean();
                if (fingerprint(current) !== fingerprint(categories) || fingerprint(currentImages) !== fingerprint(affected)) throw new Error('Data changed after preview; no changes applied.');
                for (const c of updates) await Category.updateOne({ _id: c._id }, { $set: { description: descriptions[c.name] } }, { session });
                // Never guess a photographic subject from an ambiguous old label.
                if (removals.length) {
                    await Image.updateMany({ imageCategory: { $in: removals.map(c => c._id) } }, { $set: { imageCategory: null } }, { session });
                    await Category.deleteMany({ _id: { $in: removals.map(c => c._id) } }, { session });
                }
            });
        } finally { await session.endSession(); }
        if (await Image.countDocuments() !== totalImages) throw new Error('Image count changed; inspect backup and concurrent activity.');
        console.log(JSON.stringify({ applied: true, backupPath, categoriesRemaining: await Category.countDocuments(), totalImages, unclassifiedRetained: affected.length }));
    }
} catch (error) {
    // Connection errors may contain credentials/host details; keep output minimal.
    console.error(error.name + ': category normalization failed.');
    process.exitCode = 1;
} finally { await mongoose.disconnect(); }
