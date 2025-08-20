import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UserService {
    constructor(@Inject('USER_SERVICE') private readonly userClient: ClientProxy) { }

    async checkNikExists(nik: string): Promise<boolean> {
        return firstValueFrom(
            this.userClient.send('user.check-nik-exists', { nik })
        );
    }

    async createUser(data: any): Promise<any> {
        return firstValueFrom(
            this.userClient.send('user.create', data)
        );
    }

    async getUserByNik(nik: string): Promise<any> {
        return firstValueFrom(
            this.userClient.send('user.get-by-nik', { nik })
        );
    }
}