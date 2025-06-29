<script lang="ts">
	import MeasureStick from '$lib/MeasureStick.svelte';

	import { onMount } from 'svelte';

	let cycle = 0;
	let initT = 0; // s
	let t = 0; // s
	let dt = 0; // s
	let avgDt = 0; // s

	const m = 0.8; // kg

	let s = 10; // m
	let u = 0; // m/s
	let v = 0; // m/sx
	const a = -9.81; // ms^-2

	let powered = false; // whether vehicle is under propulsion

	onMount(() => {
		let c = document.getElementById('canvas') as HTMLCanvasElement;
		let ctx = c.getContext('2d') as CanvasRenderingContext2D;
		let rocket = document.getElementById('rocket') as HTMLImageElement;
		let flame = document.getElementById('flame') as HTMLImageElement;

		initT = performance.now() / 1000;

		const interval = setInterval(() => {
			cycle += 1;

			const tNow = performance.now() / 1000 - initT;
			dt = tNow - t;
			t = tNow;

			avgDt = avgDt * ((cycle - 1) / cycle) + dt / cycle;

			v = u + a * dt;
			s += u * dt + 0.5 * a * dt * dt;

			u = v;

			if (s < 0) {
				clearInterval(interval);
			}

			ctx.clearRect(0, 0, c.width, c.height);

			ctx.drawImage(rocket, 50, -s * 100 + 1000);

			if (powered) {
				ctx.drawImage(flame, 78, -s * 100 + 1000 + 131 - 11);
			}
		}, 4);
	});
</script>

<main>
	<img src="flame.svg" alt="flame" id="flame" style="display: none;" />

	<div class="hstack">
		<img src="rocket.svg" alt="rocket" id="rocket" />
		<MeasureStick length={131} />
	</div>

	<div class="hstack a-end">
		<canvas id="canvas" width="162" height="1131"></canvas>
		<MeasureStick length={1000} />
	</div>

	<div id="info">
		<p>cycle = {cycle}</p>
		<p>t = {String(Math.round(t * 1000) / 1000).padEnd(4 + String(Math.floor(t)).length, '0')} s</p>
		<p>f = {Math.round(1 / dt)} Hz</p>
		<p>f&#x0305; = {Math.round(1 / avgDt)} Hz</p>

		<hr />

		<p>
			s = {String(Math.round(s * 100) / 100).padEnd(2 + String(Math.floor(s)).length, '0')} m
		</p>
		<p>
			v = {String(Math.round(v * 100) / 100).padEnd(2 + String(Math.floor(v)).length, '0')} ms^-1
		</p>
		<p>a = {a} ms^-2</p>

		<hr />

		<p>1 px = 1 cm</p>
	</div>
</main>

<style>
	* {
		font-family: monospace;
	}

	main {
		display: flex;
		flex-direction: row;
		align-items: flex-end;
		gap: 20px;
	}

	canvas {
		border: 1px solid black;
	}

	#info {
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
