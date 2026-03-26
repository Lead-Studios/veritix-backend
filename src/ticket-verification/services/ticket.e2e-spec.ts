import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { getConnection } from 'typeorm';
import { UserEntity } from '../src/modules/users/entities/user.entity';
import { WalletEntity } from '../src/modules/users/entities/wallet.entity';
import { UsersModule } from '../src/modules/users/users.module';
import { UsersService } from '../src/modules/users/users.service';
import { WalletService } from '../src/modules/users/wallet.service';

describe('Query Exclusion Logic Integration Tests', () => {
  let app: INestApplication;
  let usersService: UsersService;
  let walletService: WalletService;
  let userId1: string;
  let userId2: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'test_db',
          entities: [UserEntity, WalletEntity],
          synchronize: true, // For testing purposes
        }),
        UsersModule,
      ],
      providers: [UsersService, WalletService],
    }).compile();

    app = moduleFixture.createNestApplication();
    usersService = moduleFixture.get<UsersService>(UsersService);
    walletService = moduleFixture.get<WalletService>(WalletService);

    await app.init();

    // Create two test users
    const user1 = await usersService.createUser({
      email: `user1-${Date.now()}@example.com`,
      firstName: 'User',
      lastName: 'One',
      status: 'active',
    });
    userId1 = user1.id;

    const user2 = await usersService.createUser({
      email: `user2-${Date.now()}@example.com`,
      firstName: 'User',
      lastName: 'Two',
      status: 'active',
    });
    userId2 = user2.id;
  });

  afterAll(async () => {
    // Clean up test data
    const entityManager = getConnection().manager;
    await entityManager.query('DELETE FROM wallets WHERE userId IN ($1, $2)', [userId1, userId2]);
    await entityManager.query('DELETE FROM users WHERE id IN ($1, $2)', [userId1, userId2]);
    
    await app.close();
  });

  it('should exclude soft-deleted users from active user queries', async () => {
    // Verify both users exist initially
    const initialUser1 = await usersService.findActiveUserById(userId1);
    const initialUser2 = await usersService.findActiveUserById(userId2);
    expect(initialUser1).toBeDefined();
    expect(initialUser2).toBeDefined();

    // Soft delete user1
    await usersService.softDeleteUser(userId1);

    // Verify user1 is no longer found in active queries
    await expect(usersService.findActiveUserById(userId1)).rejects.toThrow('Active user not found');

    // Verify user2 is still found in active queries
    const activeUser2 = await usersService.findActiveUserById(userId2);
    expect(activeUser2).toBeDefined();
    expect(activeUser2.id).toBe(userId2);

    // Verify soft-deleted user can still be found with withDeleted queries
    const softDeletedUser1 = await usersService.findUserById(userId1);
    expect(softDeletedUser1).toBeDefined();
    expect(softDeletedUser1.id).toBe(userId1);
    expect(softDeletedUser1.deletedAt).toBeDefined();
  });

  it('should exclude soft-deleted wallets from active wallet queries', async () => {
    // Create wallets for both users
    const wallet1 = await walletService.createWallet(userId1, {
      publicKey: '0x1111111111111111111111111111111111111111',
      name: 'User1 Wallet 1',
      type: 'crypto',
    });

    const wallet2 = await walletService.createWallet(userId2, {
      publicKey: '0x2222222222222222222222222222222222222222',
      name: 'User2 Wallet 1',
      type: 'crypto',
    });

    expect(wallet1).toBeDefined();
    expect(wallet2).toBeDefined();

    // Verify both wallets can be found initially
    const foundWallet1 = await walletService.getWalletById(wallet1.id);
    const foundWallet2 = await walletService.getWalletById(wallet2.id);
    expect(foundWallet1).toBeDefined();
    expect(foundWallet2).toBeDefined();

    // Soft delete wallet1
    await walletService.softDeleteWallet(wallet1.id);

    // Verify wallet1 is no longer found in active queries
    await expect(walletService.getWalletById(wallet1.id)).rejects.toThrow('Wallet not found');

    // Verify wallet2 is still found in active queries
    const activeWallet2 = await walletService.getWalletById(wallet2.id);
    expect(activeWallet2).toBeDefined();
    expect(activeWallet2.id).toBe(wallet2.id);

    // Verify soft-deleted wallet can still be found with withDeleted queries
    const walletRepo = getConnection().manager.getRepository(WalletEntity);
    const softDeletedWallet1 = await walletRepo.findOne({
      where: { id: wallet1.id },
      withDeleted: true,
    });
    expect(softDeletedWallet1).toBeDefined();
    expect(softDeletedWallet1!.id).toBe(wallet1.id);
    expect(softDeletedWallet1!.deletedAt).toBeDefined();
  });

  it('should exclude soft-deleted wallets when getting all wallets for a user', async () => {
    // Create multiple wallets for user2
    const wallet2a = await walletService.createWallet(userId2, {
      publicKey: '0x3333333333333333333333333333333333333333',
      name: 'User2 Wallet A',
      type: 'crypto',
    });

    const wallet2b = await walletService.createWallet(userId2, {
      publicKey: '0x4444444444444444444444444444444444444444',
      name: 'User2 Wallet B',
      type: 'crypto',
    });

    // Verify both wallets are found initially
    const allWalletsBefore = await walletService.getWalletsByUser(userId2);
    expect(allWalletsBefore.length).toBe(2);

    // Soft delete one of the wallets
    await walletService.softDeleteWallet(wallet2a.id);

    // Verify only the non-deleted wallet is returned
    const allWalletsAfter = await walletService.getWalletsByUser(userId2);
    expect(allWalletsAfter.length).toBe(1);
    expect(allWalletsAfter[0].id).toBe(wallet2b.id);

    // Verify the soft-deleted wallet still exists in the database
    const walletRepo = getConnection().manager.getRepository(WalletEntity);
    const allWalletsIncludingDeleted = await walletRepo.find({
      where: { userId: userId2 },
      withDeleted: true,
    });
    expect(allWalletsIncludingDeleted.length).toBe(2);
  });
});
