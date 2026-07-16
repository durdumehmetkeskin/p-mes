import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Contact } from './entities/contact.entity';
import { Customer } from './entities/customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Contact])],
  controllers: [CustomersController, ContactsController],
  providers: [CustomersService, ContactsService],
  // Entities are re-exported so other modules (e.g. project) can inject the
  // repositories / rely on the registered metadata for their relations.
  exports: [CustomersService, ContactsService, TypeOrmModule],
})
export class CustomersModule {}
