import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import TelegramBot from 'node-telegram-bot-api';
import { env } from '$env/dynamic/private';
import { saveAttendanceRecord } from '$lib/storage/attendance';
import { randomUUID } from 'crypto';

// Environment variables for Telegram Bot
const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = env.TELEGRAM_CHAT_ID || '';

// Initialize Telegram Bot
let bot: TelegramBot | null = null;
if (TELEGRAM_BOT_TOKEN) {
	bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Check if Telegram bot is configured
		if (!TELEGRAM_BOT_TOKEN) {
			return json(
				{
					success: false,
					error: 'Telegram Bot Token belum dikonfigurasi. Silakan atur TELEGRAM_BOT_TOKEN di file .env'
				},
				{ status: 500 }
			);
		}
		
		if (!TELEGRAM_CHAT_ID) {
			return json(
				{
					success: false,
					error: 'Telegram Chat ID belum dikonfigurasi. Silakan atur TELEGRAM_CHAT_ID di file .env'
				},
				{ status: 500 }
			);
		}
		
		if (!bot) {
			return json(
				{
					success: false,
					error: 'Telegram Bot gagal diinisialisasi. Periksa konfigurasi bot.'
				},
				{ status: 500 }
			);
		}

		// Parse the multipart form data
		const formData = await request.formData();

		// Extract form fields
		const photo = formData.get('photo') as File;
		const name = formData.get('name') as string;
		const studentClass = formData.get('class') as string;
		const attendanceType = formData.get('attendanceType') as string;
		const timestamp = formData.get('timestamp') as string;

		// Validate required fields
		if (!photo || !name || !studentClass || !attendanceType) {
			return json(
				{
					success: false,
					error: 'Data tidak lengkap. Mohon isi semua field yang diperlukan.'
				},
				{ status: 400 }
			);
		}

		// Validate file type
		if (!photo.type.startsWith('image/')) {
			return json(
				{
					success: false,
					error: 'File harus berupa gambar.'
				},
				{ status: 400 }
			);
		}

		// Convert file to buffer for Telegram
		const arrayBuffer = await photo.arrayBuffer();
		const photoBuffer = Buffer.from(arrayBuffer);

		// Format attendance message for Telegram
		const attendanceTime = new Date(timestamp).toLocaleString('id-ID', {
			timeZone: 'Asia/Jakarta',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});

		const attendanceTypeText = attendanceType === 'masuk' ? '📍 MASUK' : '🚪 PULANG';

		const message = `
🏫 **ABSENSI SMA ADABIAH 1 PADANG**

${attendanceTypeText}

👤 **Nama:** ${name}
🎓 **Kelas:** ${studentClass}
⏰ **Waktu:** ${attendanceTime}

#Absensi #SMAAdabiah1Padang #${attendanceType.toUpperCase()}
    `.trim();

		// Save attendance record to JSON file
		const attendanceRecord = {
			id: randomUUID(),
			name,
			class: studentClass,
			attendanceType: attendanceType as 'masuk' | 'pulang',
			timestamp
		};

		await saveAttendanceRecord(attendanceRecord);

		// Send photo with caption to Telegram
		console.log('Attempting to send to Telegram chat:', TELEGRAM_CHAT_ID);
		await bot.sendPhoto(TELEGRAM_CHAT_ID, photoBuffer, {
			caption: message,
			parse_mode: 'Markdown'
		});

		// Log successful attendance
		console.log(
			`Attendance recorded and saved: ${name} - ${studentClass} - ${attendanceType} at ${attendanceTime}`
		);

		return json({
			success: true,
			message: 'Absensi berhasil dikirim ke Telegram!'
		});
	} catch (error) {
		console.error('Error processing attendance:', error);

		// Handle specific Telegram errors
		if (error instanceof Error) {
			if (error.message.includes('chat not found')) {
				return json(
					{
						success: false,
						error: 'Chat ID tidak valid. Hubungi administrator.'
					},
					{ status: 500 }
				);
			}

			if (error.message.includes('bot token')) {
				return json(
					{
						success: false,
						error: 'Bot token tidak valid. Hubungi administrator.'
					},
					{ status: 500 }
				);
			}
		}

		return json(
			{
				success: false,
				error: 'Terjadi kesalahan sistem. Silakan coba lagi.'
			},
			{ status: 500 }
		);
	}
};

// GET handler for testing API endpoint
export const GET: RequestHandler = async () => {
	return json({
		message: 'Attendance API is running',
		telegram_configured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID),
		timestamp: new Date().toISOString()
	});
};
