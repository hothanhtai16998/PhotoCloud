import multer from 'multer';
import { FILE_UPLOAD } from '../utils/constants.js';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// Create the multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: FILE_UPLOAD.MAX_SIZE,
    },
    fileFilter: (req, file, cb) => {
        // Use MulterError for consistent Multer handling in error middleware
        // Allow images and videos - specific type validation will be done in controllers using settings
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');
        
        if (!isImage && !isVideo) {
            const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
            err.message = 'Only image and video files are allowed';
            err.field = file.fieldname;
            return cb(err);
        }

        // Allow all image/video types - specific validation will be done in controllers using database settings
        cb(null, true);
    },
});

export const singleUpload = upload.single('image');
export const multipleUpload = upload.array('images', 50); // Max 50 images
export const avatarUpload = upload.single('avatar');
