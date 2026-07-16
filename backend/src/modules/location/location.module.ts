import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessStage } from '../project/entities/process-stage.entity';
import { ProjectModule } from '../project/project.module';
import { StorageModule } from '../storage/storage.module';
import { LocationDataController } from './location-data.controller';
import { LocationDataService } from './location-data.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { SectionReservationsController } from './section-reservations.controller';
import { SectionReservationsService } from './section-reservations.service';
import { SectionScheduleService } from './section-schedule.service';
import { SectionsController } from './sections.controller';
import { SectionsService } from './sections.service';
import { StorageRacksController } from './storage-racks.controller';
import { StorageRacksService } from './storage-racks.service';

import { LocationDataFile } from './entities/location-data-file.entity';
import { LocationReading } from './entities/location-reading.entity';
import { LocationStorage } from './entities/location-storage.entity';
import { Location } from './entities/location.entity';
import { SectionReservation } from './entities/section-reservation.entity';
import { Section } from './entities/section.entity';
import { StorageRack } from './entities/storage-rack.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Location,
      Section,
      SectionReservation,
      LocationDataFile,
      LocationReading,
      // Read-only: the section schedule joins reserved orders' stages.
      ProcessStage,
      // Each location owns ONE storage area (Section-like child) with racks —
      // completely separate from the inventory Warehouse entity.
      LocationStorage,
      StorageRack,
    ]),
    StorageModule,
    ProjectModule,
  ],
  controllers: [
    LocationsController,
    SectionsController,
    StorageRacksController,
    SectionReservationsController,
    LocationDataController,
  ],
  providers: [
    LocationsService,
    SectionsService,
    StorageRacksService,
    SectionReservationsService,
    SectionScheduleService,
    LocationDataService,
  ],
  exports: [
    LocationsService,
    SectionsService,
    StorageRacksService,
    SectionReservationsService,
    LocationDataService,
  ],
})
export class LocationModule {}
