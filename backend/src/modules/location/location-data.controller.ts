import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { User } from '../users/entities/user.entity';
import { ReadingsSeriesQueryDto } from './dto/readings-series-query.dto';
import { LocationDataFile } from './entities/location-data-file.entity';
import { LocationDataService } from './location-data.service';

const MAX_FILE_BYTES = 20 * 1024 * 1024;

@ApiTags('location-data')
@ApiBearerAuth('access-token')
@Controller()
export class LocationDataController {
  constructor(private readonly service: LocationDataService) {}

  @RequirePermissions('location-data:create')
  @Post('locations/:id/data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }),
  )
  @ApiOperation({
    summary: 'Upload a sensor .xls; parses temperature/humidity (admin only)',
  })
  upload(
    @Param('id', ParseUUIDPipe) locationId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<LocationDataFile> {
    return this.service.upload(locationId, file, user?.id ?? null);
  }

  @RequirePermissions('location-data:read')
  @Get('locations/:id/data-files')
  @ApiOperation({ summary: "List a location's uploaded data files" })
  listFiles(
    @Param('id', ParseUUIDPipe) locationId: string,
  ): Promise<LocationDataFile[]> {
    return this.service.listFiles(locationId);
  }

  @RequirePermissions('location-data:read')
  @Get('locations/:id/readings')
  @ApiOperation({
    summary: 'Readings + summary for a location (optional date range)',
  })
  readings(
    @Param('id', ParseUUIDPipe) locationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getReadings(locationId, startDate, endDate);
  }

  @RequirePermissions('location-data:read')
  @Get('locations/:id/readings/range')
  @ApiOperation({
    summary: 'Recorded-at bounds + count (for the chart range picker)',
  })
  readingsRange(@Param('id', ParseUUIDPipe) locationId: string) {
    return this.service.getRange(locationId);
  }

  @RequirePermissions('location-data:read')
  @Get('locations/:id/readings/series')
  @ApiOperation({
    summary: 'Downsampled avg/min/max series (adaptive bucket size)',
  })
  readingsSeries(
    @Param('id', ParseUUIDPipe) locationId: string,
    @Query() q: ReadingsSeriesQueryDto,
  ) {
    return this.service.getSeries(locationId, {
      from: q.from,
      to: q.to,
      bucketSeconds: q.bucket,
      maxPoints: q.maxPoints,
    });
  }

  @RequirePermissions('location-data:read')
  @Get('location-data-files/:id/download')
  @ApiOperation({ summary: 'Download a raw data file' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, stream } = await this.service.downloadFile(id);
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(
        file.fileName,
      )}`,
    });
    return new StreamableFile(stream);
  }

  @RequirePermissions('location-data:delete')
  @Delete('location-data-files/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a data file and its readings (admin only)' })
  deleteFile(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.deleteFile(id);
  }

  @RequirePermissions('location-data:read')
  @Get('section-reservations/:id/conditions')
  @ApiOperation({ summary: 'Production conditions for a reservation' })
  conditions(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.conditionsForReservation(id);
  }

  @RequirePermissions('location-data:read')
  @Get('orders/:id/production-conditions')
  @ApiOperation({
    summary: 'Production conditions per reservation of an order',
  })
  orderConditions(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.conditionsForOrder(id);
  }
}
