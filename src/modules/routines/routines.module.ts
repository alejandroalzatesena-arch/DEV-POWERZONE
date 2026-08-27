import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutinesController } from './routines.controller';
import { RoutinesService } from './routines.service';
import { Routine } from './entities/routine.entity';
import { RoutineExercise } from './entities/routine-exercise.entity';
import { User } from '../users/entities/user.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { AiProxyModule } from '../ai-proxy/ai-proxy.module';

@Module({
  imports: [TypeOrmModule.forFeature([Routine, RoutineExercise, User, Exercise]), AiProxyModule],
  controllers: [RoutinesController],
  providers: [RoutinesService],
  exports: [RoutinesService],
})
export class RoutinesModule {}