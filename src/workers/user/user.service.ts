import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import type { ISendWelcomeEmailPayload } from '@volontariapp/messaging';

@Injectable()
export class UserService {
  private readonly logger = new Logger({ context: UserService.name });

  async handleSendWelcomeEmail(payload: ISendWelcomeEmailPayload): Promise<void> {
    this.logger.info('Handling send welcome email', {
      userId: payload.userId,
      email: payload.email,
    });

    // Étape 3 du flux: récupère le job depuis queue Redis ✓ (fait par BaseWorker)
    // Étape 4: insère dans job_audit avec status 'working' ✓ (fait par BaseWorker.recordAuditStart)
    // Étape 5: exécute logique métier (CETTE FONCTION)
    // Étape 6: update job_audit avec status 'done' ✓ (fait par BaseWorker.recordAuditSuccess)

    // Logique métier: envoyer email de bienvenue
    // En production: appel à EmailService, SES, etc.
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate work

    this.logger.info('Welcome email processed', {
      userId: payload.userId,
    });
  }
}
