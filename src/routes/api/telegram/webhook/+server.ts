import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import TelegramBot from 'node-telegram-bot-api';
import { env } from '$env/dynamic/private';
import { format, parseISO, subDays } from 'date-fns';
import { id } from 'date-fns/locale';

// Environment variables
const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = env.TELEGRAM_CHAT_ID || '';

// Initialize bot
let bot: TelegramBot | null = null;
if (TELEGRAM_BOT_TOKEN) {
	bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
}

// Webhook handler for Telegram bot commands
export const POST: RequestHandler = async ({ request }) => {
	try {
		if (!bot) {
			return json({ success: false, error: 'Bot not configured' }, { status: 500 });
		}

		const update = await request.json();

		// Handle message
		if (update.message) {
			const chatId = update.message.chat.id;
			const text = update.message.text;
			const messageId = update.message.message_id;

			// Check if message is from authorized chat
			if (chatId.toString() !== TELEGRAM_CHAT_ID) {
				await bot.sendMessage(
					chatId,
					'⚠️ Anda tidak memiliki akses ke bot ini.',
					{ reply_to_message_id: messageId }
				);
				return json({ success: true });
			}

			// Handle commands
			if (text) {
				// /start command
				if (text === '/start') {
					const welcomeMessage = `
🏫 *Selamat Datang di Bot Absensi*
*SMA ADABIAH 1 PADANG*

Bot ini akan mengirimkan notifikasi absensi siswa dan rekapan harian.

📌 *Perintah yang tersedia:*
• /rekap - Rekapan hari ini
• /rekap kemarin - Rekapan kemarin
• /rekap [tanggal] - Rekapan tanggal tertentu
  Contoh: /rekap 2025-10-01

📊 Rekapan akan dikirim dalam format Excel yang bisa diunduh.

⏰ Bot aktif 24/7 untuk menerima absensi siswa.
					`.trim();

					await bot.sendMessage(chatId, welcomeMessage, {
						parse_mode: 'Markdown',
						reply_to_message_id: messageId
					});
					return json({ success: true });
				}

				// /rekap command
				if (text.startsWith('/rekap')) {
					// Parse date from command
					let targetDate = new Date();
					const parts = text.split(' ');

					if (parts.length > 1) {
						const dateArg = parts[1].toLowerCase();

						if (dateArg === 'kemarin' || dateArg === 'yesterday') {
							targetDate = subDays(new Date(), 1);
						} else {
							// Try to parse date
							try {
								targetDate = parseISO(dateArg);
								if (isNaN(targetDate.getTime())) {
									throw new Error('Invalid date');
								}
							} catch {
								await bot.sendMessage(
									chatId,
									'❌ Format tanggal tidak valid.\n\nGunakan format: YYYY-MM-DD\nContoh: /rekap 2025-10-01',
									{ reply_to_message_id: messageId }
								);
								return json({ success: true });
							}
						}
					}

					// Check if date is within allowed range
					const maxPastDate = subDays(new Date(), 7);
					if (targetDate < maxPastDate) {
						await bot.sendMessage(
							chatId,
							'⚠️ Rekapan hanya tersedia untuk 7 hari terakhir.',
							{ reply_to_message_id: messageId }
						);
						return json({ success: true });
					}

					// Check if date is in the future
					if (targetDate > new Date()) {
						await bot.sendMessage(
							chatId,
							'⚠️ Tidak bisa membuat rekapan untuk tanggal yang akan datang.',
							{ reply_to_message_id: messageId }
						);
						return json({ success: true });
					}

					// Send processing message
					const processingMsg = await bot.sendMessage(
						chatId,
						'⏳ Sedang membuat rekapan absensi...',
						{ reply_to_message_id: messageId }
					);

					try {
						// Call recap API
						const dateStr = format(targetDate, 'yyyy-MM-dd');
						const response = await fetch(`${request.url.origin}/api/attendance/recap`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({
								date: dateStr,
								sendToTelegram: true
							})
						});

						const result = await response.json();

						// Delete processing message
						await bot.deleteMessage(chatId, processingMsg.message_id.toString());

						if (!response.ok || !result.success) {
							await bot.sendMessage(
								chatId,
								`❌ ${result.error || 'Gagal membuat rekapan'}`,
								{ reply_to_message_id: messageId }
							);
						}
						// Success message will be sent by the recap API with the file

					} catch (error) {
						// Delete processing message
						await bot.deleteMessage(chatId, processingMsg.message_id.toString());

						console.error('Error generating recap:', error);
						await bot.sendMessage(
							chatId,
							'❌ Terjadi kesalahan saat membuat rekapan.',
							{ reply_to_message_id: messageId }
						);
					}

					return json({ success: true });
				}

				// /help command
				if (text === '/help') {
					const helpMessage = `
📌 *Bantuan Bot Absensi*

*Perintah yang tersedia:*

📊 */rekap* - Mendapatkan rekapan absensi
• /rekap → Rekapan hari ini
• /rekap kemarin → Rekapan kemarin
• /rekap [tanggal] → Rekapan tanggal tertentu

*Format tanggal:* YYYY-MM-DD
*Contoh:* /rekap 2025-10-01

📝 *Catatan:*
• Rekapan hanya tersedia untuk 7 hari terakhir
• File Excel akan dikirim otomatis
• Data lebih dari 7 hari akan dihapus otomatis

Untuk bantuan lebih lanjut, hubungi administrator.
					`.trim();

					await bot.sendMessage(chatId, helpMessage, {
						parse_mode: 'Markdown',
						reply_to_message_id: messageId
					});
					return json({ success: true });
				}

				// Unknown command
				if (text.startsWith('/')) {
					await bot.sendMessage(
						chatId,
						'❓ Perintah tidak dikenal. Gunakan /help untuk melihat perintah yang tersedia.',
						{ reply_to_message_id: messageId }
					);
				}
			}
		}

		return json({ success: true });
	} catch (error) {
		console.error('Webhook error:', error);
		return json({ success: false, error: 'Webhook processing failed' }, { status: 500 });
	}
};

// GET handler to set webhook
export const GET: RequestHandler = async ({ url }) => {
	try {
		if (!bot || !TELEGRAM_BOT_TOKEN) {
			return json({
				success: false,
				error: 'Telegram bot not configured'
			}, { status: 500 });
		}

		// Construct webhook URL
		const webhookUrl = `${url.origin}/api/telegram/webhook`;

		// Set webhook
		const result = await bot.setWebHook(webhookUrl);

		if (result) {
			// Get webhook info
			const info = await bot.getWebHookInfo();

			return json({
				success: true,
				message: 'Webhook berhasil diatur',
				webhookUrl,
				info
			});
		} else {
			return json({
				success: false,
				error: 'Gagal mengatur webhook'
			}, { status: 500 });
		}
	} catch (error) {
		console.error('Error setting webhook:', error);
		return json({
			success: false,
			error: 'Terjadi kesalahan saat mengatur webhook'
		}, { status: 500 });
	}
};