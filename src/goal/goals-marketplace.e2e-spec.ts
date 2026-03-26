/**
 * E2E tests — Financial Goals Marketplace
 *
 * Test order mirrors the acceptance criteria in the issue:
 *   1. GET  /goals/templates
 *   2. POST /goals/from-template
 *   3. GET  /goals/challenges
 *   4. POST /goals/challenges/:id/join
 *   5. GET  /goals/challenges/:id/leaderboard
 *   6. GET  /goals/public  (+ privacy assertions)
 *
 * Setup: runs against a real Postgres instance via the app's TypeORM config.
 * Seed data is created in beforeAll and cleaned up in afterAll.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { GoalTemplate, GoalCategory } from '../src/goals/entities/goal-template.entity';
import { CommunityChallenge, ChallengeStatus } from '../src/goals/entities/community-challenge.entity';
import { Goal } from '../src/goals/entities/goal.entity';
import { ChallengeParticipation } from '../src/goals/entities/challenge-participation.entity';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loginAs(
  app: INestApplication,
  credentials: { email: string; password: string },
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send(credentials)
    .expect(200);
  return res.body.access_token as string;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Goals Marketplace (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let templateRepo: Repository<GoalTemplate>;
  let challengeRepo: Repository<CommunityChallenge>;
  let goalRepo: Repository<Goal>;
  let participationRepo: Repository<ChallengeParticipation>;

  // Seeded IDs
  let templateId: string;
  let challengeId: string;

  // Auth tokens for two users (Alice creates goals; Bob joins to test leaderboard)
  let aliceToken: string;
  let bobToken: string;
  let aliceGoalId: string;
  let bobGoalId: string;

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    templateRepo = moduleFixture.get(getRepositoryToken(GoalTemplate));
    challengeRepo = moduleFixture.get(getRepositoryToken(CommunityChallenge));
    goalRepo = moduleFixture.get(getRepositoryToken(Goal));
    participationRepo = moduleFixture.get(getRepositoryToken(ChallengeParticipation));

    // Seed a template
    const template = await templateRepo.save(
      templateRepo.create({
        name: 'Emergency Fund',
        description: 'Save 3-6 months of living expenses',
        category: GoalCategory.EMERGENCY_FUND,
        defaultTargetAmount: 500_000_00, // 500,000 in minor units
        defaultDurationDays: 365,
        iconKey: 'shield',
        tips: ['Automate monthly transfers', 'Keep it in a high-yield account'],
        isActive: true,
      }),
    );
    templateId = template.id;

    // Seed an active challenge
    const now = new Date();
    const endsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const challenge = await challengeRepo.save(
      challengeRepo.create({
        title: '30-Day Savings Sprint',
        description: 'Save as much as possible in 30 days!',
        startsAt: now,
        endsAt,
        status: ChallengeStatus.ACTIVE,
        isActive: true,
        maxParticipants: 100,
        prizeDescription: 'Gold Saver Badge',
      }),
    );
    challengeId = challenge.id;

    // Login as Alice and Bob (assumes these test users are seeded by the app's
    // test database initialiser — adjust credentials to match your fixtures)
    aliceToken = await loginAs(app, {
      email: 'alice@test.nexafx.io',
      password: 'TestPass123!',
    });
    bobToken = await loginAs(app, {
      email: 'bob@test.nexafx.io',
      password: 'TestPass123!',
    });
  });

  afterAll(async () => {
    // Clean up in FK-safe order
    await participationRepo.delete({ challengeId });
    await challengeRepo.delete(challengeId);
    if (aliceGoalId) await goalRepo.delete(aliceGoalId);
    if (bobGoalId) await goalRepo.delete(bobGoalId);
    await templateRepo.delete(templateId);
    await app.close();
  });

  // ── 1. GET /goals/templates ───────────────────────────────────────────────

  describe('GET /goals/templates', () => {
    it('returns 200 with an array of active templates', async () => {
      const res = await request(app.getHttpServer())
        .get('/goals/templates')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const tpl = res.body.find((t: any) => t.id === templateId);
      expect(tpl).toBeDefined();
      expect(tpl.name).toBe('Emergency Fund');
      expect(tpl.defaultTargetAmount).toBeDefined();
    });

    it('filters by category', async () => {
      const res = await request(app.getHttpServer())
        .get(`/goals/templates?category=${GoalCategory.EMERGENCY_FUND}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      res.body.forEach((t: any) =>
        expect(t.category).toBe(GoalCategory.EMERGENCY_FUND),
      );
    });
  });

  // ── 2. POST /goals/from-template ─────────────────────────────────────────

  describe('POST /goals/from-template', () => {
    it('creates a goal pre-filled from the template (Alice)', async () => {
      const res = await request(app.getHttpServer())
        .post('/goals/from-template')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          templateId,
          displayName: 'Alice (public)',
          isPublic: true,
        })
        .expect(201);

      expect(res.body.templateId).toBe(templateId);
      expect(res.body.name).toBe('Emergency Fund');
      expect(res.body.targetAmount).toBeTruthy();
      expect(res.body.isPublic).toBe(true);
      aliceGoalId = res.body.id;
    });

    it('allows overriding target amount and name', async () => {
      const res = await request(app.getHttpServer())
        .post('/goals/from-template')
        .set('Authorization', `Bearer ${bobToken}`)
        .send({
          templateId,
          targetAmount: 200_000_00,
          name: 'Bob Emergency Fund',
          displayName: 'Bob (anon)',
          isPublic: true,
        })
        .expect(201);

      expect(res.body.targetAmount).toBe(200_000_00);
      expect(res.body.name).toBe('Bob Emergency Fund');
      bobGoalId = res.body.id;
    });

    it('returns 404 for an unknown template', async () => {
      await request(app.getHttpServer())
        .post('/goals/from-template')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ templateId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });
  });

  // ── 3. GET /goals/challenges ──────────────────────────────────────────────

  describe('GET /goals/challenges', () => {
    it('returns active challenges', async () => {
      const res = await request(app.getHttpServer())
        .get('/goals/challenges')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const ch = res.body.find((c: any) => c.id === challengeId);
      expect(ch).toBeDefined();
      expect(ch.title).toBe('30-Day Savings Sprint');
    });
  });

  // ── 4. POST /goals/challenges/:id/join ────────────────────────────────────

  describe('POST /goals/challenges/:id/join', () => {
    it('Alice joins the challenge with her goal', async () => {
      const res = await request(app.getHttpServer())
        .post(`/goals/challenges/${challengeId}/join`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ goalId: aliceGoalId })
        .expect(201);

      expect(res.body.challengeId).toBe(challengeId);
      expect(res.body.goalId).toBe(aliceGoalId);
    });

    it('Bob joins the challenge with his goal', async () => {
      // Give Bob some progress first
      await goalRepo.update(bobGoalId, { savedAmount: 100_000_00 });

      const res = await request(app.getHttpServer())
        .post(`/goals/challenges/${challengeId}/join`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ goalId: bobGoalId })
        .expect(201);

      expect(res.body.goalId).toBe(bobGoalId);
    });

    it('prevents duplicate participation', async () => {
      await request(app.getHttpServer())
        .post(`/goals/challenges/${challengeId}/join`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ goalId: aliceGoalId })
        .expect(409);
    });

    it('rejects joining with a goal belonging to another user', async () => {
      await request(app.getHttpServer())
        .post(`/goals/challenges/${challengeId}/join`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ goalId: bobGoalId }) // Alice trying to use Bob's goal
        .expect(404);
    });

    it('returns 404 for unknown challenge', async () => {
      await request(app.getHttpServer())
        .post(`/goals/challenges/00000000-0000-0000-0000-000000000000/join`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ goalId: aliceGoalId })
        .expect(404);
    });
  });

  // ── 5. GET /goals/challenges/:id/leaderboard ──────────────────────────────

  describe('GET /goals/challenges/:id/leaderboard', () => {
    it('returns top 10 sorted by contribution %', async () => {
      const res = await request(app.getHttpServer())
        .get(`/goals/challenges/${challengeId}/leaderboard`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(10);

      // Ranks are sequential starting from 1
      res.body.forEach((entry: any, i: number) => {
        expect(entry.rank).toBe(i + 1);
        expect(entry.displayName).toBeDefined();
        expect(typeof entry.progressPercent).toBe('number');
      });

      // First place should have higher or equal % than second
      if (res.body.length >= 2) {
        expect(res.body[0].progressPercent).toBeGreaterThanOrEqual(
          res.body[1].progressPercent,
        );
      }
    });

    it('does NOT expose real names — only displayName', async () => {
      const res = await request(app.getHttpServer())
        .get(`/goals/challenges/${challengeId}/leaderboard`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      res.body.forEach((entry: any) => {
        // The response shape must not contain firstName / lastName / email
        expect(entry.firstName).toBeUndefined();
        expect(entry.lastName).toBeUndefined();
        expect(entry.email).toBeUndefined();
      });
    });

    it('hides absolute amounts for other users but shows own', async () => {
      const res = await request(app.getHttpServer())
        .get(`/goals/challenges/${challengeId}/leaderboard`)
        .set('Authorization', `Bearer ${bobToken}`)
        .expect(200);

      const bobEntry = res.body.find(
        (e: any) => e.displayName === 'Bob (anon)',
      );
      expect(bobEntry).toBeDefined();
      expect(bobEntry.savedAmount).toBeGreaterThan(0); // own entry shows amount

      const aliceEntry = res.body.find(
        (e: any) => e.displayName === 'Alice (public)',
      );
      if (aliceEntry) {
        expect(aliceEntry.savedAmount).toBe(0); // other user's amount hidden
      }
    });
  });

  // ── 6. GET /goals/public ──────────────────────────────────────────────────

  describe('GET /goals/public', () => {
    it('returns public goals without real user names', async () => {
      const res = await request(app.getHttpServer())
        .get('/goals/public')
        .set('Authorization', `Bearer ${aliceToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const aliceGoal = res.body.find((g: any) => g.id === aliceGoalId);
      expect(aliceGoal).toBeDefined();
      expect(aliceGoal.displayName).toBeDefined();

      // Real identifying fields must NOT be present
      res.body.forEach((g: any) => {
        expect(g.userId).toBeUndefined();
        expect(g.user).toBeUndefined();
        expect(g.firstName).toBeUndefined();
        expect(g.email).toBeUndefined();
      });
    });

    it('does NOT return private goals', async () => {
      // Create a private goal
      const privateGoal = await goalRepo.save(
        goalRepo.create({
          userId: (await loginAs(app, { email: 'alice@test.nexafx.io', password: 'TestPass123!' })) as any,
          name: 'Secret Goal',
          targetAmount: 1_000,
          isPublic: false,
        }),
      );

      const res = await request(app.getHttpServer())
        .get('/goals/public')
        .set('Authorization', `Bearer ${bobToken}`)
        .expect(200);

      const found = res.body.find((g: any) => g.id === privateGoal.id);
      expect(found).toBeUndefined();

      await goalRepo.delete(privateGoal.id);
    });
  });

  // ── 7. PATCH /goals/:id/visibility ───────────────────────────────────────

  describe('PATCH /goals/:id/visibility', () => {
    it('owner can toggle goal to private', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/goals/${aliceGoalId}/visibility`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ isPublic: false })
        .expect(200);

      expect(res.body.isPublic).toBe(false);
    });

    it('another user cannot modify someone else\'s visibility', async () => {
      await request(app.getHttpServer())
        .patch(`/goals/${aliceGoalId}/visibility`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ isPublic: true })
        .expect(404);
    });
  });
});
