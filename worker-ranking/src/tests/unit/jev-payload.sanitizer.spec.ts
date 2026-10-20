import { describe, expect, it } from '@jest/globals';
import type {
  RankingCandidate,
  TasteSummary,
} from '@volontariapp/domain-ranking';
import {
  buildJevRequestBody,
  sanitizeText,
} from '../../scoring/adapters/jev-payload.sanitizer.js';

describe('JevPayloadSanitizer (Unit & Security)', () => {
  it('replaces line breaks with spaces, collapses whitespace and truncates at maxLen', () => {
    const raw = '  Premier titre\navec retour\r\net    espaces multiples   ';
    expect(sanitizeText(raw, 20)).toBe('Premier titre avec r');
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });

  it('guarantees stable sorting of history by eventId', () => {
    const candidateB: RankingCandidate = {
      eventId: 'evt-2',
      name: 'Event B',
      type: 'SOCIAL',
      tags: ['social'],
      summary: 'Summary B',
    };
    const candidateA: RankingCandidate = {
      eventId: 'evt-1',
      name: 'Event A',
      type: 'ECOLOGY',
      tags: ['nature'],
      summary: 'Summary A',
    };

    const taste: TasteSummary = {
      ecologyShare: 0.5,
      socialShare: 0.5,
      history: [candidateB, candidateA],
    };

    const body = buildJevRequestBody('jev-latest', taste, [candidateA]);
    const history = body.state.taste.attended_or_wished;

    expect(history).toHaveLength(2);
    expect(history[0]?.name).toBe('Event A');
    expect(history[1]?.name).toBe('Event B');
  });

  it('CRITICAL PRIVACY: contains NO forbidden fields in the serialized payload', () => {
    // Simuler un candidat ou objet qui aurait ete pollue par des donnees sensibles
    const pollutedCandidate = {
      eventId: 'evt-secret-123',
      name: 'Atelier compostage\nEn plein air',
      type: 'ECOLOGY' as const,
      tags: ['compost', 'dechets'],
      summary: 'Apprenez a composter vos biodechets facilement chez vous.',
      // Champs interdits qui pourraient provenir d'une mauvaise source
      userId: 'usr-4444-5555',
      pseudo: 'SuperVictor',
      email: 'victor@volontariapp.org',
      rna: 'W123456789',
      passwordHash: '$2b$12$abcdefg123456',
      password: 'mypassword123',
      bio: 'Je suis un benevole passionne vivant a Paris',
      lat: 48.8566,
      lng: 2.3522,
      latitude: 48.8566,
      longitude: 2.3522,
      location: { lat: 48.8566, lng: 2.3522 },
      friendIds: ['usr-friend-1', 'usr-friend-2'],
    };

    const taste: TasteSummary = {
      ecologyShare: 0.7,
      socialShare: 0.3,
      history: [pollutedCandidate as unknown as RankingCandidate],
    };

    const body = buildJevRequestBody('jev-latest', taste, [
      pollutedCandidate as unknown as RankingCandidate,
    ]);

    const serialized = JSON.stringify(body);

    // Verifier l'absence formelle de chaque identifiant et donnee personnelle
    expect(serialized).not.toContain('usr-4444-5555');
    expect(serialized).not.toContain('SuperVictor');
    expect(serialized).not.toContain('victor@volontariapp.org');
    expect(serialized).not.toContain('W123456789');
    expect(serialized).not.toContain('$2b$12$abcdefg123456');
    expect(serialized).not.toContain('mypassword123');
    expect(serialized).not.toContain('vivant a Paris');
    expect(serialized).not.toContain('48.8566');
    expect(serialized).not.toContain('2.3522');
    expect(serialized).not.toContain('friend');
    expect(serialized).not.toContain('userId');
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('pseudo');
    expect(serialized).not.toContain('passwordHash');

    // Verifier la structure des questions
    expect(body.questions['evt-secret-123']).toBeDefined();
    expect(body.questions['evt-secret-123'].type).toBe('noul');
    expect(body.questions['evt-secret-123'].instructions.ask).toBe(
      'Cet evenement correspond-il aux gouts decrits dans state ?',
    );
    expect(body.questions['evt-secret-123'].instructions.candidate.name).toBe(
      'Atelier compostage En plein air',
    );
  });
});
