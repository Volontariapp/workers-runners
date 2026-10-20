export interface EligibilityRules {
  userId: string;
  blockedIds: ReadonlySet<string>;
  now: Date;
  maxAgeDays: number;
  eventPostMaxAgeDays: number;
}
