import { Injectable } from '@nestjs/common';
import { createApiResponse } from '@dispenco/utils';
import { ApiResponse } from '@dispenco/types';

@Injectable()
export class AppService {
  getHealth(): ApiResponse<{ status: string }> {
    return createApiResponse({ status: 'ok' }, 'Dispenco API is operational');
  }
}
