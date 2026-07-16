import {
  BadRequestException,
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
import { AttachmentsService } from './attachments.service';
import { Attachment } from './entities/attachment.entity';
import { AttachmentOwnerType } from './enums/attachment-owner-type.enum';

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

function parseOwnerType(value: string): AttachmentOwnerType {
  const owner = value as AttachmentOwnerType;
  if (!Object.values(AttachmentOwnerType).includes(owner)) {
    throw new BadRequestException(`Invalid owner type "${value}"`);
  }
  return owner;
}

@ApiTags('attachments')
@ApiBearerAuth('access-token')
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  // Query params (not a path) so it never collides with `:id/download`.
  @RequirePermissions('attachments:read')
  @Get()
  @ApiOperation({
    summary: 'List attachments for an owner (project/process/stage)',
  })
  list(
    @Query('ownerType') ownerType: string,
    @Query('ownerId', ParseUUIDPipe) ownerId: string,
    @CurrentUser() user: User,
  ): Promise<Attachment[]> {
    return this.service.findForOwner(parseOwnerType(ownerType), ownerId, user);
  }

  @RequirePermissions('attachments:create')
  @Post(':ownerType/:ownerId')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }),
  )
  @ApiOperation({
    summary: 'Upload a file attachment (project members; membership-scoped)',
  })
  upload(
    @Param('ownerType') ownerType: string,
    @Param('ownerId', ParseUUIDPipe) ownerId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<Attachment> {
    return this.service.upload(parseOwnerType(ownerType), ownerId, file, user);
  }

  @RequirePermissions('attachments:read')
  @Get(':id/download')
  @ApiOperation({ summary: 'Download an attachment' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: User,
  ): Promise<StreamableFile> {
    const { attachment, stream } = await this.service.getForDownload(id, user);
    res.set({
      'Content-Type': attachment.contentType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(
        attachment.fileName,
      )}`,
    });
    return new StreamableFile(stream);
  }

  @RequirePermissions('attachments:delete')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an attachment (membership-scoped)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.service.remove(id, user);
  }
}
