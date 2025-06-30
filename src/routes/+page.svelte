<script lang="ts">
	import { Curve, e12Curve } from '$lib/curve';
	import MeasureStick from '$lib/MeasureStick.svelte';
	import { onMount } from 'svelte';

	onMount(() => {
		window.scrollTo(0, document.body.scrollHeight);
	});

	let curve: Curve | undefined;

	let started = false;

	let cycle = 0;
	let initT = 0; // s
	let ignStartT: number | undefined; // s
	let t = 0; // s
	let dt = 0; // s
	let avgDt = 0; // s

	const m = 0.8; // kg

	let s = 20; // m
	let u = 0; // m/s
	let v = 0; // m/sx
	let a = -9.81; // ms^-2

	let nLog: { n: number; t: number }[] = [{ n: 0, t: 0 }]; // { n: N, t: s }
	let underThrust = false;

	function start() {
		started = true;

		let c = document.getElementById('canvas') as HTMLCanvasElement;
		let ctx = c.getContext('2d') as CanvasRenderingContext2D;
		let rocket = document.getElementById('rocket') as HTMLImageElement;
		let flame = document.getElementById('flame') as HTMLImageElement;

		initT = performance.now() / 1000;

		const netImpulse = curve!.impulse + m * a * curve!.time;
		const toIgnT = netImpulse / -(m * a);

		const interval = setInterval(() => {
			cycle += 1;

			const tNow = performance.now() / 1000 - initT;
			dt = tNow - t;
			t = tNow;

			avgDt = avgDt * ((cycle - 1) / cycle) + dt / cycle;

			if (!underThrust && tNow >= toIgnT) {
				underThrust = true;
			}

			if (underThrust && !ignStartT) {
				ignStartT = tNow;
			}

			let n = underThrust ? curve!.thrust(tNow - ignStartT!) : 0;

			if (n != nLog[nLog.length - 1]?.n) {
				nLog = [...nLog, { n: n, t: tNow }];
				window.scrollTo(0, document.body.scrollHeight);
			}

			if (n <= 0 && nLog.length > 1) {
				clearInterval(interval);
			}

			a = (m * -9.81 + n) / m;

			v = u + a * dt;
			s += u * dt + 0.5 * a * dt * dt;

			u = v;

			if (s < 0) {
				clearInterval(interval);
			}

			ctx.clearRect(0, 0, c.width, c.height);

			ctx.drawImage(rocket, 50, -s * 100 + 2000);

			if (n > 0) {
				ctx.drawImage(flame, 78, -s * 100 + 2000 + 131 - 11);
			}
		}, 4);
	}
</script>

<main>
	<img src="flame.svg" alt="flame" id="flame" style="display: none;" />

	<div class="hstack">
		<img src="rocket.svg" alt="rocket" id="rocket" />
		<MeasureStick length={131} />
	</div>

	<div class="hstack a-end">
		<canvas id="canvas" width="162" height="2131"></canvas>
		<MeasureStick length={2000} />
	</div>

	<div class="info">
		<p>cycle = {String(cycle).padStart(3, '0')}</p>
		<p>t = {String(Math.round(t * 1000) / 1000).padEnd(5, '0')} s</p>
		<p>f = {Math.round(1 / dt)} Hz</p>
		<p>f&#x0305; = {Math.round(1 / avgDt)} Hz</p>

		<hr />

		<p>
			s = {String(Math.round(s * 100) / 100)
				.padEnd(4, '0')
				.padStart(5, '+')} m
		</p>
		<p>
			v = {(v > 0 ? '+' : '-' + String(Math.round(Math.abs(v) * 100) / 100)).padEnd(5, '0')} ms^-1
		</p>
		<p>
			a = {String(Math.round(a * 100) / 100)
				.padEnd(4, '0')
				.padStart(5, '+')} ms^-2
		</p>

		<hr />

		<p>1 px = 1 cm</p>
	</div>

	<div class="info">
		{#each nLog as data}
			<p>
				{[String(Math.round(data.t * 1000) / 1000)]
					.map((str) => (str.includes('.') ? str : str + '.'))[0]
					.padEnd(5, '0')} s - {[String(Math.round(data.n * 100) / 100)]
					.map((str) => (str.includes('.') ? str : str + '.'))[0]
					.padEnd(5, '0')} N
			</p>
		{/each}
	</div>

	{#if curve == undefined}
		<button
			on:click={() => {
				curve = e12Curve;
			}}>E12 Curve</button
		>

		<input
			type="file"
			accept=".csv"
			on:change={(e) => {
				const file = (e.target as HTMLInputElement).files?.[0];
				if (file) {
					const reader = new FileReader();
					reader.onload = (event) => {
						const text = event.target?.result as string;
						curve = new Curve(text);
					};
					reader.readAsText(file);
				}
			}}
		/>
	{:else if !started}
		<button on:click={start}>Start</button>
	{:else}
		<button
			on:click={() => {
				underThrust = !underThrust;
			}}>Toggle Thrust</button
		>
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
	}

	* {
		font-family: monospace;
		box-sizing: border-box;
	}

	main {
		display: flex;
		flex-direction: row;
		align-items: flex-end;
		gap: 20px;

		min-height: 100vh;
		padding: 10px;
	}

	canvas {
		border: 1px solid black;
	}

	.info {
		padding: 10px;
		border: 1px solid black;
	}

	div.hstack {
		display: flex;
		flex-direction: row;
		gap: 5px;
	}

	div.a-end {
		align-items: flex-end;
	}
</style>
