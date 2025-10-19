import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

// Environment variables for Telegram Bot
const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = env.TELEGRAM_CHAT_ID || '';
// Tidak menggunakan node-telegram-bot-api (serverless friendly): gunakan fetch ke Telegram API

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Check if Telegram is configured
		if (!TELEGRAM_BOT_TOKEN) {
			return json({ success: false, error: 'Telegram Bot Token belum dikonfigurasi.' }, { status: 500 });
		}

		if (!TELEGRAM_CHAT_ID) {
			return json({ success: false, error: 'Telegram Chat ID belum dikonfigurasi.' }, { status: 500 });
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

		// Simpel: tidak menggunakan recap/hashtag, hanya kirim detail absensi
		const message = `${attendanceTypeText}\n\nNama: ${name}\nKelas: ${studentClass}\nWaktu: ${attendanceTime}`;

		// Send photo with caption to Telegram
		console.log('Attempting to send to Telegram chat:', TELEGRAM_CHAT_ID);
		// Send photo with caption to Telegram via direct API call (serverless-safe)
		console.log('Attempting to send to Telegram chat:', TELEGRAM_CHAT_ID);
		const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
		const form = new FormData();
		form.append('chat_id', TELEGRAM_CHAT_ID);
		form.append('caption', message);
		form.append('parse_mode', 'Markdown');
		// append photo as Blob (works in Node 18+/undici environment used by SvelteKit/Vercel)
		form.append('photo', new Blob([photoBuffer]), 'photo.jpg');

		const resp = await fetch(telegramUrl, { method: 'POST', body: form });
		let respJson: any;
		try {
			respJson = await resp.json();
		} catch (e) {
			throw new Error(`Telegram response parse error: ${String(e)}`);
		}
		if (!resp.ok || respJson?.ok === false) {
			const desc = respJson?.description || resp.statusText;
			throw new Error(`Telegram API error: ${desc}`);
		}

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
