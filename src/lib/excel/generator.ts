import ExcelJS from 'exceljs';
import path from 'path';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { DailyAttendance, AttendanceRecord } from '$lib/storage/attendance';

export interface RecapOptions {
	date: string;
	data: DailyAttendance;
	schoolName?: string;
}

export async function generateDailyRecap(options: RecapOptions): Promise<Buffer> {
	const { date, data, schoolName = 'SMA ADABIAH 1 PADANG' } = options;

	// Create workbook
	const workbook = new ExcelJS.Workbook();
	workbook.creator = 'Sistem Absensi';
	workbook.created = new Date();

	// Group records by class
	const recordsByClass = groupByClass(data.records);

	// Create summary sheet
	await createSummarySheet(workbook, date, recordsByClass, schoolName);

	// Create sheet for each class
	for (const [className, records] of Object.entries(recordsByClass)) {
		await createClassSheet(workbook, className, records, date);
	}

	// Generate buffer
	const buffer = await workbook.xlsx.writeBuffer();
	return Buffer.from(buffer);
}

function groupByClass(records: AttendanceRecord[]): Record<string, AttendanceRecord[]> {
	const grouped: Record<string, AttendanceRecord[]> = {};

	for (const record of records) {
		if (!grouped[record.class]) {
			grouped[record.class] = [];
		}
		grouped[record.class].push(record);
	}

	return grouped;
}

async function createSummarySheet(
	workbook: ExcelJS.Workbook,
	date: string,
	recordsByClass: Record<string, AttendanceRecord[]>,
	schoolName: string
) {
	const sheet = workbook.addWorksheet('REKAPAN');

	// Title
	sheet.mergeCells('A1:E1');
	sheet.getCell('A1').value = `REKAPAN ABSENSI HARIAN`;
	sheet.getCell('A1').font = { bold: true, size: 16 };
	sheet.getCell('A1').alignment = { horizontal: 'center' };

	sheet.mergeCells('A2:E2');
	sheet.getCell('A2').value = schoolName;
	sheet.getCell('A2').font = { bold: true, size: 14 };
	sheet.getCell('A2').alignment = { horizontal: 'center' };

	sheet.mergeCells('A3:E3');
	const formattedDate = format(new Date(date), 'EEEE, dd MMMM yyyy', { locale: id });
	sheet.getCell('A3').value = formattedDate;
	sheet.getCell('A3').font = { size: 12 };
	sheet.getCell('A3').alignment = { horizontal: 'center' };

	// Add empty row
	sheet.addRow([]);

	// Summary header
	const headerRow = sheet.addRow(['No', 'Kelas', 'Jumlah Siswa', 'Masuk', 'Pulang']);
	headerRow.font = { bold: true };
	headerRow.alignment = { horizontal: 'center' };

	// Fill color for header
	headerRow.eachCell((cell) => {
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FFE0E0E0' }
		};
		cell.border = {
			top: { style: 'thin' },
			left: { style: 'thin' },
			bottom: { style: 'thin' },
			right: { style: 'thin' }
		};
	});

	// Add class summaries
	let no = 1;
	let totalStudents = 0;
	let totalMasuk = 0;
	let totalPulang = 0;

	for (const [className, records] of Object.entries(recordsByClass)) {
		// Get unique students
		const uniqueStudents = new Set(records.map(r => r.name));
		const masukCount = records.filter(r => r.attendanceType === 'masuk').length;
		const pulangCount = records.filter(r => r.attendanceType === 'pulang').length;

		const row = sheet.addRow([
			no++,
			className,
			uniqueStudents.size,
			masukCount,
			pulangCount
		]);

		// Add borders
		row.eachCell((cell) => {
			cell.border = {
				top: { style: 'thin' },
				left: { style: 'thin' },
				bottom: { style: 'thin' },
				right: { style: 'thin' }
			};
		});

		// Center alignment for numbers
		row.getCell(1).alignment = { horizontal: 'center' };
		row.getCell(3).alignment = { horizontal: 'center' };
		row.getCell(4).alignment = { horizontal: 'center' };
		row.getCell(5).alignment = { horizontal: 'center' };

		totalStudents += uniqueStudents.size;
		totalMasuk += masukCount;
		totalPulang += pulangCount;
	}

	// Add total row
	const totalRow = sheet.addRow(['', 'TOTAL', totalStudents, totalMasuk, totalPulang]);
	totalRow.font = { bold: true };
	totalRow.eachCell((cell, colNumber) => {
		if (colNumber > 1) {
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFD3D3D3' }
			};
		}
		cell.border = {
			top: { style: 'thin' },
			left: { style: 'thin' },
			bottom: { style: 'thin' },
			right: { style: 'thin' }
		};
	});

	// Center alignment
	totalRow.getCell(3).alignment = { horizontal: 'center' };
	totalRow.getCell(4).alignment = { horizontal: 'center' };
	totalRow.getCell(5).alignment = { horizontal: 'center' };

	// Set column widths
	sheet.getColumn(1).width = 5;
	sheet.getColumn(2).width = 15;
	sheet.getColumn(3).width = 15;
	sheet.getColumn(4).width = 10;
	sheet.getColumn(5).width = 10;
}

