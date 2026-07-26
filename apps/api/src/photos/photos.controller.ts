import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '../generated/prisma/client';
import { AuthorizePhotosDto } from './dto/authorize-photos.dto';
import { PhotosService } from './photos.service';

@UseGuards(JwtAuthGuard)
@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Get('authorized')
  async isAuthorized(@CurrentUser() user: User) {
    return { authorized: await this.photosService.isAuthorized(user.id) };
  }

  @Post('authorize')
  async authorize(@CurrentUser() user: User, @Body() dto: AuthorizePhotosDto) {
    await this.photosService.authorize(user.id, dto);
    return { authorized: true };
  }

  @Post('sessions')
  createSession(@CurrentUser() user: User) {
    return this.photosService.createSession(user.id);
  }

  @Get('sessions/:sessionId')
  getSession(@CurrentUser() user: User, @Param('sessionId') sessionId: string) {
    return this.photosService.getSession(user.id, sessionId);
  }

  @Get('sessions/:sessionId/items')
  listPickedItems(@CurrentUser() user: User, @Param('sessionId') sessionId: string) {
    return this.photosService.listPickedItems(user.id, sessionId);
  }

  @Get('download-token')
  async getDownloadToken(@CurrentUser() user: User) {
    return { accessToken: await this.photosService.getAccessTokenForDownload(user.id) };
  }
}
