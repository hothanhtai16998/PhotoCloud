import { parentPort } from 'worker_threads';
import sharp from 'sharp';

parentPort.on('message', async (msg) => {
    try {
        const { buffer, operations } = msg;

        // If operations array provided, process them
        if (operations && Array.isArray(operations)) {
            const results = await Promise.all(
                operations.map(op => {
                    let sharpInstance = sharp(buffer);
                    
                    // Apply resize if specified
                    if (op.resize) {
                        sharpInstance = sharpInstance.resize(op.resize.width, op.resize.height, op.resize.options || {});
                    }
                    
                    // Apply format conversion
                    if (op.format) {
                        if (op.format === 'webp') {
                            sharpInstance = sharpInstance.webp(op.formatOptions || {});
                        } else if (op.format === 'avif') {
                            sharpInstance = sharpInstance.avif(op.formatOptions || {});
                        } else if (op.format === 'png') {
                            sharpInstance = sharpInstance.png(op.formatOptions || {});
                        } else if (op.format === 'jpeg' || op.format === 'jpg') {
                            sharpInstance = sharpInstance.jpeg(op.formatOptions || {});
                        }
                    }
                    
                    return sharpInstance.toBuffer();
                })
            );
            
            parentPort.postMessage({ result: results });
            return;
        }

        // Legacy: Process all sizes in parallel within the thread (backward compatibility)
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