import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from '../roles/roles.service';
import { User } from './entities/user.entity';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const repoMock: Partial<jest.Mocked<UsersRepository>> = {
      create: jest.fn((data) => data as User),
      save: jest.fn((user) => Promise.resolve({ id: 'uuid', ...user })),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repoMock },
        {
          provide: RolesService,
          useValue: {
            findByNames: jest.fn(() => Promise.resolve([{ name: 'user' }])),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(UsersRepository);
  });

  it('hashes the password and persists a new user', async () => {
    repo.findByEmail.mockResolvedValue(null);

    const user = await service.create({
      email: 'a@b.com',
      name: 'Ada',
      password: 'supersecret',
    });

    expect(repo.findByEmail).toHaveBeenCalledWith('a@b.com');
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe('supersecret');
    expect(repo.save).toHaveBeenCalled();
  });

  it('rejects a duplicate email', async () => {
    repo.findByEmail.mockResolvedValue({ id: 'x' } as User);

    await expect(
      service.create({
        email: 'a@b.com',
        name: 'Ada',
        password: 'supersecret',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when a user is missing', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
