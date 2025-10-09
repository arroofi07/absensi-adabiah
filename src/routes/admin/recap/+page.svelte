<script lang="ts">
	import { onMount } from 'svelte';
	import { format, subDays } from 'date-fns';
	import { id } from 'date-fns/locale';

	let selectedDate = format(new Date(), 'yyyy-MM-dd');
	let loading = false;
	let error = '';
	let success = '';
	let summary: any = null;
	let availableDates: string[] = [];

	// Generate last 7 days for dropdown
	onMount(() => {
		const dates = [];
		for (let i = 0; i < 7; i++) {
			const date = subDays(new Date(), i);
			dates.push(format(date, 'yyyy-MM-dd'));
		}
		availableDates = dates;
	});

	async function generateRecap(sendToTelegram = false) {
		loading = true;
		error = '';
		success = '';
		summary = null;

		try {
			const response = await fetch('/api/attendance/recap', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					date: selectedDate,
					sendToTelegram
				})
			});

			const result = await response.json();

			if (response.ok && result.success) {
				success = result.message;
				summary = result.summary;
			} else {
				error = result.error || 'Gagal membuat rekapan';
			}
		} catch (err) {
			error = 'Terjadi kesalahan saat membuat rekapan';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function downloadRecap() {
		try {
			const response = await fetch(`/api/attendance/recap?date=${selectedDate}`);

			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `Rekapan_Absensi_${selectedDate}.xlsx`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);

				success = 'File berhasil diunduh';
			} else {
				const result = await response.json();
				error = result.error || 'Gagal mengunduh rekapan';
			}
		} catch (err) {
			error = 'Terjadi kesalahan saat mengunduh';
			console.error(err);
		}
	}

	function formatDate(dateStr: string) {
		const date = new Date(dateStr);
		return format(date, 'EEEE, dd MMMM yyyy', { locale: id });
	}
</script>

<div class="min-h-screen bg-gray-100 py-8">
	<div class="container mx-auto max-w-4xl px-4">
		<!-- Header -->
		<div class="mb-8 text-center">
			<h1 class="mb-2 text-3xl font-bold text-gray-800">Admin - Rekapan Absensi</h1>
			<p class="text-gray-600">Generate dan kirim rekapan absensi harian</p>
		</div>

		<!-- Main Card -->
		<div class="rounded-lg bg-white p-6 shadow-md">
			<!-- Date Selection -->
			<div class="mb-6">
				<label for="date" class="mb-2 block text-sm font-semibold text-gray-700">
					Pilih Tanggal Rekapan
				</label>
				<select
					id="date"
					bind:value={selectedDate}
					class="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
					disabled={loading}
				>
					{#each availableDates as date}
						<option value={date}>
							{formatDate(date)}
							{#if date === format(new Date(), 'yyyy-MM-dd')}
								(Hari Ini)
							{:else if date === format(subDays(new Date(), 1), 'yyyy-MM-dd')}
								(Kemarin)
							{/if}
						</option>
					{/each}
				</select>
				<p class="mt-1 text-xs text-gray-500">
					Data absensi disimpan selama 7 hari terakhir
				</p>
			</div>

			<!-- Action Buttons -->
			<div class="mb-6 flex flex-col gap-3 sm:flex-row">
				<button
					on:click={() => generateRecap(false)}
					disabled={loading}
					class="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
				>
					{#if loading}
						<span class="inline-block animate-spin">⏳</span> Memproses...
					{:else}
						📊 Generate Rekapan
					{/if}
				</button>

				<button
					on:click={downloadRecap}
					disabled={loading || !summary}
					class="flex-1 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-gray-400"
				>
					📥 Download Excel
				</button>

				<button
					on:click={() => generateRecap(true)}
					disabled={loading}
					class="flex-1 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-400"
				>
					📤 Kirim ke Telegram
				</button>
			</div>

			<!-- Messages -->
			{#if error}
				<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
					<p class="text-sm text-red-700">❌ {error}</p>
				</div>
			{/if}

			{#if success}
				<div class="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
					<p class="text-sm text-green-700">✅ {success}</p>
				</div>
			{/if}

			<!-- Summary Display -->
			{#if summary}
				<div class="rounded-lg border border-gray-200 bg-gray-50 p-6">
					<h2 class="mb-4 text-xl font-bold text-gray-800">Ringkasan Absensi</h2>

					<!-- Overall Summary -->
					<div class="mb-6 grid grid-cols-3 gap-4">
						<div class="rounded-lg bg-white p-4 text-center shadow-sm">
							<p class="text-sm text-gray-600">Total Record</p>
							<p class="text-2xl font-bold text-gray-800">{summary.totalRecords}</p>
						</div>
						<div class="rounded-lg bg-white p-4 text-center shadow-sm">
							<p class="text-sm text-gray-600">Absen Masuk</p>
							<p class="text-2xl font-bold text-blue-600">{summary.byType.masuk}</p>
						</div>
						<div class="rounded-lg bg-white p-4 text-center shadow-sm">
							<p class="text-sm text-gray-600">Absen Pulang</p>
							<p class="text-2xl font-bold text-green-600">{summary.byType.pulang}</p>
						</div>
					</div>

					<!-- Class Details -->
					{#if summary.byClass && summary.byClass.length > 0}
						<h3 class="mb-3 text-lg font-semibold text-gray-700">Detail Per Kelas</h3>
						<div class="overflow-x-auto">
							<table class="w-full rounded-lg bg-white">
								<thead class="bg-gray-100">
									<tr>
										<th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kelas</th>
										<th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">
											Jumlah Siswa
										</th>
										<th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">
											Masuk
										</th>
										<th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">
											Pulang
										</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200">
									{#each summary.byClass as classData}
										<tr class="hover:bg-gray-50">
											<td class="px-4 py-3 font-medium text-gray-800">{classData.class}</td>
											<td class="px-4 py-3 text-center text-gray-700">
												{classData.totalStudents}
											</td>
											<td class="px-4 py-3 text-center text-blue-600">{classData.masuk}</td>
											<td class="px-4 py-3 text-center text-green-600">{classData.pulang}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Instructions -->
		<div class="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
			<h3 class="mb-3 font-semibold text-blue-800">📌 Petunjuk Penggunaan</h3>
			<ul class="space-y-2 text-sm text-blue-700">
				<li>• Pilih tanggal yang ingin dibuat rekapannya (maksimal 7 hari kebelakang)</li>
				<li>• Klik "Generate Rekapan" untuk melihat ringkasan data</li>
				<li>• Klik "Download Excel" untuk mengunduh file rekapan dalam format Excel</li>
				<li>• Klik "Kirim ke Telegram" untuk mengirim file Excel ke grup Telegram</li>
				<li>• Data absensi akan otomatis dihapus setelah 7 hari untuk menghemat storage</li>
			</ul>
		</div>

		<!-- Back Button -->
		<div class="mt-6 text-center">
			<a
				href="/"
				class="inline-block rounded-lg bg-gray-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-700"
			>
				← Kembali ke Halaman Absensi
			</a>
		</div>
	</div>
</div>