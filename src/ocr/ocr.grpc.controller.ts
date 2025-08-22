import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { OcrService } from './ocr.service';

@Controller()
export class OcrGrpcController {
  constructor(private readonly ocrService: OcrService) {}

  // ocr.v1.OcrService/GetTemp
  @GrpcMethod('OcrService', 'GetTemp')
  getTemp(data: { tempId: string }) {
    try {
      const current = this.ocrService.getTempRecord(data.tempId);
      if (!current) {
        return {
          success: false,
          tempId: data.tempId,
          dataJson: '',
          error: 'Temporary OCR data not found',
        };
      }
      return {
        success: true,
        tempId: data.tempId,
        dataJson: JSON.stringify(current),
        error: '',
      };
    } catch (e: any) {
      return {
        success: false,
        tempId: data.tempId,
        dataJson: '',
        error: e?.message || 'get_temp_failed',
      };
    }
  }

  // ocr.v1.OcrService/PatchTemp
  @GrpcMethod('OcrService', 'PatchTemp')
  patchTemp(data: { tempId: string; patchJson: string }) {
    try {
      const patch = data?.patchJson ? JSON.parse(data.patchJson) : {};
      const updated = this.ocrService.patchTempRecord(data.tempId, patch);
      if (!updated) {
        return {
          success: false,
          tempId: data.tempId,
          dataJson: '',
          error: 'Temporary OCR data not found',
        };
      }
      return {
        success: true,
        tempId: data.tempId,
        dataJson: JSON.stringify(updated.data ?? updated),
        error: '',
      };
    } catch (e: any) {
      return {
        success: false,
        tempId: data.tempId,
        dataJson: '',
        error: e?.message || 'patch_temp_failed',
      };
    }
  }

  // ocr.v1.OcrService/Confirm
  @GrpcMethod('OcrService', 'Confirm')
  async confirm(data: { dataJson: string; institutionId?: string }) {
    try {
      const payload = data?.dataJson ? JSON.parse(data.dataJson) : {};
      const result = await this.ocrService.confirmAndQueue(payload, data?.institutionId);
      return {
        success: true,
        message: result?.message || 'confirmed',
        queueJson: JSON.stringify(result?.queue ?? {}),
        tokensJson: JSON.stringify(result?.tokens ?? {}),
        error: '',
      };
    } catch (e: any) {
      return {
        success: false,
        message: '',
        queueJson: '',
        tokensJson: '',
        error: e?.message || 'confirm_failed',
      };
    }
  }

  // ocr.v1.OcrService/ConfirmTemp
  @GrpcMethod('OcrService', 'ConfirmTemp')
  async confirmTemp(data: { tempId: string; institutionId?: string }) {
    try {
      const result = await this.ocrService.confirmFromTemp(data.tempId, data?.institutionId);
      if (!result?.success) {
        return {
          success: false,
          message: '',
          queueJson: '',
          tokensJson: '',
          tempIdDeleted: '',
          error: result?.error || 'confirm_temp_failed',
        };
      }
      return {
        success: true,
        message: result?.message || 'confirmed_from_temp',
        queueJson: JSON.stringify(result?.queue ?? {}),
        tokensJson: JSON.stringify(result?.tokens ?? {}),
        tempIdDeleted: result?.tempIdDeleted || data.tempId,
        error: '',
      };
    } catch (e: any) {
      return {
        success: false,
        message: '',
        queueJson: '',
        tokensJson: '',
        tempIdDeleted: '',
        error: e?.message || 'confirm_temp_failed',
      };
    }
  }
}