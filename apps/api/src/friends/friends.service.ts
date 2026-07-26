import { Injectable, NotFoundException } from '@nestjs/common';
import { getNextBirthdayInfo, type Birthday } from '@dogum-gunu/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { Friend } from '../generated/prisma/client';
import { CreateFriendDto } from './dto/create-friend.dto';
import { UpdateFriendDto } from './dto/update-friend.dto';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateFriendDto) {
    return this.prisma.friend.create({
      data: {
        userId,
        name: dto.name,
        birthDate: new Date(dto.birthDate),
        notes: dto.notes ?? null,
        photoUrl: dto.photoUrl ?? null,
      },
    });
  }

  async findAllSortedByUpcoming(userId: string): Promise<Birthday[]> {
    const friends = await this.prisma.friend.findMany({ where: { userId } });
    return this.toSortedBirthdays(friends);
  }

  async findUpcoming(userId: string, days: number): Promise<Birthday[]> {
    const friends = await this.prisma.friend.findMany({ where: { userId } });
    return this.toSortedBirthdays(friends).filter((friend) => friend.daysUntil <= days);
  }

  async findOneOwned(userId: string, id: string): Promise<Friend> {
    const friend = await this.prisma.friend.findUnique({ where: { id } });
    if (!friend || friend.userId !== userId) {
      throw new NotFoundException('Arkadaş bulunamadı.');
    }
    return friend;
  }

  async update(userId: string, id: string, dto: UpdateFriendDto): Promise<Friend> {
    await this.findOneOwned(userId, id);
    return this.prisma.friend.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.birthDate !== undefined && { birthDate: new Date(dto.birthDate) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
      },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOneOwned(userId, id);
    await this.prisma.friend.delete({ where: { id } });
  }

  private toSortedBirthdays(friends: Friend[]): Birthday[] {
    return friends
      .map((friend) => {
        const info = getNextBirthdayInfo(friend.birthDate);
        return {
          friendId: friend.id,
          name: friend.name,
          photoUrl: friend.photoUrl,
          birthDate: friend.birthDate.toISOString(),
          daysUntil: info.daysUntil,
          turningAge: info.turningAge,
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }
}
