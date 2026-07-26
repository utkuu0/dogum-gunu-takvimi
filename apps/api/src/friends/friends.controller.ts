import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '../generated/prisma/client';
import { CreateFriendDto } from './dto/create-friend.dto';
import { UpcomingQueryDto } from './dto/upcoming-query.dto';
import { UpdateFriendDto } from './dto/update-friend.dto';
import { FriendsService } from './friends.service';

@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateFriendDto) {
    return this.friendsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.friendsService.findAllSortedByUpcoming(user.id);
  }

  @Get('upcoming')
  findUpcoming(@CurrentUser() user: User, @Query() query: UpcomingQueryDto) {
    return this.friendsService.findUpcoming(user.id, query.days ?? 30);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.friendsService.findOneOwned(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateFriendDto) {
    return this.friendsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.friendsService.remove(user.id, id);
  }
}
