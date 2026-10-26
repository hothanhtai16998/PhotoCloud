import { validatePackagePresentation, readPackagePresentation } from '../utils/packagePresentation.js';
import BookingPackage from '../models/BookingPackage.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const readPackage = (body = {}) => ({
    ...readPackagePresentation(body),
    slug: String(body.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    name: String(body.name || '').trim().slice(0, 120),
    description: String(body.description || '').trim().slice(0, 1000),
    durationMinutes: Number(body.durationMinutes),
    basePrice: Number(body.basePrice),
    includedPhotos: Number(body.includedPhotos),
    includedPeople: Number(body.includedPeople),
    deliveryDays: Number(body.deliveryDays),
    category: String(body.category || 'other').trim().slice(0, 60),
    active: body.active !== false,
    sortOrder: Number(body.sortOrder) || 0,
});

const validatePackage = (data) => {
    if (!data.slug || !data.name || !data.description || !data.category) return 'Vui lòng nhập đầy đủ thông tin gói chụp';
    if (![data.durationMinutes, data.basePrice, data.includedPhotos, data.includedPeople, data.deliveryDays].every(Number.isFinite)) return 'Thông số gói chụp không hợp lệ';
    if (data.durationMinutes < 15 || data.includedPeople < 1 || data.deliveryDays < 1 || data.basePrice < 0) return 'Thông số gói chụp phải lớn hơn hoặc bằng giá trị tối thiểu';
    return null;
};

export const listAdminPackages = asyncHandler(async (_req, res) => {
    const packages = await BookingPackage.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    res.json({ success: true, packages });
});

export const createAdminPackage = asyncHandler(async (req, res) => {
    const presentationError = validatePackagePresentation(req.body);
    if (presentationError) return res.status(400).json({ success: false, message: presentationError });
    const data = readPackage(req.body);
    const validationError = validatePackage(data);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const packageItem = await BookingPackage.create(data);
    res.status(201).json({ success: true, package: packageItem });
});

export const updateAdminPackage = asyncHandler(async (req, res) => {
    const presentationError = validatePackagePresentation(req.body);
    if (presentationError) return res.status(400).json({ success: false, message: presentationError });
    const data = readPackage(req.body);
    const validationError = validatePackage(data);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const packageItem = await BookingPackage.findByIdAndUpdate(req.params.packageId, data, { new: true, runValidators: true });
    if (!packageItem) return res.status(404).json({ success: false, message: 'Không tìm thấy gói chụp' });
    res.json({ success: true, package: packageItem });
});

export const archiveAdminPackage = asyncHandler(async (req, res) => {
    const packageItem = await BookingPackage.findByIdAndUpdate(req.params.packageId, { active: false }, { new: true });
    if (!packageItem) return res.status(404).json({ success: false, message: 'Không tìm thấy gói chụp' });
    res.json({ success: true, package: packageItem });
});
