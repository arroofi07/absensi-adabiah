import { promises as fs } from 'fs';
import path from 'path';
import { format, subDays, parseISO, isAfter } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Timezone constant
const TIMEZONE = 'Asia/Jakarta';

// Define attendance data structure
export interface AttendanceRecord {
	id: string;
	name: string;
	class: string;
	attendanceType: 'masuk' | 'pulang';
	timestamp: string;
	photoPath?: string;
}

export interface DailyAttendance {
	date: string;
	records: AttendanceRecord[];
}

// Paths
const DATA_DIR = path.join(process.cwd(), 'data', 'attendance');
const TEMP_DIR = path.join(process.cwd(), 'data', 'temp');
const MAX_DAYS_TO_KEEP = 7;

// Ensure directories exist
async function ensureDirectories() {
	await fs.mkdir(DATA_DIR, { recursive: true });
	await fs.mkdir(TEMP_DIR, { recursive: true });
}

// Get file path for a specific date
function getAttendanceFilePath(date: Date | string): string {
	const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
	return path.join(DATA_DIR, `${dateStr}.json`);
}

// Save attendance record
export async function saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
	await ensureDirectories();

	// Convert UTC timestamp to Jakarta timezone for correct date
	const utcDate = new Date(record.timestamp);
	const jakartaDate = toZonedTime(utcDate, TIMEZONE);
	const filePath = getAttendanceFilePath(jakartaDate);

	let dailyData: DailyAttendance;

	try {
		// Try to read existing file
		const existingData = await fs.readFile(filePath, 'utf-8');
		dailyData = JSON.parse(existingData);
	} catch (error) {
		// File doesn't exist, create new
		dailyData = {
			date: format(jakartaDate, 'yyyy-MM-dd'),
			records: []
		};
	}

	// Add new record
	dailyData.records.push(record);

	// Save back to file
	await fs.writeFile(filePath, JSON.stringify(dailyData, null, 2), 'utf-8');

	// Trigger cleanup of old files
	await cleanupOldFiles();
}

// Get attendance for a specific date
export async function getAttendanceByDate(date: Date | string): Promise<DailyAttendance | null> {
	const filePath = getAttendanceFilePath(date);

	try {
		const data = await fs.readFile(filePath, 'utf-8');
		return JSON.parse(data);
	} catch (error) {
		// File doesn't exist or error reading
		return null;
	}
}

// Get attendance for date range
export async function getAttendanceRange(startDate: Date, endDate: Date): Promise<DailyAttendance[]> {
	const attendance: DailyAttendance[] = [];
	const current = new Date(startDate);

	while (current <= endDate) {
		const data = await getAttendanceByDate(current);
		if (data) {
			attendance.push(data);
		}
		current.setDate(current.getDate() + 1);
	}

	return attendance;
}

// Cleanup old files (> 7 days)
export async function cleanupOldFiles(): Promise<string[]> {
	await ensureDirectories();

	const deletedFiles: string[] = [];
	const cutoffDate = subDays(new Date(), MAX_DAYS_TO_KEEP);

	try {
		const files = await fs.readdir(DATA_DIR);

		for (const file of files) {
			if (file.endsWith('.json')) {
				// Extract date from filename
				const dateStr = file.replace('.json', '');
				const fileDate = parseISO(dateStr);

				// Check if file is older than cutoff
				if (!isAfter(fileDate, cutoffDate)) {
					const filePath = path.join(DATA_DIR, file);
					await fs.unlink(filePath);
					deletedFiles.push(file);
					console.log(`Deleted old attendance file: ${file}`);
				}
			}
		}

		// Also cleanup temp directory
		const tempFiles = await fs.readdir(TEMP_DIR);
		for (const file of tempFiles) {
			const filePath = path.join(TEMP_DIR, file);
			const stats = await fs.stat(filePath);
			const fileAge = Date.now() - stats.mtimeMs;

			// Delete temp files older than 1 hour
			if (fileAge > 3600000) {
				await fs.unlink(filePath);
				console.log(`Deleted temp file: ${file}`);
			}
		}
	} catch (error) {
		console.error('Error during cleanup:', error);
	}

	return deletedFiles;
}

// Get list of available dates
export async function getAvailableDates(): Promise<string[]> {
	await ensureDirectories();

	try {
		const files = await fs.readdir(DATA_DIR);
		return files
			.filter(file => file.endsWith('.json'))
			.map(file => file.replace('.json', ''))
			.sort()
			.reverse(); // Most recent first
	} catch (error) {
		console.error('Error getting available dates:', error);
		return [];
	}
}

// Get summary statistics for a date
export async function getDailySummary(date: Date | string) {
	const data = await getAttendanceByDate(date);

	if (!data) {
		return null;
	}

	const summary = {
		date: data.date,
		totalRecords: data.records.length,
		byClass: {} as Record<string, { masuk: number; pulang: number; students: Set<string> }>,
		byType: {
			masuk: 0,
			pulang: 0
		}
	};

	// Process records
	for (const record of data.records) {
		// Count by type
		summary.byType[record.attendanceType]++;

		// Count by class
		if (!summary.byClass[record.class]) {
			summary.byClass[record.class] = {
				masuk: 0,
				pulang: 0,
				students: new Set()
			};
		}

		summary.byClass[record.class][record.attendanceType]++;
		summary.byClass[record.class].students.add(record.name);
	}

	// Convert sets to counts
	const byClassSummary = Object.entries(summary.byClass).map(([className, data]) => ({
		class: className,
		masuk: data.masuk,
		pulang: data.pulang,
		totalStudents: data.students.size
	}));

	return {
		...summary,
		byClass: byClassSummary
	};
}