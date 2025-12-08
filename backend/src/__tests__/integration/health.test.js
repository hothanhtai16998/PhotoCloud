import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';

/**
 * Integration test for health check endpoint
 * Note: This is a basic example. Full integration tests would require
 * a test database setup and teardown
 */

describe('Health Check Endpoint', () => {
    let app;

    beforeAll(() => {
        // Create a minimal Express app for testing
        app = express();
        app.use(express.json());
        
        // Add health check route
        app.get('/api/health', (req, res) => {
            res.status(200).json({
                status: 'ok',
                timestamp: new Date().toISOString(),
            });
        });
    });

    it('should return 200 and status ok', async () => {
        const response = await request(app)
            .get('/api/health')
            .expect(200);

        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('timestamp');
    });
});

