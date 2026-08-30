import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import XLSX from "xlsx";

export interface XlsxReader {
  sheetNames(): string[];
  hasSheet(name: string): boolean;
  cell(sheet: string, address: string): string | number | undefined;
  range(sheet: string): XLSX.Range | undefined;
}

export function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function openXlsx(filePath: string): XlsxReader {
  const workbook = XLSX.readFile(filePath, { cellText: false, cellDates: false });
  return {
    sheetNames: () => [...workbook.SheetNames],
    hasSheet: (name) => workbook.SheetNames.includes(name),
    cell: (sheet, address) => workbook.Sheets[sheet]?.[address]?.v as string | number | undefined,
    range: (sheet) => {
      const ref = workbook.Sheets[sheet]?.["!ref"];
      return ref ? XLSX.utils.decode_range(ref) : undefined;
    }
  };
}

export function columnAddress(column: number, row: number): string {
  return XLSX.utils.encode_cell({ c: column, r: row });
}
