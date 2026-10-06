export interface ContactRecord {
  id: string;
  sNo: string;
  taluk: string;
  department: string;
  locationType: string;
  designation: string;
  mobileNo: string;
  alternateNo?: string;
  cleanMobile?: string;
  isValidMobile: boolean;
}

export interface DirectoryData {
  contacts: ContactRecord[];
  taluks: string[];
  departmentsByTaluk: Record<string, string[]>;
  allDepartments: string[];
  lastUpdated: string;
  totalCount: number;
}
