import { Injectable } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import { INTERNAL_TOKEN_METADATA_KEY, JwtService } from '@volontariapp/auth';
import { UserRoles } from '@volontariapp/shared';

const TOKEN_CACHE_MS = 4 * 60 * 1000;
const WORKER_IDENTITY = 'worker-ranking';

/** Jeton interne ADMIN signe par le worker, mis en cache 4 minutes pour tous les appels gRPC. */
@Injectable()
export class InternalMetadataProvider {
  private cached?: { token: string; expiresAt: number };

  constructor(private readonly jwtService: JwtService) {}

  async get(): Promise<Metadata> {
    const now = Date.now();
    if (!this.cached || this.cached.expiresAt <= now) {
      const token = await this.jwtService.signInternal({
        id: WORKER_IDENTITY,
        role: UserRoles.ADMIN,
      });
      this.cached = { token, expiresAt: now + TOKEN_CACHE_MS };
    }
    const metadata = new Metadata();
    metadata.set(INTERNAL_TOKEN_METADATA_KEY, this.cached.token);
    return metadata;
  }
}
