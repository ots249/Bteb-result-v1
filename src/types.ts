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
  cgpa?: number;
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
  studentName?: string;
  technology?: string;
}

export interface GroupStudentResult {
  roll: number;
  results: {
    date: string;
    semester: number;
    gpa?: number;
    failedSubjects: { subCode: number }[];
  }[];
  studentName?: string;
}

export interface GroupApiResponse {
  success: boolean;
  data: {
    curriculumId: string;
    regulation: number;
    totalResults: number;
    rollRanges: string;
    studentResults: GroupStudentResult[];
  };
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  data: StudentData[];
}
