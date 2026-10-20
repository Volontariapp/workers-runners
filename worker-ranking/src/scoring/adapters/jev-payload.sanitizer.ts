import type {
  RankingCandidate,
  TasteSummary,
} from '@volontariapp/domain-ranking';

export interface JevPublicCandidate {
  readonly name: string;
  readonly type: string;
  readonly tags: readonly string[];
  readonly summary: string;
}

export interface JevQuestionInstructions {
  readonly candidate: JevPublicCandidate;
  readonly ask: string;
}

export interface JevQuestionCriteria {
  readonly true: string;
  readonly false: string;
}

export interface JevQuestion {
  readonly type: 'noul';
  readonly instructions: JevQuestionInstructions;
  readonly criteria: JevQuestionCriteria;
}

export interface JevTasteState {
  readonly taste: {
    readonly ecology_share: number;
    readonly social_share: number;
    readonly attended_or_wished: readonly JevPublicCandidate[];
  };
}

export interface JevRequestBody {
  readonly model: string;
  readonly state: JevTasteState;
  readonly questions: Record<string, JevQuestion>;
}

export const sanitizeText = (
  text: string | null | undefined,
  maxLen = 200,
): string => {
  if (!text) {
    return '';
  }
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
};

export const sanitizePublicCandidate = (
  candidate: RankingCandidate,
): JevPublicCandidate => ({
  name: sanitizeText(candidate.name, 200),
  type: candidate.type,
  tags: candidate.tags
    .map((tag) => sanitizeText(tag, 50))
    .filter((tag) => tag.length > 0),
  summary: sanitizeText(candidate.summary, 200),
});

const DEFAULT_ASK =
  'Cet evenement correspond-il aux gouts decrits dans state ?';
const DEFAULT_CRITERIA: JevQuestionCriteria = {
  true: "L'evenement est proche, par le theme ou l'activite, de ce que la personne a deja fait ou souhaite faire.",
  false:
    "L'evenement n'a aucun rapport avec ce que la personne a deja fait ou souhaite faire.",
};

export const buildJevState = (taste: TasteSummary): JevTasteState => {
  // Tri stable par eventId pour reproductibilite deterministe
  const stableHistory = [...taste.history].sort((a, b) =>
    a.eventId.localeCompare(b.eventId),
  );

  return {
    taste: {
      ecology_share: Number(taste.ecologyShare.toFixed(4)),
      social_share: Number(taste.socialShare.toFixed(4)),
      attended_or_wished: stableHistory.map(sanitizePublicCandidate),
    },
  };
};

export const buildJevQuestion = (candidate: RankingCandidate): JevQuestion => ({
  type: 'noul',
  instructions: {
    candidate: sanitizePublicCandidate(candidate),
    ask: DEFAULT_ASK,
  },
  criteria: DEFAULT_CRITERIA,
});

export const buildJevQuestions = (
  candidates: readonly RankingCandidate[],
): Record<string, JevQuestion> => {
  const questions: Record<string, JevQuestion> = {};
  for (const candidate of candidates) {
    questions[candidate.eventId] = buildJevQuestion(candidate);
  }
  return questions;
};

export const buildJevRequestBody = (
  model: string,
  taste: TasteSummary,
  candidates: readonly RankingCandidate[],
): JevRequestBody => ({
  model,
  state: buildJevState(taste),
  questions: buildJevQuestions(candidates),
});
