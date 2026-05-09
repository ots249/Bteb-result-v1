export interface Institute {
  code: number;
  district: string;
  name: string;
}

export interface FailedSubject {
  subCode: number;
  subName: string;
  type: string;
  originSemester: number;
  passed: boolean;
}

export interface SemesterResultRecord {
  date: string;
  fileHash: string;
  fileName: string;
  semester: number;
  instituteCode: number;
  failedSubjects?: FailedSubject[];
  gpa?: number;
  republished: boolean;
}

export interface SemesterResult {
  semester: number;
  status: 'passed' | 'failed';
  results: SemesterResultRecord[];
}

export interface StudentData {
  roll: number;
  curriculumId: string;
  regulation: number;
  institute: Institute;
  currentFailedSubjects: FailedSubject[];
  semesterResults: SemesterResult[];
  latestResults: any[]; // The sample shows this but semesterResults is more structured for UI
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  data: StudentData[];
}