async function createClassSheet(
	workbook: ExcelJS.Workbook,
	className: string,
	records: AttendanceRecord[],
	date: string
) {
	const sheet = workbook.addWorksheet(className);

	// Title
	sheet.mergeCells('A1:F1');
	sheet.getCell('A1').value = `ABSENSI KELAS ${className}`;
	sheet.getCell('A1').font = { bold: true, size: 14 };
	sheet.getCell('A1').alignment = { horizontal: 'center' };

	sheet.mergeCells('A2:F2');
	const formattedDate = format(new Date(date), 'EEEE, dd MMMM yyyy', { locale: id });
	sheet.getCell('A2').value = formattedDate;
	sheet.getCell('A2').font = { size: 12 };
	sheet.getCell('A2').alignment = { horizontal: 'center' };

	// Add empty row
	sheet.addRow([]);

	// Header
	const headerRow = sheet.addRow(['No', 'Nama Siswa', 'Waktu Masuk', 'Waktu Pulang', 'Status', 'Keterangan']);
	headerRow.font = { bold: true };
	headerRow.alignment = { horizontal: 'center' };

	// Fill color for header
	headerRow.eachCell((cell) => {
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FFE0E0E0' }
		};
		cell.border = {
			top: { style: 'thin' },
			left: { style: 'thin' },
			bottom: { style: 'thin' },
			right: { style: 'thin' }
		};
	});

	// Group records by student name
	const studentRecords = groupByStudent(records);

	// Add student data
	let no = 1;
	for (const [studentName, studentData] of Object.entries(studentRecords)) {
		const masukRecord = studentData.find(r => r.attendanceType === 'masuk');
		const pulangRecord = studentData.find(r => r.attendanceType === 'pulang');

		const masukTime = masukRecord
			? format(new Date(masukRecord.timestamp), 'HH:mm:ss')
			: '-';

		const pulangTime = pulangRecord
			? format(new Date(pulangRecord.timestamp), 'HH:mm:ss')
			: '-';

		// Determine status
		let status = 'Hadir';
		let keterangan = '';

		if (masukRecord && !pulangRecord) {
			keterangan = 'Belum absen pulang';
		} else if (!masukRecord && pulangRecord) {
			keterangan = 'Tidak absen masuk';
		}

		// Check if late (after 07:30)
		if (masukRecord) {
			const masukDate = new Date(masukRecord.timestamp);
			const hour = masukDate.getHours();
			const minute = masukDate.getMinutes();
			if (hour > 7 || (hour === 7 && minute > 30)) {
				status = 'Terlambat';
				const lateMinutes = (hour - 7) * 60 + minute - 30;
				keterangan = `Terlambat ${lateMinutes} menit`;
			}
		}

		const row = sheet.addRow([
			no++,
			studentName,
			masukTime,
			pulangTime,
			status,
			keterangan
		]);

		// Add borders
		row.eachCell((cell) => {
			cell.border = {
				top: { style: 'thin' },
				left: { style: 'thin' },
				bottom: { style: 'thin' },
				right: { style: 'thin' }
			};
		});

		// Center alignment for time and status
		row.getCell(1).alignment = { horizontal: 'center' };
		row.getCell(3).alignment = { horizontal: 'center' };
		row.getCell(4).alignment = { horizontal: 'center' };
		row.getCell(5).alignment = { horizontal: 'center' };

		// Color coding for status
		if (status === 'Terlambat') {
			row.getCell(5).fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFFFCCCC' }
			};
		}
	}

	// Set column widths
	sheet.getColumn(1).width = 5;
	sheet.getColumn(2).width = 30;
	sheet.getColumn(3).width = 15;
	sheet.getColumn(4).width = 15;
	sheet.getColumn(5).width = 12;
	sheet.getColumn(6).width = 25;

	// Add footer with summary
	sheet.addRow([]);
	const summaryRow = sheet.addRow(['', 'Total Siswa:', Object.keys(studentRecords).length, '', '', '']);
	summaryRow.font = { bold: true };
	summaryRow.getCell(3).alignment = { horizontal: 'center' };
}

function groupByStudent(records: AttendanceRecord[]): Record<string, AttendanceRecord[]> {
	const grouped: Record<string, AttendanceRecord[]> = {};

	for (const record of records) {
		if (!grouped[record.name]) {
			grouped[record.name] = [];
		}
		grouped[record.name].push(record);
	}

	return grouped;
}

// Generate filename
export function generateFileName(date: string): string {
	const dateObj = new Date(date);
	const dateStr = format(dateObj, 'yyyy-MM-dd');
	return `Rekapan_Absensi_${dateStr}.xlsx`;
}