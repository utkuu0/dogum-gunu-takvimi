import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { FriendsModule } from './friends/friends.module';
import { FirebaseModule } from './firebase/firebase.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PhotosModule } from './photos/photos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: Number(configService.get('REDIS_PORT', '6379')),
        },
      }),
    }),
    PrismaModule,
    FirebaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    FriendsModule,
    NotificationsModule,
    PhotosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
