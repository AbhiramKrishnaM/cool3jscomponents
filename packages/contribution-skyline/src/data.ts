export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export interface ContributionDay {
  date: string;
  level: ContributionLevel;
  count: number;
}

export interface ContributionData {
  user: string;
  total: number;
  fetchedAt: string | null;
  days: ContributionDay[];
}
