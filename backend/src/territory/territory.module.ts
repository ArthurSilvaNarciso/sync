import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerritoryController } from './territory.controller';
import { TerritoryService } from './territory.service';
import { TerritoryCell } from './entities/territory-cell.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([TerritoryCell, User]), AuthModule],
  controllers: [TerritoryController],
  providers: [TerritoryService],
  exports: [TerritoryService],
})
export class TerritoryModule {}
