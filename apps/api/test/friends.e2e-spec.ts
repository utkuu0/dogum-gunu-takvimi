import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Friends (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let accessSecret: string;

  let userId: string;
  let accessToken: string;
  let otherUserId: string;
  let otherAccessToken: string;
  let createdFriendId: string;

  function signAccessToken(sub: string, email: string) {
    return jwtService.sign({ sub, email }, { secret: accessSecret });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })
    );
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    accessSecret = app.get(ConfigService).getOrThrow<string>('JWT_ACCESS_SECRET');

    const user = await prisma.user.upsert({
      where: { googleId: 'e2e-friends-test-google-id' },
      update: {},
      create: {
        googleId: 'e2e-friends-test-google-id',
        email: 'e2e-friends@dogumgunu.dev',
        name: 'E2E Test Kullanıcı',
      },
    });
    userId = user.id;
    accessToken = signAccessToken(user.id, user.email);

    const otherUser = await prisma.user.upsert({
      where: { googleId: 'e2e-friends-other-google-id' },
      update: {},
      create: {
        googleId: 'e2e-friends-other-google-id',
        email: 'e2e-friends-other@dogumgunu.dev',
        name: 'E2E Diğer Kullanıcı',
      },
    });
    otherUserId = otherUser.id;
    otherAccessToken = signAccessToken(otherUser.id, otherUser.email);
  });

  afterAll(async () => {
    await prisma.friend.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
    await app.close();
  });

  it('POST /friends kimlik doğrulaması olmadan 401 döner', async () => {
    await request(app.getHttpServer())
      .post('/friends')
      .send({ name: 'X', birthDate: '2000-01-01' })
      .expect(401);
  });

  it('POST /friends geçersiz body ile 400 döner', async () => {
    await request(app.getHttpServer())
      .post('/friends')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '' })
      .expect(400);
  });

  it('POST /friends yeni arkadaş oluşturur', async () => {
    const res = await request(app.getHttpServer())
      .post('/friends')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test Arkadaş', birthDate: '1995-03-14', notes: 'ilk not' })
      .expect(201);

    expect(res.body).toMatchObject({ name: 'Test Arkadaş', userId, notes: 'ilk not' });
    createdFriendId = res.body.id;
  });

  it('GET /friends yaklaşan doğum gününe göre sıralı liste döner', async () => {
    const res = await request(app.getHttpServer())
      .get('/friends')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as { friendId: string; daysUntil: number }[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((f) => f.friendId === createdFriendId)).toBe(true);
    for (let i = 1; i < body.length; i++) {
      expect(body[i].daysUntil).toBeGreaterThanOrEqual(body[i - 1].daysUntil);
    }
  });

  it('GET /friends/upcoming days parametresine göre filtreler', async () => {
    const res = await request(app.getHttpServer())
      .get('/friends/upcoming?days=1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((f: { daysUntil: number }) => f.daysUntil <= 1)).toBe(true);
  });

  it('GET /friends/:id tek arkadaşı döner', async () => {
    const res = await request(app.getHttpServer())
      .get(`/friends/${createdFriendId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdFriendId);
  });

  it('GET /friends/:id var olmayan id için 404 döner', async () => {
    await request(app.getHttpServer())
      .get('/friends/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('GET /friends/:id başka kullanıcının arkadaşı için 404 döner', async () => {
    await request(app.getHttpServer())
      .get(`/friends/${createdFriendId}`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .expect(404);
  });

  it('PATCH /friends/:id günceller', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/friends/${createdFriendId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ notes: 'güncellenmiş not' })
      .expect(200);

    expect(res.body.notes).toBe('güncellenmiş not');
  });

  it('PATCH /friends/:id başka kullanıcının arkadaşı için 404 döner', async () => {
    await request(app.getHttpServer())
      .patch(`/friends/${createdFriendId}`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .send({ notes: 'yetkisiz güncelleme' })
      .expect(404);
  });

  it('DELETE /friends/:id başka kullanıcının arkadaşı için 404 döner', async () => {
    await request(app.getHttpServer())
      .delete(`/friends/${createdFriendId}`)
      .set('Authorization', `Bearer ${otherAccessToken}`)
      .expect(404);
  });

  it('DELETE /friends/:id siler', async () => {
    await request(app.getHttpServer())
      .delete(`/friends/${createdFriendId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/friends/${createdFriendId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
