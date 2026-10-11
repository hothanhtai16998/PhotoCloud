import express from 'express';
import { getHeroCollections } from '../controllers/heroController.js';

const router = express.Router();

// Public: lấy 4 collection hiển thị trên hero
// Cache 5 phút ở client; fallback random nếu admin chưa cấu hình
router.get('/', getHeroCollections);

export default router;
