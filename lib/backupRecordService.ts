import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { BackupOperationStatus, BackupType } from "@/models/Backup";

export interface BackupRecord {
  id: string;
  type: BackupType;
  status: BackupOperationStatus;
  path: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

const RECORDS_FILE = path.join(process.cwd(), "data", "backupRecords.json");

/**
 * Yedekleme kayıtlarını okur
 */
function readBackupRecords(): BackupRecord[] {
  try {
    if (fs.existsSync(RECORDS_FILE)) {
      const data = fs.readFileSync(RECORDS_FILE, "utf8");
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Yedekleme kayıtlarını yazar
 */
function writeBackupRecords(records: BackupRecord[]): void {
  try {
    const dataDir = path.dirname(RECORDS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2));
  } catch (error) {}
}

/**
 * Yeni yedekleme kaydı oluşturur
 */
export async function createBackupRecord(
  data: Omit<BackupRecord, "id" | "createdAt" | "updatedAt">
): Promise<BackupRecord> {
  const record: BackupRecord = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const records = readBackupRecords();
  records.push(record);
  writeBackupRecords(records);

  return record;
}

/**
 * Yedekleme kaydını günceller
 */
export async function updateBackupRecord(
  id: string,
  updates: Partial<Omit<BackupRecord, "id" | "createdAt">>
): Promise<BackupRecord | null> {
  const records = readBackupRecords();
  const index = records.findIndex((r) => r.id === id);

  if (index === -1) {
    return null;
  }

  records[index] = {
    ...records[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeBackupRecords(records);
  return records[index];
}

/**
 * Tüm yedekleme kayıtlarını getirir
 */
export async function getAllBackupRecords(): Promise<BackupRecord[]> {
  return readBackupRecords();
}

/**
 * ID'ye göre yedekleme kaydını getirir
 */
export async function getBackupRecordById(
  id: string
): Promise<BackupRecord | null> {
  const records = readBackupRecords();
  return records.find((r) => r.id === id) || null;
}
