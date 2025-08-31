<script lang="ts">
	import { onMount } from 'svelte';

	export let onCapture: (imageData: string) => void;
	export let capturedImage: string | null = null;

	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let stream: MediaStream | null = null;
	let isLoading = false;
	let error = '';
	let isCameraActive = false;

	onMount(() => {
		return () => {
			// Cleanup stream when component unmounts
			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
			}
		};
	});

	async function startCamera() {
		try {
			isLoading = true;
			error = '';

			const constraints = {
				video: {
					width: { ideal: 640 },
					height: { ideal: 480 },
					facingMode: 'user' // Front camera for selfies
				},
				audio: false
			};

			stream = await navigator.mediaDevices.getUserMedia(constraints);
			videoElement.srcObject = stream;

			await new Promise((resolve) => {
				videoElement.onloadedmetadata = resolve;
			});

			await videoElement.play();
			isCameraActive = true;
			isLoading = false;
		} catch (err) {
			console.error('Error accessing camera:', err);
			error = 'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.';
			isLoading = false;
		}
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}
		isCameraActive = false;
	}

	function capturePhoto() {
		if (!videoElement || !canvasElement) return;

		const context = canvasElement.getContext('2d');
		if (!context) return;

		// Set canvas dimensions to match video
		canvasElement.width = videoElement.videoWidth;
		canvasElement.height = videoElement.videoHeight;

		// Draw current video frame to canvas
		context.drawImage(videoElement, 0, 0);

		// Convert to base64 image data
		const imageData = canvasElement.toDataURL('image/jpeg', 0.8);
		onCapture(imageData);

		// Stop camera after capture
		stopCamera();
	}

	function retakePhoto() {
		capturedImage = null;
		onCapture('');
		startCamera();
	}
</script>

<div class="camera-container mx-auto w-full max-w-md">
	<!-- Video element for live camera feed -->
	<video
		bind:this={videoElement}
		class="w-full rounded-lg border-2 border-gray-300"
		class:hidden={!isCameraActive || capturedImage}
		autoplay
		playsinline
		muted
	></video>

	<!-- Canvas for capturing images (hidden) -->
	<canvas bind:this={canvasElement} class="hidden"></canvas>

	<!-- Preview captured image -->
	{#if capturedImage}
		<div class="captured-image mb-4">
			<img
				src={capturedImage}
				alt="Foto yang diambil"
				class="w-full rounded-lg border-2 border-green-400"
			/>
		</div>
	{/if}

	<!-- Camera placeholder when not active -->
	{#if !isCameraActive && !capturedImage}
		<div
			class="camera-placeholder flex h-64 w-full items-center justify-center rounded-lg border-2 border-gray-300 bg-gray-200"
		>
			<div class="text-center text-gray-600">
				<svg class="mx-auto mb-2 h-16 w-16" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586l-.707-.707A1 1 0 0013 4h-6a1 1 0 00-.707.293L5.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
						clip-rule="evenodd"
					/>
				</svg>
				<p class="text-sm">Kamera belum aktif</p>
			</div>
		</div>
	{/if}

	<!-- Loading state -->
	{#if isLoading}
		<div
			class="loading-overlay bg-opacity-50 absolute inset-0 flex items-center justify-center rounded-lg bg-black"
		>
			<div class="text-center text-white">
				<div class="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
				<p>Mengaktifkan kamera...</p>
			</div>
		</div>
	{/if}

	<!-- Error message -->
	{#if error}
		<div class="error-message mt-2 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			<p class="text-sm">{error}</p>
		</div>
	{/if}

	<!-- Control buttons -->
	<div class="controls mt-4 flex justify-center gap-2">
		{#if !isCameraActive && !capturedImage}
			<button
				on:click={startCamera}
				disabled={isLoading}
				class="rounded-lg bg-blue-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-600 disabled:bg-gray-400"
			>
				Aktifkan Kamera
			</button>
		{/if}

		{#if isCameraActive && !capturedImage}
			<button
				on:click={capturePhoto}
				class="flex items-center gap-2 rounded-lg bg-green-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-green-600"
			>
				<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586l-.707-.707A1 1 0 0013 4h-6a1 1 0 00-.707.293L5.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
						clip-rule="evenodd"
					/>
				</svg>
				Ambil Foto
			</button>

			<button
				on:click={stopCamera}
				class="rounded-lg bg-gray-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-gray-600"
			>
				Batal
			</button>
		{/if}

		{#if capturedImage}
			<button
				on:click={retakePhoto}
				class="rounded-lg bg-yellow-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-yellow-600"
			>
				Ambil Ulang
			</button>
		{/if}
	</div>
</div>

<style>
	.camera-container {
		position: relative;
	}

	.loading-overlay {
		border-radius: inherit;
	}
</style>
