import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { JwtPayload, RefreshTokenPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole, ActivityLevel, FitnessGoal } from '../../common/enums';
import { Gym } from './../gyms/entities/gym.entity';
import { User } from './../users/entities/user.entity';
import { UserProfile } from './../users/entities/user-profile.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthUserDto, LoginResponseDto, TokenPairDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserProfile) private readonly profilesRepo: Repository<UserProfile>,
    @InjectRepository(RefreshToken) private readonly refreshTokensRepo: Repository<RefreshToken>,
    @InjectRepository(Gym) private readonly gymsRepo: Repository<Gym>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<LoginResponseDto> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email.');
    }

    const gym = await this.gymsRepo.findOne({ where: { id: dto.gymId, isActive: true } });
    if (!gym) {
      throw new UnauthorizedException('El gimnasio indicado no existe o está inactivo.');
    }

    const rounds = this.configService.get<number>('app.bcryptRounds') ?? 10;
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = await this.usersRepo.save(
      this.usersRepo.create({
        email: dto.email.toLowerCase(),
        password: passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.CLIENT,
        gymId: dto.gymId,
        isActive: true,
      }),
    );

    const profile = new UserProfile();
    profile.userId = user.id;
    profile.activityLevel = ActivityLevel.MODERATE;
    profile.goal = FitnessGoal.GENERAL_FITNESS;
    await this.profilesRepo.save(profile);

    const tokens = await this.issueTokens(user.id, 'registration', undefined);
    return { user: this.toAuthUser(user), tokens };
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string): Promise<LoginResponseDto> {
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: dto.email.toLowerCase() })
      .getOne();
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta está desactivada. Contacta al administrador.');
    }

    user.lastLoginAt = new Date();
    await this.usersRepo.save(user);

    const tokens = await this.issueTokens(user.id, userAgent, ip);
    return { user: this.toAuthUser(user), tokens };
  }

  async refresh(dto: RefreshTokenDto, userAgent?: string, ip?: string): Promise<TokenPairDto> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado.');
    }

    const stored = await this.refreshTokensRepo.findOne({
      where: { id: payload.tokenId },
    });

    if (!stored || stored.userId !== payload.sub) {
      throw new UnauthorizedException('Refresh token no registrado.');
    }
    if (stored.revokedAt) {
      throw new UnauthorizedException('Refresh token revocado.');
    }
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado.');
    }
    if (stored.tokenHash !== this.hashToken(dto.refreshToken)) {
      throw new UnauthorizedException('Refresh token no coincide con el registro.');
    }

    // Rotación de tokens: se revoca el usado y se emite uno nuevo.
    stored.revokedAt = new Date();
    await this.refreshTokensRepo.save(stored);

    return this.issueTokens(payload.sub, userAgent, ip);
  }

  async logout(dto: LogoutDto): Promise<void> {
    const payload = await this.jwtService
      .verifyAsync<RefreshTokenPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      })
      .catch(() => null);

    if (!payload) return;

    const token = await this.refreshTokensRepo.findOne({ where: { id: payload.tokenId } });
    if (token) {
      token.revokedAt = new Date();
      await this.refreshTokensRepo.save(token);
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :userId', { userId })
      .getOne();
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    const rounds = this.configService.get<number>('app.bcryptRounds') ?? 10;
    user.password = await bcrypt.hash(dto.newPassword, rounds);
    await this.usersRepo.save(user);

    await this.revokeAllUserTokens(userId);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokensRepo.update({ userId }, { revokedAt: new Date() });
  }

  async me(userId: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id: userId }, relations: ['gym'] });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }
    return user;
  }

  private async issueTokens(
    userId: string,
    userAgent?: string,
    ip?: string,
  ): Promise<TokenPairDto> {
    const user = await this.usersRepo.findOneOrFail({ where: { id: userId } });
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn') || '15m';
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';

    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      gymId: user.gymId,
      isSuperAdmin: user.isSuperAdmin,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.get<string>('jwt.accessSecret') || 'powerzone-access-secret-dev',
      expiresIn: accessExpiresIn as any,
    });

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenId: randomUUID(),
      type: 'refresh',
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get<string>('jwt.refreshSecret') || 'powerzone-refresh-secret-dev',
      expiresIn: refreshExpiresIn as any,
    });

    await this.refreshTokensRepo.save(
      this.refreshTokensRepo.create({
        id: refreshPayload.tokenId,
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.parseExpirationSeconds(refreshExpiresIn) * 1000),
        userAgent,
        ipAddress: ip,
      }),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpirationSeconds(accessExpiresIn),
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpirationSeconds(exp: string): number {
    const match = /^(\d+)([smhd])$/.exec(exp);
    if (!match) return 900;
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }

  private toAuthUser(user: User): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      gymId: user.gymId,
      isSuperAdmin: user.isSuperAdmin,
    };
  }
}
