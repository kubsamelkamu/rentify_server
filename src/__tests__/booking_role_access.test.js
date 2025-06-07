import request from 'supertest';
import app from '../app.js';

describe('Role-based access for booking endpoints', () => {
  let landlordToken, tenantToken, propertyId;

  beforeAll(async () => {
    const landlord = {
      name: 'Landlord Test',
      email: `landlord_${Date.now()}@example.com`,
      password: 'LandlordPass123'
    };
    await request(app).post('/api/auth/register').send({
      ...landlord,
      role: 'LANDLORD'
    });
    let loginRes = await request(app).post('/api/auth/login').send({
      email: landlord.email,
      password: landlord.password
    });
    landlordToken = loginRes.body.token;
    const tenant = {
      name: 'Tenant Test',
      email: `tenant_${Date.now()}@example.com`,
      password: 'TenantPass123'
    };
    await request(app).post('/api/auth/register').send({
      ...tenant,
      role: 'TENANT'
    });
    loginRes = await request(app).post('/api/auth/login').send({
      email: tenant.email,
      password: tenant.password
    });
    tenantToken = loginRes.body.token;

    // Landlord creates a property
    const propRes = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        title: 'Test Property',
        city: 'Test City',
        rentPerMonth: 1000,
        // add any other required fields
      });
    propertyId = propRes.body.id;
  });

  describe('POST /api/bookings (TENANT only)', () => {
    it('should allow tenant to request a booking', async () => {
      const startDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          propertyId,
          startDate,
          endDate
        });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('property');
      expect(res.body).toHaveProperty('tenant');
    });

    it('should deny landlord from requesting a booking', async () => {
      const startDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId,
          startDate,
          endDate
        });
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error', 'Only tenants can request bookings');
    });
  });

  describe('GET /api/bookings/user (TENANT only)', () => {
    it('should allow tenant to view their bookings', async () => {
      const res = await request(app)
        .get('/api/bookings/user')
        .set('Authorization', `Bearer ${tenantToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should deny landlord from viewing tenant bookings', async () => {
      const res = await request(app)
        .get('/api/bookings/user')
        .set('Authorization', `Bearer ${landlordToken}`);
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error', 'Only tenants can view their bookings');
    });
  });

  describe('GET /api/bookings/landlord (LANDLORD only)', () => {
    it('should allow landlord to view their property bookings', async () => {
      const res = await request(app)
        .get('/api/bookings/landlord')
        .set('Authorization', `Bearer ${landlordToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should deny tenant from viewing landlord bookings', async () => {
      const res = await request(app)
        .get('/api/bookings/landlord')
        .set('Authorization', `Bearer ${tenantToken}`);
      expect(res.statusCode).toBe(403);
      expect(res.body).toHaveProperty('error', 'Only landlords can view these bookings');
    });
  });
});