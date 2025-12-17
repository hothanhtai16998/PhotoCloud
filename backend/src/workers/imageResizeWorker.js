import { parentPort } from 'worker_threads';
import sharp from 'sharp';

parentPort.on('message', async (msg) => {
    try {
        const { buffer } = msg;

        // Process all sizes in parallel within the thread
        const [thumbnail, small, regular, avif] = await Promise.all([
            sharp(buffer).resize(200, 200, { fit: 'cover' }).toFormat('webp').toBuffer(),
            sharp(buffer).resize(500, 500, { fit: 'cover' }).toFormat('webp').toBuffer(),
            sharp(buffer).resize(1000, 1000, { fit: 'inside' }).toFormat('webp').toBuffer(),
            sharp(buffer).toFormat('webp').toBuffer(),
        ]);

        // Send buffers back to the parent thread
        parentPort.postMessage({ result: { thumbnail, small, regular, avif } });
    } catch (err) {
        parentPort.postMessage({ error: err?.message || String(err) });
    }
});