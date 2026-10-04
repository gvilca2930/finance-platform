import { randomUUID } from 'node:crypto';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

jest.setTimeout(30_000);

const body = <T>(response: Response): T => response.body as T;

describe('Internal workspace invitations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let invitedToken: string;
  let ownerId: string;
  let invitedId: string;
  let workspaceId: string;
  const suffix = Date.now();
  const ownerEmail = `internal-owner-${suffix}@example.com`;
  const invitedEmail = `internal-invited-${suffix}@example.com`;
  const otherEmail = `internal-other-${suffix}@example.com`;
  const password = 'Secure123';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    for (const [email, firstName] of [
      [ownerEmail, 'George'],
      [invitedEmail, 'Maria'],
      [otherEmail, 'Other'],
    ] as const) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password, firstName, paternalLastName: 'Invitations' })
        .expect(201);
    }
    const login = async (email: string) =>
      body<{ accessToken: string }>(
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email, password })
          .expect(200),
      ).accessToken;
    ownerToken = await login(ownerEmail);
    invitedToken = await login(invitedEmail);
    await login(otherEmail);
    ownerId = (await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } })).id;
    invitedId = (await prisma.user.findUniqueOrThrow({ where: { email: invitedEmail } })).id;
    workspaceId = body<{ id: string }>(
      await request(app.getHttpServer())
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Negocio compartido', type: 'BUSINESS' })
        .expect(201),
    ).id;
  });

  beforeEach(async () => {
    await prisma.workspaceInvitation.deleteMany({ where: { workspaceId } });
    await prisma.workspaceMember.deleteMany({
      where: { workspaceId, userId: { not: ownerId } },
    });
  });

  afterAll(async () => {
    if (prisma) {
      if (workspaceId) {
        await prisma.workspaceInvitation.deleteMany({ where: { workspaceId } });
        await prisma.category.deleteMany({ where: { workspaceId } });
        await prisma.workspaceMember.deleteMany({ where: { workspaceId } });
        await prisma.workspace.deleteMany({ where: { id: workspaceId } });
      }
      await prisma.user.deleteMany({
        where: { email: { in: [ownerEmail, invitedEmail, otherEmail] } },
      });
    }
    if (app) await app.close();
  });

  const createInvitation = (
    overrides: {
      email?: string;
      role?: 'ADMIN' | 'STAFF' | 'VIEWER';
      status?: 'PENDING' | 'ACCEPTED';
      expiresAt?: Date;
    } = {},
  ) =>
    prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email: overrides.email ?? invitedEmail,
        role: overrides.role ?? 'STAFF',
        status: overrides.status ?? 'PENDING',
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 86_400_000),
        tokenHash: randomUUID(),
        invitedByUserId: ownerId,
        ...(overrides.status === 'ACCEPTED' ? { acceptedAt: new Date() } : {}),
      },
    });

  it('requires authentication and returns only active pending invitations for the JWT email', async () => {
    await request(app.getHttpServer()).get('/api/v1/workspace-invitations/me').expect(401);
    const own = await createInvitation();
    await createInvitation({ email: otherEmail });
    await createInvitation({ status: 'ACCEPTED' });

    const invitations = body<
      Array<{
        id: string;
        workspace: { id: string; name: string; type: string };
        invitedBy?: { id: string; name: string };
        token?: string;
        tokenHash?: string;
      }>
    >(
      await request(app.getHttpServer())
        .get('/api/v1/workspace-invitations/me')
        .set('Authorization', `Bearer ${invitedToken}`)
        .expect(200),
    );
    expect(invitations).toHaveLength(1);
    expect(invitations[0]).toMatchObject({
      id: own.id,
      workspace: { id: workspaceId, name: 'Negocio compartido', type: 'BUSINESS' },
      invitedBy: { id: ownerId, name: 'George Invitations' },
    });
    expect(invitations[0]).not.toHaveProperty('token');
    expect(invitations[0]).not.toHaveProperty('tokenHash');

    await prisma.workspaceInvitation.delete({ where: { id: own.id } });
    await createInvitation({ expiresAt: new Date(Date.now() - 1000) });
    const withoutExpired = body<unknown[]>(
      await request(app.getHttpServer())
        .get('/api/v1/workspace-invitations/me')
        .set('Authorization', `Bearer ${invitedToken}`)
        .expect(200),
    );
    expect(withoutExpired).toHaveLength(0);
    const replacement = body<{ token: string; tokenHash?: string }>(
      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${workspaceId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: invitedEmail, role: 'VIEWER' })
        .expect(201),
    );
    expect(replacement.token).toEqual(expect.any(String));
    expect(replacement).not.toHaveProperty('tokenHash');
  });

  it('accepts its own invitation transactionally and preserves the offered role', async () => {
    const invitation = await createInvitation({ role: 'ADMIN' });
    const membership = body<{ workspaceId: string; userId: string; role: string }>(
      await request(app.getHttpServer())
        .post(`/api/v1/workspace-invitations/${invitation.id}/accept`)
        .set('Authorization', `Bearer ${invitedToken}`)
        .expect(201),
    );
    expect(membership).toMatchObject({ workspaceId, userId: invitedId, role: 'ADMIN' });
    expect(
      await prisma.workspaceInvitation.findUniqueOrThrow({ where: { id: invitation.id } }),
    ).toMatchObject({ status: 'ACCEPTED', acceptedAt: expect.any(Date) });
  });

  it('rejects foreign, missing, used, expired, and already-member acceptance', async () => {
    const foreign = await createInvitation({ email: otherEmail });
    await request(app.getHttpServer())
      .post(`/api/v1/workspace-invitations/${foreign.id}/accept`)
      .set('Authorization', `Bearer ${invitedToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/workspace-invitations/${randomUUID()}/accept`)
      .set('Authorization', `Bearer ${invitedToken}`)
      .expect(404);
    const used = await createInvitation({ status: 'ACCEPTED' });
    await request(app.getHttpServer())
      .post(`/api/v1/workspace-invitations/${used.id}/accept`)
      .set('Authorization', `Bearer ${invitedToken}`)
      .expect(409);
    const expired = await createInvitation({ expiresAt: new Date(Date.now() - 1000) });
    await request(app.getHttpServer())
      .post(`/api/v1/workspace-invitations/${expired.id}/accept`)
      .set('Authorization', `Bearer ${invitedToken}`)
      .expect(400);
    await prisma.workspaceInvitation.update({
      where: { id: expired.id },
      data: { status: 'EXPIRED' },
    });
    await prisma.workspaceMember.create({
      data: { workspaceId, userId: invitedId, role: 'VIEWER' },
    });
    const duplicate = await createInvitation();
    await request(app.getHttpServer())
      .post(`/api/v1/workspace-invitations/${duplicate.id}/accept`)
      .set('Authorization', `Bearer ${invitedToken}`)
      .expect(409);
  });

  it('rejects its own invitation without creating membership and denies another email', async () => {
    const invitation = await createInvitation();
    await request(app.getHttpServer())
      .post(`/api/v1/workspace-invitations/${invitation.id}/reject`)
      .set('Authorization', `Bearer ${invitedToken}`)
      .expect(200)
      .expect(({ body: responseBody }: Response) => {
        expect(responseBody).toMatchObject({ id: invitation.id, status: 'REJECTED' });
      });
    expect(await prisma.workspaceMember.count({ where: { workspaceId, userId: invitedId } })).toBe(
      0,
    );

    const foreign = await createInvitation({ email: otherEmail });
    await request(app.getHttpServer())
      .post(`/api/v1/workspace-invitations/${foreign.id}/reject`)
      .set('Authorization', `Bearer ${invitedToken}`)
      .expect(403);
  });
});
