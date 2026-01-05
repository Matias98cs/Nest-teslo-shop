import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, LoginUserDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const { password, ...userData } = createUserDto;

      const user = this.userRepository.create({
        ...userData,
        password: bcrypt.hashSync(password, 10),
      });

      await this.userRepository.save(user);

      const newUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        tokek: this.getJwtToken({ email: user.email }),
      };

      //TODO: Retornar JWT

      return newUser;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    const user = await this.userRepository.findOne({
      where: { email },
      select: {
        email: true,
        password: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials (email)');
    }

    if (!bcrypt.compareSync(password, user.password)) {
      throw new UnauthorizedException('Invalid credentials (password)');
    }

    return {
      ...user,
      token: this.getJwtToken({ email: user.email }),
    };
  }

  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }

  private handleDBErrors(error: any): never {
    const errorRes = error as { code: string; detail: string; message: string };

    if (errorRes.code === '23505') {
      throw new BadRequestException(errorRes.detail);
    }
    this.logger.error(errorRes);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
