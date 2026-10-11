import Booking from '../models/Booking.js';
import BookingWorkspace from '../models/BookingWorkspace.js';
import Collection from '../models/Collection.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

const productionStatuses = new Set(['not_started', 'shoot_scheduled', 'shoot_completed', 'selecting', 'editing', 'quality_check', 'delivering', 'delivered']);

const getOwnedBooking = (bookingId, userId) => Booking.findOne({ _id: bookingId, client: userId });
const getWorkspace = async (bookingId) => BookingWorkspace.findOneAndUpdate({ booking: bookingId }, { $setOnInsert: { booking: bookingId } }, { upsert: true, new: true });

export const getMyWorkspace = asyncHandler(async (req, res) => {
    const booking = await getOwnedBooking(req.params.bookingId, req.user._id);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    const workspace = await getWorkspace(booking._id);
    res.json({ success: true, workspace });
});

export const acceptContract = asyncHandler(async (req, res) => {
    const booking = await getOwnedBooking(req.params.bookingId, req.user._id);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    const workspace = await getWorkspace(booking._id);
    if (workspace.contract.status !== 'sent') return res.status(409).json({ success: false, message: 'Hợp đồng chưa sẵn sàng để xác nhận' });
    workspace.contract.status = 'accepted';
    workspace.contract.acceptedAt = new Date();
    workspace.contract.acceptedBy = req.user._id;
    await workspace.save();
    res.json({ success: true, workspace });
});

export const submitQuestionnaire = asyncHandler(async (req, res) => {
    const booking = await getOwnedBooking(req.params.bookingId, req.user._id);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    const workspace = await getWorkspace(booking._id);
    workspace.questionnaire = { answers: { style: String(req.body?.style || '').slice(0, 1000), references: String(req.body?.references || '').slice(0, 1000), outfit: String(req.body?.outfit || '').slice(0, 1000), specialRequests: String(req.body?.specialRequests || '').slice(0, 2000), portfolioPermission: req.body?.portfolioPermission === true }, submittedAt: new Date() };
    await workspace.save();
    res.json({ success: true, workspace });
});

export const getAdminWorkspace = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.bookingId).lean();
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    const workspace = await getWorkspace(booking._id);
    res.json({ success: true, booking, workspace });
});

export const updateAdminWorkspace = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    const workspace = await getWorkspace(booking._id);
    if (req.body?.contract) {
        workspace.contract.title = String(req.body.contract.title || workspace.contract.title).slice(0, 200);
        workspace.contract.content = String(req.body.contract.content || '').slice(0, 15000);
        workspace.contract.status = req.body.contract.status === 'sent' ? 'sent' : workspace.contract.status;
        if (workspace.contract.status === 'sent' && !workspace.contract.sentAt) workspace.contract.sentAt = new Date();
    }
    if (req.body?.production?.status && productionStatuses.has(req.body.production.status)) {
        workspace.production.status = req.body.production.status;
        workspace.production.note = String(req.body.production.note || '').slice(0, 1000);
        workspace.production.updatedAt = new Date();
    }
    if (req.body?.gallery?.collectionId) {
        const collection = await Collection.findById(req.body.gallery.collectionId).select('_id').lean();
        if (!collection) return res.status(404).json({ success: false, message: 'Không tìm thấy gallery' });
        workspace.gallery.collection = collection._id;
        workspace.gallery.linkedAt = new Date();
        if (req.body.gallery.delivered) workspace.gallery.deliveredAt = new Date();
    }
    await workspace.save();
    res.json({ success: true, workspace });
});
