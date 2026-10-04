import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret') || 'powerzone-access-secret-dev',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.usersRepo.findOne({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        gymId: true,
        isSuperAdmin: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('El usuario no está activo o no existe.');
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      gymId: user.gymId,
      isSuperAdmin: user.isSuperAdmin,
    };
  }
}
