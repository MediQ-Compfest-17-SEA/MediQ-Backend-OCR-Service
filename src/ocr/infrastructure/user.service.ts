import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UserService {
    constructor(private readonly httpService: HttpService) { }

    async checkNikExists(nik: string): Promise<boolean> {
        const userServiceUrl = process.env.USER_SERVICE_URL;
        const response = await firstValueFrom(
            this.httpService.get(`${userServiceUrl}/users/check-nik`, { params: { nik } })
        );
        return response.data.exists;
    }

    async createUser(data: any): Promise<any> {
        const userServiceUrl = process.env.USER_SERVICE_URL;
        const response = await firstValueFrom(
            this.httpService.post(`${userServiceUrl}/users`, data)
        );
        return response.data;
    }

    async getUserByNik(nik: string): Promise<any> {
        const userServiceUrl = process.env.USER_SERVICE_URL;
        const response = await firstValueFrom(
            this.httpService.get(`${userServiceUrl}/users/by-nik`, { params: { nik } })
        );
        return response.data;
    }
}