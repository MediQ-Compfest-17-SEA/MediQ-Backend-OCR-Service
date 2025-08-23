import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, Observable } from 'rxjs';
import FormData from 'form-data';
import type { ClientGrpc } from '@nestjs/microservices';

interface QueueAddRequest {
    nik: string;
    nama: string;
    tempat_lahir?: string;
    tgl_lahir?: string;
    jenis_kelamin?: string;
    alamat?: string;
    agama?: string;
    priority?: string;
    keterangan?: string;
    institutionId?: string;
}
interface QueueAddResponse {
    success: boolean;
    message?: string;
    // JSON string of queue dto
    dataJson?: string;
    error?: string;
}
interface QueueGrpcService {
    AddToQueue(data: QueueAddRequest): Observable<QueueAddResponse>;
}

@Injectable()
export class OcrService implements OnModuleInit {

    private readonly ocrApiUrl: string;
    // In-memory temporary store with TTL
    private readonly tempStore: Map<string, { data: any; createdAt: number }> = new Map();
    private readonly tempTtlMs = 3 * 60 * 60 * 1000; // 3 hours
    private readonly cleanupIntervalMs = 10 * 60 * 1000; // sweep every 10 minutes

    private queueGrpc!: QueueGrpcService;

    constructor(
        private readonly httpService: HttpService,
        @Inject('QUEUE_GRPC') private readonly queueClient: ClientGrpc,
    ) {
        this.ocrApiUrl = process.env.OCR_API_URL || 'http://localhost:8604';
        // start background cleanup
        setInterval(() => this.sweepExpiredTemps(), this.cleanupIntervalMs).unref?.();
    }

    onModuleInit(): void {
        this.queueGrpc = this.queueClient.getService<QueueGrpcService>('QueueService');
    }

    async processImage(file: Express.Multer.File): Promise<any> {
        try {
            if (!file?.buffer || !file?.mimetype) {
                throw new Error('Invalid file payload received by OCR Service');
            }

            const formData = new FormData();
            // Be compatible with upstream engine field expectations by sending both keys
            formData.append('file', file.buffer, {
                filename: file.originalname || 'upload.jpg',
                contentType: file.mimetype,
            });
            formData.append('image', file.buffer, {
                filename: file.originalname || 'upload.jpg',
                contentType: file.mimetype,
            });

            const response = await firstValueFrom(
                this.httpService.post(this.ocrApiUrl, formData, {
                    headers: {
                        ...formData.getHeaders(),
                    },
                    // Large file support and robust error bubbling
                    maxBodyLength: Infinity as any,
                    maxContentLength: Infinity as any,
                    timeout: 120000,
                    validateStatus: () => true,
                }),
            );

            if (response.status >= 200 && response.status < 300) {
                return response.data;
            }

            // Bubble meaningful upstream error (will be surfaced via Gateway)
            throw new Error(
                `Upstream OCR engine error: status=${response.status}, body=${JSON.stringify(response.data)}`,
            );
        } catch (error: any) {
            // Preserve upstream response detail if present
            const upstream =
                error?.response?.data ||
                error?.message ||
                'unknown_upstream_error';

            // If we already have a normalized upstream OCR engine error string, let controller parse it.
            if (typeof upstream === 'string' && /^Upstream OCR engine error: status=\d+,\s*body=/.test(upstream)) {
                throw new Error(upstream);
            }

            // Otherwise, wrap as a descriptive failure while preserving details
            throw new Error(
                `Failed to process image: ${
                    typeof upstream === 'string' ? upstream : JSON.stringify(upstream)
                }`,
            );
        }
    }

    // Simple random id generator (avoids external deps)
    private generateTempId(): string {
        const rand = Math.random().toString(36).slice(2);
        const ts = Date.now().toString(36);
        return `TMP-${ts}-${rand}`.toUpperCase();
    }

    createTempRecord(ocrData: any): { tempId: string; data: any } {
        const tempId = this.generateTempId();
        // Normalize: flatten { result: {...} } into top-level fields and keep raw under _raw
        const flattened =
            ocrData && typeof ocrData === 'object' && ocrData.result && typeof ocrData.result === 'object'
                ? { ...ocrData.result }
                : { ...ocrData };
        const record = { ...flattened, _raw: ocrData };
        this.tempStore.set(tempId, { data: record, createdAt: Date.now() });
        return { tempId, data: record };
    }

