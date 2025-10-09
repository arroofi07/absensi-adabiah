import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAttendanceByDate, getDailySummary, getAvailableDates } from '$lib/storage/attendance';
import { generateDailyRecap, generateFileName } from '$lib/excel/generator';
import TelegramBot from 'node-telegram-bot-api';
import { env } from '$env/dynamic/private';
import { format, parseISO, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import path from 'path';
import { promises as fs } from 'fs';

// Environment variables
const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = env.TELEGRAM_CHAT_ID || '';

// Initialize Telegram Bot
let bot: TelegramBot | null = null;
if (TELEGRAM_BOT_TOKEN) {
	bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
}

// GET handler for generating recap
export const GET: RequestHandler = async ({ url }) => {
	try {
		// Get date from query parameter (default to today)
		const dateParam = url.searchParams.get('date');
		const targetDate = dateParam ? parseISO(dateParam) : new Date();
		const dateStr = format(targetDate, 'yyyy-MM-dd');

		// Check if date is within allowed range (last 7 days)
		const maxPastDate = subDays(new Date(), 7);
		if (targetDate < maxPastDate) {
			return json(
				{
					success: false,
					error: 'Rekapan hanya tersedia untuk 7 hari terakhir'
				},
				{ status: 400 }
			);
		}

		// Get attendance data
		const attendanceData = await getAttendanceByDate(dateStr);

		if (!attendanceData || attendanceData.records.length === 0) {
			// Get available dates to help user
			const availableDates = await getAvailableDates();
			let errorMsg = `Tidak ada data absensi untuk tanggal ${format(targetDate, 'dd MMMM yyyy', { locale: id })}.`;

			if (availableDates.length > 0) {
				const formattedDates = availableDates
					.slice(0, 5)
					.map(d => format(parseISO(d), 'dd MMM yyyy', { locale: id }))
					.join(', ');
				errorMsg += ` Tanggal dengan data: ${formattedDates}`;
			} else {
				errorMsg += ' Belum ada data absensi yang tersimpan.';
			}

			return json(
				{
					success: false,
					error: errorMsg
				},
				{ status: 404 }
			);
		}

		// Generate Excel file
		const excelBuffer = await generateDailyRecap({
			date: dateStr,
			data: attendanceData
		});

		// Get summary
		const summary = await getDailySummary(dateStr);

		// Return Excel file as download
		return new Response(excelBuffer, {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${generateFileName(dateStr)}"`,
				'X-Summary': JSON.stringify(summary)
			}
		});
	} catch (error) {
		console.error('Error generating recap:', error);
		return json(
			{
				success: false,
				error: 'Terjadi kesalahan saat membuat rekapan'
			},
			{ status: 500 }
		);
	}
};

// POST handler for sending recap to Telegram
export const POST: RequestHandler = async ({ request }) => {
	try {
		// Check Telegram configuration
		if (!bot || !TELEGRAM_CHAT_ID) {
			return json(
				{
					success: false,
					error: 'Telegram bot belum dikonfigurasi'
				},
				{ status: 500 }
			);
		}

		// Parse request body
		const body = await request.json();
		const { date: dateParam, sendToTelegram = true } = body;

		// Get target date
		const targetDate = dateParam ? parseISO(dateParam) : new Date();
		const dateStr = format(targetDate, 'yyyy-MM-dd');

		// Check if date is within allowed range
		const maxPastDate = subDays(new Date(), 7);
		if (targetDate < maxPastDate) {
			return json(
				{
					success: false,
					error: 'Rekapan hanya tersedia untuk 7 hari terakhir'
				},
				{ status: 400 }
			);
		}

		// Get attendance data
		const attendanceData = await getAttendanceByDate(dateStr);

		if (!attendanceData || attendanceData.records.length === 0) {
			// Get available dates to help user
			const availableDates = await getAvailableDates();
			let errorMsg = `Tidak ada data absensi untuk tanggal ${format(targetDate, 'dd MMMM yyyy', { locale: id })}.`;

			if (availableDates.length > 0) {
				const formattedDates = availableDates
					.slice(0, 5)
					.map(d => format(parseISO(d), 'dd MMM yyyy', { locale: id }))
					.join(', ');
				errorMsg += ` Tanggal dengan data: ${formattedDates}`;
			} else {
				errorMsg += ' Belum ada data absensi yang tersimpan.';
			}

			return json(
				{
					success: false,
					error: errorMsg
				},
				{ status: 404 }
			);
		}

		// Generate Excel file
		const excelBuffer = await generateDailyRecap({
			date: dateStr,
			data: attendanceData
		});

		// Get summary for message
		const summary = await getDailySummary(dateStr);

		if (!summary) {
			throw new Error('Failed to generate summary');
		}

		// Create message for Telegram
		const formattedDate = format(targetDate, 'EEEE, dd MMMM yyyy', { locale: id });
		let message = `📊 *REKAPAN ABSENSI HARIAN*\n`;
		message += `🏫 *SMA ADABIAH 1 PADANG*\n`;
		message += `📅 ${formattedDate}\n\n`;
		message += `*RINGKASAN:*\n`;
		message += `├ Total Absen Masuk: ${summary.byType.masuk} siswa\n`;
		message += `├ Total Absen Pulang: ${summary.byType.pulang} siswa\n`;
		message += `└ Total Record: ${summary.totalRecords} data\n\n`;

		if (summary.byClass && summary.byClass.length > 0) {
			message += `*DETAIL PER KELAS:*\n`;
			for (const classData of summary.byClass) {
				message += `\n📚 *${classData.class}*\n`;
				message += `├ Siswa: ${classData.totalStudents} orang\n`;
				message += `├ Masuk: ${classData.masuk}\n`;
				message += `└ Pulang: ${classData.pulang}\n`;
			}
		}

		message += `\n📥 *File Excel terlampir untuk detail lengkap*`;
		message += `\n\n#RekapanAbsensi #SMAAdabiah1Padang`;

		// Save temporary file
		const tempDir = path.join(process.cwd(), 'data', 'temp');
		await fs.mkdir(tempDir, { recursive: true });

		const fileName = generateFileName(dateStr);
		const filePath = path.join(tempDir, fileName);
		await fs.writeFile(filePath, excelBuffer);

		// Send to Telegram if requested
		if (sendToTelegram) {
			try {
				// Send document with caption
				await bot.sendDocument(
					TELEGRAM_CHAT_ID,
					filePath,
					{
						caption: message,
						parse_mode: 'Markdown'
					},
					{
						filename: fileName,
						contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					}
				);

				// Clean up temp file
				await fs.unlink(filePath).catch(console.error);

				return json({
					success: true,
					message: 'Rekapan berhasil dikirim ke Telegram',
					summary
				});
			} catch (telegramError) {
				console.error('Error sending to Telegram:', telegramError);

				// Clean up temp file
				await fs.unlink(filePath).catch(console.error);

				return json(
					{
						success: false,
						error: 'Gagal mengirim rekapan ke Telegram'
					},
					{ status: 500 }
				);
			}
		}

		// Clean up temp file if not sent to Telegram
		await fs.unlink(filePath).catch(console.error);

		return json({
			success: true,
			message: 'Rekapan berhasil dibuat',
			summary
		});
	} catch (error) {
		console.error('Error in POST recap:', error);
		return json(
			{
				success: false,
				error: 'Terjadi kesalahan saat membuat rekapan'
			},
			{ status: 500 }
		);
	}
};