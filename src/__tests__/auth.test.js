import request from 'supertest';
import app from '../app.js';

describe('Auth: Registration', () => {
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: `testuser_${Date.now()}@example.com`,
        password: 'StrongPass123',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'User registered successfully');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('name', 'Test User');
    expect(res.body.user).toHaveProperty('email');
    expect(res.body.user).toHaveProperty('role', 'TENANT');
  });

  it('should fail if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'missing@example.com' }); 
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Name, email and password are required');
  });

  it('should fail if email is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'invalidemail',
        password: 'StrongPass123',
      });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid email format');
  });

  it('should fail if password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: `shortpass_${Date.now()}@example.com`,
        password: '123',
      });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Password must be at least 6 characters');
  });

  it('should fail for duplicate email', async () => {
    const email = `dupe_${Date.now()}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Dupe User',
        email,
        password: 'StrongPass123',
      });
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Dupe User',
        email,
        password: 'StrongPass123',
      });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Email already exists');
  });
});

describe('Auth: Login', () => {
  const testUser = {
    name: 'Login Test User',
    email: `loginuser_${Date.now()}@example.com`,
    password: 'LoginPass123'
  };

  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send(testUser);
  });

  it('should login successfully with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Login successful');
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('name', testUser.name);
    expect(res.body.user).toHaveProperty('email', testUser.email);
    expect(res.body.user).toHaveProperty('role', 'TENANT');
  });
  it('should fail if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Email and password are required');
  });

  it('should fail if email is invalid format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notanemail', password: 'irrelevant' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid email format');
  });

  it('should fail if user does not exist', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nouser_' + Date.now() + '@example.com', password: 'irrelevant' });
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error', 'User not found');
  });

  it('should fail if password is wrong', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword123' });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid credentials');
  });
});