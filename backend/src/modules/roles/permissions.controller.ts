import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, type PermissionDef } from './permission.catalog';

// Catalogue is just labels; any authenticated user may read it (the frontend
// needs it to know which resources are permission-gated).
@ApiTags('permissions')
@ApiBearerAuth('access-token')
@Controller('permissions')
export class PermissionsController {
  @Get()
  @ApiOperation({ summary: 'List the assignable permission catalogue' })
  catalog(): PermissionDef[] {
    return PERMISSIONS;
  }
}
