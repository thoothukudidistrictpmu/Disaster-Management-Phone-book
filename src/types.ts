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

export interface NonGovRecord {
  id: string;
  sNo: string;
  agency: string;
  location: string;
  ownerName: string;
  regNumber: string;
  currentAddress: string;
  mobileNo: string;
  streetName: string;
  cleanMobile?: string;
  isValidMobile: boolean;
}

export interface NonGovDirectoryData {
  records: NonGovRecord[];
  agencies: string[];
  locations: string[];
  streetsByLocation: Record<string, string[]>;
  allStreets: string[];
  lastUpdated: string;
  totalCount: number;
}
