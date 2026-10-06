import { ContactRecord, DirectoryData } from '../types.ts';
import { cleanIndianMobile, isValidIndianMobile } from './phone.ts';

/**
 * Robust CSV row splitter handling quotes and commas inside quotes
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip the next quote
        } else {
          // Closing quote
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++; // Skip \n
        }
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // Push remaining field & row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Transforms raw parsed CSV matrix to DirectoryData
 */
export function processDirectoryCSV(csvText: string): DirectoryData {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return {
      contacts: [],
      taluks: [],
      departmentsByTaluk: {},
      allDepartments: [],
      lastUpdated: new Date().toISOString(),
      totalCount: 0,
    };
  }

  const header = rows[0].map(h => h.trim().toLowerCase());
  
  // Find column indexes with fallback
  const sNoIdx = header.findIndex(h => h.includes('s.no') || h.includes('sno') || h === 'sl.no' || h === 'sl no');
  const talukIdx = header.findIndex(h => h.includes('taluk'));
  const deptIdx = header.findIndex(h => h.includes('department'));
  const locIdx = header.findIndex(h => h.includes('location'));
  const desigIdx = header.findIndex(h => h.includes('designation') || h.includes('resource'));
  const mobileIdx = header.findIndex(h => h.includes('mobile') || h.includes('phone') || h.includes('contact'));
  const altIdx = header.findIndex(h => h.includes('alternate'));

  const contacts: ContactRecord[] = [];
  const talukSet = new Set<string>();
  const departmentsByTaluk: Record<string, Set<string>> = {};
  const allDeptSet = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const taluk = (talukIdx >= 0 ? row[talukIdx] : row[1])?.trim() || '';
    const dept = (deptIdx >= 0 ? row[deptIdx] : row[2])?.trim() || '';
    const loc = (locIdx >= 0 ? row[locIdx] : row[3])?.trim() || '';
    const desig = (desigIdx >= 0 ? row[desigIdx] : row[4])?.trim() || '';
    const mobile = (mobileIdx >= 0 ? row[mobileIdx] : row[5])?.trim() || '';
    const alt = (altIdx >= 0 ? row[altIdx] : row[6])?.trim() || '';
    const sNo = (sNoIdx >= 0 ? row[sNoIdx] : row[0])?.trim() || String(r);

    // Skip completely empty placeholder rows
    if (!taluk && !dept && !desig && !mobile) continue;
    // We need at least taluk or designation
    if (!desig && !mobile && !dept) continue;

    const cleanMob = cleanIndianMobile(mobile);
    const validMob = isValidIndianMobile(cleanMob);

    const record: ContactRecord = {
      id: `${taluk}-${dept}-${r}-${sNo}`,
      sNo: sNo || String(r),
      taluk: taluk || 'General',
      department: dept || 'General Administration',
      locationType: loc || 'Office',
      designation: desig || 'Official',
      mobileNo: mobile,
      alternateNo: alt || undefined,
      cleanMobile: cleanMob || undefined,
      isValidMobile: validMob,
    };

    contacts.push(record);

    if (record.taluk) {
      talukSet.add(record.taluk);
      if (!departmentsByTaluk[record.taluk]) {
        departmentsByTaluk[record.taluk] = new Set<string>();
      }
      if (record.department) {
        departmentsByTaluk[record.taluk].add(record.department);
      }
    }
    if (record.department) {
      allDeptSet.add(record.department);
    }
  }

  // Convert sets to sorted arrays
  const sortedTaluks = Array.from(talukSet).sort((a, b) => a.localeCompare(b));
  const finalDeptMap: Record<string, string[]> = {};
  for (const t of sortedTaluks) {
    const depts = departmentsByTaluk[t] ? Array.from(departmentsByTaluk[t]).sort((a, b) => a.localeCompare(b)) : [];
    finalDeptMap[t] = depts;
  }

  return {
    contacts,
    taluks: sortedTaluks,
    departmentsByTaluk: finalDeptMap,
    allDepartments: Array.from(allDeptSet).sort((a, b) => a.localeCompare(b)),
    lastUpdated: new Date().toISOString(),
    totalCount: contacts.length,
  };
}
