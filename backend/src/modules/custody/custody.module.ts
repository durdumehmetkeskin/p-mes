import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustodyService } from './custody.service';
import { CustodyRecord } from './entities/custody-record.entity';

/**
 * The per-user custody ("zimmet") ledger. Deliberately dependency-free (only
 * the entity) so inventory, project and products can all import it without a
 * module cycle; no controller — reads go through /my-work.
 */
@Module({
  imports: [TypeOrmModule.forFeature([CustodyRecord])],
  providers: [CustodyService],
  exports: [CustodyService],
})
export class CustodyModule {}
