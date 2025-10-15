<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	
	export let studentData: {
		name: string;
		class: string;
		attendanceType: string;
	};

	// SMA classes for Adabiah 1 Padang
	const classes = [
		"XIF1",
		"XIF2",
		"XIF3",
		"XIF4",
		"XIF5",
		"XIF6",
	];

	const attendanceTypes = [
		{ value: 'masuk', label: 'Absen Masuk' },
		{ value: 'pulang', label: 'Absen Pulang' }
	];

	// Form validation
	export let errors: {
		name?: string;
		class?: string;
		attendanceType?: string;
	} = {};
	
	// Real-time clock state
	let currentTime = new Date();
	let timeInterval: NodeJS.Timeout;
	
	onMount(() => {
		// Update time every second
		timeInterval = setInterval(() => {
			currentTime = new Date();
		}, 1000);
	});
	
	onDestroy(() => {
		// Clean up interval when component is destroyed
		if (timeInterval) {
			clearInterval(timeInterval);
		}
	});

	function validateForm() {
		errors = {};

		if (!studentData.name.trim()) {
			errors.name = 'Nama lengkap wajib diisi';
		} else if (studentData.name.trim().length < 3) {
			errors.name = 'Nama harus minimal 3 karakter';
		}

		if (!studentData.class) {
			errors.class = 'Kelas wajib dipilih';
		}

		if (!studentData.attendanceType) {
			errors.attendanceType = 'Jenis absensi wajib dipilih';
		}

		return Object.keys(errors).length === 0;
	}

	// Export validation function for parent component
	export { validateForm };
</script>

<div class="student-form space-y-4">
	<div class="form-header mb-6">
		<h2 class="mb-2 text-xl font-bold text-gray-800">Data Siswa</h2>
		<p class="text-sm text-gray-600">Lengkapi data diri Anda sebelum melakukan absensi</p>
	</div>

	<!-- Name Input -->
	<div class="form-group">
		<label for="student-name" class="mb-2 block text-sm font-semibold text-gray-700">
			Nama Lengkap <span class="text-red-500">*</span>
		</label>
		<input
			id="student-name"
			type="text"
			bind:value={studentData.name}
			on:blur={validateForm}
			placeholder="Masukkan nama lengkap Anda"
			class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
			class:border-red-400={errors.name}
			class:focus:ring-red-500={errors.name}
			class:focus:border-red-500={errors.name}
		/>
		{#if errors.name}
			<p class="mt-1 text-xs text-red-500">{errors.name}</p>
		{/if}
	</div>

	<!-- Class Selection -->
	<div class="form-group">
		<label for="student-class" class="mb-2 block text-sm font-semibold text-gray-700">
			Kelas <span class="text-red-500">*</span>
		</label>
		<select
			id="student-class"
			bind:value={studentData.class}
			on:change={validateForm}
			class="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
			class:border-red-400={errors.class}
			class:focus:ring-red-500={errors.class}
			class:focus:border-red-500={errors.class}
		>
			<option value="">Pilih kelas Anda</option>
			{#each classes as classOption (classOption)}
				<option value={classOption}>{classOption}</option>
			{/each}
		</select>
		{#if errors.class}
			<p class="mt-1 text-xs text-red-500">{errors.class}</p>
		{/if}
	</div>

	<!-- Attendance Type -->
	<div class="form-group">
		<fieldset>
			<legend class="mb-2 block text-sm font-semibold text-gray-700">
				Jenis Absensi <span class="text-red-500">*</span>
			</legend>
			<div class="space-y-2">
				{#each attendanceTypes as type (type.value)}
					<label
						class="flex cursor-pointer items-center rounded-lg border border-gray-300 p-3 transition-colors hover:bg-gray-50"
						class:border-blue-500={studentData.attendanceType === type.value}
						class:bg-blue-50={studentData.attendanceType === type.value}
					>
						<input
							type="radio"
							bind:group={studentData.attendanceType}
							value={type.value}
							on:change={validateForm}
							class="text-blue-500 focus:ring-blue-500"
						/>
						<span class="ml-3 font-medium text-gray-700">{type.label}</span>
					</label>
				{/each}
			</div>
			{#if errors.attendanceType}
				<p class="mt-1 text-xs text-red-500">{errors.attendanceType}</p>
			{/if}
		</fieldset>
	</div>

	<!-- Current Time Display (Real-time) -->
	<div class="time-display rounded-lg border bg-gray-50 p-3">
		<div class="flex items-center justify-between text-sm text-gray-600">
			<span class="font-semibold">Waktu Absensi:</span>
			<span class="font-mono text-lg font-bold text-blue-600"
				>{currentTime.toLocaleString('id-ID', {
					timeZone: 'Asia/Jakarta',
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit'
				})}</span
			>
		</div>
	</div>
</div>

<style>
	select {
		background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
		background-position: right 0.5rem center;
		background-repeat: no-repeat;
		background-size: 1.5em 1.5em;
		padding-right: 2.5rem;
	}
</style>
