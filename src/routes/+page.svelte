<script lang="ts">
	import {
		Curve,
		d12Curve,
		displacementWithLinearThrust,
		e12Curve,
		e16Curve,
		f15Curve,
		MotionResult
	} from '$lib/curve';
	import MeasureStick from '$lib/MeasureStick.svelte';
	import { onMount } from 'svelte';

	let scale: number;

	let m: number; // kg
	let pwmStartT = 0;

	onMount(() => {
		scale = window.innerHeight / 2153;
		window.scrollTo(0, document.body.scrollHeight);
		m = Number(prompt('Mass (kg)', '0.8'));
	});

	let curve: Curve | undefined;
	let targetCurve: Curve | undefined;
	let f: number | undefined;
	let targetPt: number | undefined;
	let targetMotionResult: MotionResult | undefined;

	let started = false;

	let cycle = 0;
	let ignStartT: number | undefined; // s
	let t = 0; // s

	let s = 20; // m
	let v = 0; // ms^-1
	let a = -9.81; // ms^-2

	let nLog: { n: number; t: number }[] = [{ n: 0, t: 0 }]; // { n: N, t: s }
	let underThrust = false;

	function start() {
		started = true;

		let c = document.getElementById('canvas') as HTMLCanvasElement;
		let ctx = c.getContext('2d') as CanvasRenderingContext2D;
		let rocket = document.getElementById('rocket') as HTMLImageElement;
		let flame = document.getElementById('flame') as HTMLImageElement;

		const fixedDt = 0.001;
		let accumulator = 0;
		let lastRealT = performance.now() / 1000;

		function physicsStep() {
			cycle += 1;
			t += fixedDt;

			if (t >= pwmStartT) {
				underThrust = true;
			}

			if (t >= targetCurve!.time + pwmStartT) {
				underThrust = false;
			}

			if (underThrust && !ignStartT) {
				ignStartT = t;
			}

			let n = underThrust ? targetCurve!.thrust(t - ignStartT!) : 0;

			if (n != nLog[nLog.length - 1]?.n) {
				nLog = [...nLog, { n: n, t: t }];
				window.scrollTo(0, document.body.scrollHeight);
			}

			a = (m * -9.81 + n) / m;

			v += a * fixedDt;
			s += v * fixedDt;

			if (s <= 0) {
				started = false;
			}
		}

		function render() {
			ctx.clearRect(0, 0, c.width, c.height);
			ctx.drawImage(rocket, 50, -s * 100 + 2000);
			let n = nLog[nLog.length - 1]?.n ?? 0;
			if (n > 0) {
				ctx.drawImage(flame, 78, -s * 100 + 2000 + 131 - 11);
			}
		}

		function loop() {
			let now = performance.now() / 1000;
			let frameDt = now - lastRealT;
			lastRealT = now;
			accumulator += frameDt;

			while (accumulator >= fixedDt && started) {
				physicsStep();
				accumulator -= fixedDt;
			}

			render();

			if (started) requestAnimationFrame(loop);
		}

		requestAnimationFrame(loop);
	}

	$: if (curve && !targetCurve) {
		f = Number(prompt('PWM Frequency', '5'));
		const step = Number(prompt('Step', '0.005'));

		const p = 1 / f!;

		for (let t = 0; t <= Math.sqrt((2 * s) / -a); t += step) {
			for (let pt = 0; pt <= p; pt += step) {
				const thisCurve = curve!.pwm(f!, pt);
				const result = displacementWithLinearThrust(thisCurve, m, -a, 0.0, t, t + thisCurve.time);

				if (!result.v || !result.y) {
					console.log(thisCurve);
				}

				// if (
				// 	Math.abs(result.y - 20) + Math.abs(result.v) <
				// 	Math.abs((targetMotionResult?.y ?? Infinity) - 20) +
				// 		Math.abs(targetMotionResult?.v ?? Infinity)
				// )

				if (
					Math.abs(result.y - 20) < 0.1 &&
					Math.abs(result.v) < Math.abs(targetMotionResult?.v ?? Infinity) &&
					Math.abs(result.v) < 2
				) {
					pwmStartT = t;
					targetCurve = thisCurve;
					targetPt = pt;
					targetMotionResult = result;
				}
			}
		}

		if (!targetMotionResult) {
			alert('No viable landing configurations found. Reloading.');
			location.reload();
		}

		console.log(pwmStartT, targetPt, targetMotionResult);
	}
</script>

<main style="transform: scale({scale});">
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

		<hr />

		<p>
			s = {String(Math.round(s * 100) / 100)} m
		</p>
		<p>
			v = {(v >= 0 ? '+' : '-') + String(Math.round(Math.abs(v) * 100) / 100)} ms^-1
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

		<hr />

		<p>J = {Math.round((curve?.impulse ?? 0) * 100) / 100} N</p>
		<p>t = {Math.round((curve?.time ?? 0) * 100) / 100} s</p>

		<p>J_pwm = {Math.round((targetCurve?.impulse ?? 0) * 100) / 100} N</p>
		<p>t_pwm = {Math.round((targetCurve?.time ?? 0) * 100) / 100} s</p>

		<hr />

		<p>f = {String(Math.round((f ?? 0) * 100) / 100)} Hz</p>
		<p>pt = {String(Math.round((targetPt ?? 0) * 100) / 100)} s</p>

		<p>t_i = {String(Math.round(pwmStartT * 1000) / 1000)} s</p>

		<p>
			s_fe = {String(Math.round((20 - (targetMotionResult?.y ?? 0)) * 1000) / 1000)} m
		</p>
		<p>v_fe = {String(Math.round(-(targetMotionResult?.v ?? 0) * 1000) / 1000)} ms^-1</p>
	</div>

	{#if curve == undefined}
		<button
			on:click={() => {
				curve = d12Curve;
			}}>D12 Curve</button
		>

		<button
			on:click={() => {
				curve = e12Curve;
			}}>E12 Curve</button
		>

		<button
			on:click={() => {
				curve = e16Curve;
			}}>E16 Curve</button
		>

		<button
			on:click={() => {
				curve = f15Curve;
			}}>F15 Curve</button
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
						console.dir(curve);
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
		transform-origin: bottom left;
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
