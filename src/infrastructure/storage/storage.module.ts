import { Global, Module } from '@nestjs/common';
import { CosStorageService } from './cos-storage.service.js';
import { STORAGE_PORT } from './storage.port.js';

@Global()
@Module({
  providers: [
    CosStorageService,
    { provide: STORAGE_PORT, useExisting: CosStorageService },
  ],
  exports: [STORAGE_PORT, CosStorageService],
})
export class StorageModule {}
