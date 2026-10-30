export interface EligibilityRules {
  userId: string;
  blockedIds: ReadonlySet<string>;
  /** Posts deja likes ou commentes par l'utilisateur : jamais reproposes. */
  engagedPostIds: ReadonlySet<string>;
  now: Date;
  maxAgeDays: number;
  eventPostMaxAgeDays: number;
}
