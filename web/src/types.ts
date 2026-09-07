export interface University {
  key: string;
  fullName: string;
  region: string;
  platform: 'jinhakapply' | 'uwayapply' | string;
  ratioUrl: string | null;
  acceptStart: string | null;
  acceptEnd: string | null;
  inScope: boolean;
  note?: string;
  publishUntil?: string | null;
  totalRounds: number;
  snapshotCount: number;
  latestSnapshot?: {
    label: string | null;
    capturedAt: string | null;
    status: 'ok' | 'skip' | 'error' | 'pre' | 'none';
    notice: string | null;
    mojip: number;
    jiwon: number;
    ratio: string;
    ratioDiff?: number | null;
    jiwonDiff?: number | null;
    captureUrl?: string | null;
  };
}

export interface TableData {
  title: string | null;
  rows: string[][];
}

export interface SnapshotDetail {
  label: string;
  capturedAt: string;
  status: string;
  notice: string | null;
  summary: {
    mojip?: number;
    jiwon?: number;
    ratio?: string;
  };
  captureUrl?: string | null;
  xlsxUrl?: string | null;
  tables: TableData[];
}

export interface UniversityDetail {
  university: {
    key: string;
    fullName: string;
    platform: string;
    ratioUrl: string | null;
    acceptStart: string | null;
    acceptEnd: string | null;
    rounds: {
      label: string;
      scheduledAt: string;
      isFinal: boolean;
    }[];
  };
  snapshots: SnapshotDetail[];
}

export interface ReportItem {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string;
}

export interface RunLog {
  runId: string;
  label: string;
  startedAt: string;
  finishedAt: string;
  total: number;
  ok: number;
  skip: number;
  error: number;
  results: Record<string, string>;
}
