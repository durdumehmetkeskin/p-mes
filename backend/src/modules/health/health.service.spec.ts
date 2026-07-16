import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should report an ok status', () => {
    const result = service.check();
    expect(result.status).toBe('ok');
    expect(typeof result.uptime).toBe('number');
  });
});