    getTempRecord(tempId: string): any | null {
        const entry: any = this.tempStore.get(tempId);
        if (!entry) return null;

        // Legacy fix: if entry was incorrectly stored as raw data (without { data, createdAt })
        if (entry && typeof entry === 'object' && (entry.data === undefined || entry.createdAt === undefined)) {
            const legacy = entry;
            const flattened =
                legacy && legacy.result && typeof legacy.result === 'object' && !legacy.nik
                    ? { ...legacy.result }
                    : { ...legacy };
            const fixed = { data: { ...flattened, _raw: legacy }, createdAt: Date.now() };
            this.tempStore.set(tempId, fixed);
            return fixed.data;
        }

        if (this.isExpired(entry.createdAt)) {
            this.tempStore.delete(tempId);
            return null;
        }

        // Normalize data if needed (ensure top-level fields exist)
        const data = entry.data;
        if (data && !data.nik && data.result && typeof data.result === 'object') {
            const normalized = { ...data.result, _raw: data };
            const newEntry = { data: normalized, createdAt: entry.createdAt };
            this.tempStore.set(tempId, newEntry);
            return normalized;
        }

        return data;
    }

    private isValidNik(nik?: any): boolean {
        return typeof nik === 'string' && /^\d{16}$/.test(nik);
    }

    private hammingDistance(a: string, b: string): number {
        if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
        let d = 0;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
        return d;
    }

