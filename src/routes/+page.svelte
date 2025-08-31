<script lang="ts">
	import Camera from '$lib/components/Camera.svelte';
	import StudentForm from '$lib/components/StudentForm.svelte';
	import img from "$lib/assets/favicon.png";

	// Student data state
	let studentData = {
		name: '',
		class: '',
		attendanceType: ''
	};

	// Form validation errors
	let formErrors = {};

	// Camera state
	let capturedImage = '';
	let isSubmitting = false;
	let submitMessage = '';
	let submitSuccess = false;

	// Form validation reference
	let validateStudentForm: () => boolean;

	function handleImageCapture(imageData: string) {
		capturedImage = imageData;
	}

	async function handleSubmit() {
		// Validate form
		const isFormValid = validateStudentForm();

		if (!isFormValid) {
			submitMessage = 'Mohon lengkapi semua data yang diperlukan';
			submitSuccess = false;
			return;
		}

		if (!capturedImage) {
			submitMessage = 'Mohon ambil foto selfie terlebih dahulu';
			submitSuccess = false;
			return;
		}

		isSubmitting = true;
		submitMessage = '';

		try {
			// Create form data
			const formData = new FormData();

			// Convert base64 image to blob
			const response = await fetch(capturedImage);
			const blob = await response.blob();

			formData.append('photo', blob, 'selfie.jpg');
			formData.append('name', studentData.name);
			formData.append('class', studentData.class);
			formData.append('attendanceType', studentData.attendanceType);
			formData.append('timestamp', new Date().toISOString());

			// Submit to API
			const submitResponse = await fetch('/api/attendance', {
				method: 'POST',
				body: formData
			});

			const result = await submitResponse.json();

			if (submitResponse.ok) {
				submitSuccess = true;
				submitMessage = result.message || 'Absensi berhasil dikirim! Data Anda telah tercatat.';

				// Reset form after successful submission
				setTimeout(() => {
					studentData = {
						name: '',
						class: '',
						attendanceType: ''
					};
					capturedImage = '';
					submitMessage = '';
					submitSuccess = false;
				}, 3000);
			} else {
				throw new Error(result.error || 'Gagal mengirim absensi');
			}
		} catch (error) {
			console.error('Error submitting attendance:', error);
			// Display the actual error message if available
			if (error instanceof Error) {
				submitMessage = error.message;
			} else {
				submitMessage = 'Gagal mengirim absensi. Silakan coba lagi.';
			}
			submitSuccess = false;
		}

		isSubmitting = false;
	}
</script>

<svelte:head>
	<title>Absensi Siswa - SMA Adabiah 1 Padang</title>
	<meta name="description" content="Sistem absensi online untuk siswa SMA Adabiah 1 Padang" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
	<div class="container mx-auto max-w-4xl px-4 py-8">
		<!-- Header -->
		<header class="mb-8 text-center">
			<div class="school-logo mb-4">
				<div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full ">
					<img src={img} alt="">
				</div>
			</div>
			<h1 class="mb-2 text-3xl font-bold text-gray-800">SMA Adabiah 1 Padang</h1>
			<p class="text-lg text-gray-600">Sistem Absensi Online</p>
			<div class="mx-auto mt-4 h-1 w-24 rounded-full bg-blue-500"></div>
		</header>

		<div class="overflow-hidden rounded-xl bg-white shadow-lg">
			<div class="p-6 lg:p-8">
				<div class="grid gap-8 lg:grid-cols-2">
					<!-- Student Form Column -->
					<div class="order-2 lg:order-1">
						<StudentForm
							bind:studentData
							bind:errors={formErrors}
							bind:validateForm={validateStudentForm}
						/>
					</div>

					<!-- Camera Column -->
					<div class="order-1 lg:order-2">
						<div class="camera-section">
							<h3 class="mb-4 text-lg font-semibold text-gray-800">Foto Selfie</h3>
							<p class="mb-4 text-sm text-gray-600">
								Ambil foto selfie Anda untuk verifikasi absensi. Pastikan wajah Anda terlihat jelas.
							</p>
							<Camera onCapture={handleImageCapture} bind:capturedImage />
						</div>
					</div>
				</div>

				<!-- Submit Button -->
				<div class="mt-8 border-t border-gray-200 pt-6">
					{#if submitMessage}
						<div
							class="mb-4 rounded-lg p-4 text-center font-semibold"
							class:bg-green-100={submitSuccess}
							class:text-green-800={submitSuccess}
							class:bg-red-100={!submitSuccess}
							class:text-red-800={!submitSuccess}
						>
							{submitMessage}
						</div>
					{/if}

					<div class="flex justify-center">
						<button
							on:click={handleSubmit}
							disabled={isSubmitting}
							class="flex min-w-48 items-center gap-3 rounded-lg bg-blue-600 px-8 py-4 text-lg font-bold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
							class:opacity-50={isSubmitting}
						>
							{#if isSubmitting}
								<div class="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
								Mengirim Absensi...
							{:else}
								<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
								Kirim Absensi
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<footer class="mt-8 text-center text-sm text-gray-600">
			<p>&copy; 2025 SMA Adabiah 1 Padang</p>
			<p class="mt-1">Sistem absensi digital untuk kemudahan dan akurasi data kehadiran siswa.</p>
			<p class="mt-1 font-semibold text-blue-600">IT SUPPORT</p>
			<p class="mt-1 font-semibold text-blue-600">
				<a href="https://arovi.vercel.app">Arpansi-Enterprise X Yotoko Id</a>
			</p>
		</footer>
	</div>
</div>
