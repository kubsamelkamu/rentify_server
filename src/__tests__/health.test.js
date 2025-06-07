import request from 'supertest';
import app from '../app.js';

describe('Health Check Endpoint', () => {
  it('should respond with status 200 and health message', async () => {
    const res = await request(app).get('/health/status');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('message', 'Server is healthy!');
  });
});