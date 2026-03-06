import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReturnRequestStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReturnsService } from './returns.service';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';

@ApiTags('returns')
@Controller('returns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get('admin')
  @ApiOperation({ summary: 'List return requests (Admin) with pagination and filters' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('orderNumber') orderNumber?: string,
    @Query('email') email?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10) || 20)) : 20;
    const statusEnum =
      status && Object.values(ReturnRequestStatus).includes(status as ReturnRequestStatus)
        ? (status as ReturnRequestStatus)
        : undefined;
    return this.returnsService.findAllAdmin({
      page: pageNum,
      limit: limitNum,
      status: statusEnum,
      orderNumber: orderNumber?.trim() || undefined,
      email: email?.trim() || undefined,
    });
  }

  @Get('admin/:id')
  @ApiOperation({ summary: 'Get return request by ID (Admin)' })
  findOne(@Param('id') id: string) {
    return this.returnsService.findOneAdmin(id);
  }

  @Patch('admin/:id')
  @ApiOperation({ summary: 'Update return request status and admin notes (Admin)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateReturnStatusDto) {
    return this.returnsService.updateStatus(id, dto);
  }
}