    private levenshtein(a: string, b: string): number {
        const m = a.length, n = b.length;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
            }
        }
        return dp[m][n];
    }

    patchTempRecord(tempId: string, patch: { ktp?: any; user?: any; institution?: any }): { tempId: string; data: any } {
        const entry: any = this.tempStore.get(tempId);
        if (!entry) return null as any;

        // Handle legacy wrongly stored entries
        let container = entry;
        if (entry && typeof entry === 'object' && (entry.data === undefined || entry.createdAt === undefined)) {
            container = { data: entry, createdAt: Date.now() };
        }

        if (this.isExpired(container.createdAt)) {
            this.tempStore.delete(tempId);
            return null as any;
        }

        // Determine base data (flatten if necessary)
        const baseData = container.data || {};
        const baseNik = baseData?.nik ?? baseData?.result?.nik;
        const baseNama = baseData?.nama ?? baseData?.result?.nama;

        if (!baseNik || !baseNama) {
            throw new Error('Data KTP tidak tersedia. Silakan unggah ulang foto KTP.');
        }

        // Start from flattened snapshot
        let updated = { ...(baseData?.result && !baseData.nik ? baseData.result : baseData) };

        if (patch?.ktp) {
            const pNik = patch.ktp.nik;
            const pNama = patch.ktp.nama;

            if (pNik) {
                if (!this.isValidNik(pNik)) {
                    throw new Error('Format NIK tidak valid. Harus 16 digit.');
                }
                // Enforce small difference: allow up to 2 digit difference from OCR result
                const d = this.hammingDistance(String(baseNik), String(pNik));
                if (!this.isValidNik(baseNik) || d > 2) {
                    throw new Error('Perbedaan NIK terlalu jauh dari hasil OCR. Silakan unggah ulang foto KTP.');
                }
            }

            if (pNama) {
                const a = String(baseNama).toUpperCase().replace(/\s+/g, '');
                const b = String(pNama).toUpperCase().replace(/\s+/g, '');
                const dist = this.levenshtein(a, b);
                const thresh = Math.max(3, Math.floor(a.length * 0.2));
                if (dist > thresh) {
                    throw new Error('Perbedaan nama terlalu jauh dari hasil OCR. Silakan unggah ulang foto KTP.');
                }
            }

            updated = { ...updated, ...patch.ktp };
        }

        if (patch?.user) {
            updated = { ...updated, ...patch.user };
        }

        if (patch?.institution) {
            updated = { ...updated, ...patch.institution };
        }

        // Persist back with proper container shape
        this.tempStore.set(tempId, { data: updated, createdAt: container.createdAt });
        return { tempId, data: updated };
    }

    private isExpired(createdAt: number): boolean {
        return Date.now() - createdAt > this.tempTtlMs;
    }

    private sweepExpiredTemps(): void {
        const now = Date.now();
        for (const [key, value] of this.tempStore.entries()) {
            if (now - value.createdAt > this.tempTtlMs) {
                this.tempStore.delete(key);
            }
        }
    }

    async confirmAndQueue(data: any, institutionId?: string): Promise<any> {
        const userApiBase = process.env.USER_API_URL || 'http://localhost:8602';

        // HTTP path (stateless & reliable over public interface)
        // 1) Upsert user (best-effort) - create if not exists
        try {
            // Check NIK (204 exists / 404 not exists)
            const check = await firstValueFrom(
                this.httpService.get(`${userApiBase}/users/check-nik/${encodeURIComponent(String(data.nik))}`, {
                    validateStatus: () => true,
                }),
            );
            if (check.status !== 204) {
                const userPayload = {
                    nik: data.nik,
                    name: data.nama,
                    tempat_lahir: data.tempat_lahir,
                    tgl_lahir: data.tgl_lahir,
                    jenis_kelamin: data.jenis_kelamin,
                    alamat_jalan: data.alamat?.name,
                    alamat_kel_desa: data.alamat?.kel_desa,
                    alamat_kecamatan: data.alamat?.kecamatan,
                    alamat_rt_rw: data.alamat?.rt_rw,
                    agama: data.agama,
                    status_perkawinan: data.status_perkawinan,
                    pekerjaan: data.pekerjaan,
                    kewarganegaraan: data.kewarganegaraan,
                    berlaku_hingga: data.berlaku_hingga,
                };
                await firstValueFrom(this.httpService.post(`${userApiBase}/users`, userPayload));
            }
        } catch {
            // ignore user create errors, continue
        }

        // 2) Add to queue via gRPC (does not require userId; pass KTP fields)
        const alamatParts = [
            data.alamat?.name,
            data.alamat?.rt_rw ? `RT/RW ${data.alamat.rt_rw}` : undefined,
            data.alamat?.kel_desa ? `Kel. ${data.alamat.kel_desa}` : undefined,
            data.alamat?.kecamatan ? `Kec. ${data.alamat.kecamatan}` : undefined,
        ].filter(Boolean);
        const alamatText = alamatParts.join(', ');

        let queue: any = undefined;
        try {
            const qResp = await firstValueFrom(
                this.queueGrpc.AddToQueue({
                    nik: String(data.nik || ''),
                    nama: String(data.nama || ''),
                    tempat_lahir: String(data.tempat_lahir || ''),
                    tgl_lahir: String(data.tgl_lahir || ''),
                    jenis_kelamin: String(data.jenis_kelamin || ''),
                    alamat: alamatText || '-',
                    agama: String(data.agama || '-'),
                    keterangan: 'Auto-registered via OCR',
                    institutionId: String(institutionId || ''),
                }),
            );
            queue = qResp?.dataJson ? JSON.parse(qResp.dataJson) : qResp;
        } catch (err: any) {
            queue = { grpcFallback: true, error: err?.message || 'queue_grpc_failed' };
        }

        // 3) Auto-login to return JWT tokens (HTTP)
        let tokens: any = undefined;
        try {
            const resp = await firstValueFrom(
                this.httpService.post(`${userApiBase}/auth/login/user`, {
                    nik: String(data.nik || ''),
                    name: String(data.nama || ''),
                }),
            );
            tokens = resp?.data ?? { httpFallback: true, raw: resp?.data };
        } catch {
            tokens = { error: 'login_failed' };
        }

        return {
            success: true,
            message: 'Data berhasil diproses dan masuk ke antrian.',
            queue,
            tokens,
        };
    }

    // Confirm from tempId flow: fetch, register, queue, and delete temp
    async confirmFromTemp(tempId: string, institutionId?: string): Promise<any> {
        const temp = this.getTempRecord(tempId);
        if (!temp) {
            // Return structured error instead of throwing to avoid RMQ -> HTTP 500 propagation
            return { success: false, error: 'Temporary OCR data not found', code: 'TEMP_NOT_FOUND', tempId };
        }
        const result = await this.confirmAndQueue(temp, institutionId);
        this.tempStore.delete(tempId);
        return { success: true, ...result, tempIdDeleted: tempId };
    }
}
