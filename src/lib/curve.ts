const e12 = `0,0
0.052,5.045
0.096,9.91
0.196,24.144
0.251,31.351
0.287,32.973
0.3,29.91
0.344,17.117
0.37,14.414
0.4,12.973
0.5,11.712
0.6,11.171
0.7,10.631
0.8,10.09
0.9,9.73
1,9.55
1.101,9.91
1.2,9.55
1.3,9.73
1.4,9.73
1.5,9.73
1.6,9.73
1.7,9.55
1.8,9.73
1.9,9.73
2,9.55
2.1,9.55
2.2,9.73
2.3,9.19
2.375,9.37
2.4,5.95
2.44,0`;

const f15 = `0,0
0.148,7.638
0.228,12.253
0.294,16.391
0.353,20.21
0.382,22.756
0.419,25.26
0.477,23.074
0.52,20.845
0.593,19.093
0.688,17.5
0.855,16.225
1.037,15.427
1.205,14.948
1.423,14.627
1.452,15.741
1.503,14.785
1.736,14.623
1.955,14.303
2.21,14.141
2.494,13.819
2.763,13.338
3.12,13.334
3.382,13.013
3.404,9.352
3.418,4.895
3.45,0`;

interface Point {
	t: number;
	n: number;
}

export class Curve {
	points: Point[];
	impulse: number;
	time: number;

	constructor(public csv: string) {
		const points = csv
			.split('\n')
			.map((line) => line.split(',').map(Number))
			.map((pair) => ({
				t: pair[0],
				n: pair[1]
			})) as Point[];

		let impulse = 0;

		for (const i in points) {
			if (+i + 1 >= points.length) {
				break;
			}

			const p0 = points[+i];
			const p1 = points[+i + 1];

			const area = 0.5 * (p0.n + p1.n) * (p1.t - p0.t);
			impulse += area;
		}

		this.points = points;
		this.impulse = impulse;
		this.time = points[points.length - 1].t;
	}

	thrust(t: number): number {
		let pLow: Point | undefined;
		let pHigh: Point | undefined;

		for (const i in this.points) {
			const point = this.points[i];
			if (point.t <= t) {
				pLow = point;
			}

			if (point.t > t) {
				pHigh = point;
				break;
			}
		}

		if (pLow === undefined || pHigh === undefined) {
			return 0;
		}

		const rise = pHigh.n - pLow.n;
		const run = pHigh.t - pLow.t;
		const slope = rise / run;

		return pLow.n + slope * (t - pLow.t);
	}
}

export const e12Curve = new Curve(e12);

export const f15Curve = new Curve(f15);

class MotionResult {
	y: number; // displacement (downward positive)
	v: number; // velocity at end (downward positive)
	impulse: number; // total impulse applied (N·s)

	constructor(y: number, v: number, impulse: number) {
		this.y = y;
		this.v = v;
		this.impulse = impulse;
	}
}

export function displacementWithLinearThrust(
	c: Curve,
	m: number = 0.8,
	g: number = 9.81,
	freeFallStart: number = 0.0,
	freeFallEnd: number = 2.0,
	thrustEnd: number = 5.0
): MotionResult {
	if (thrustEnd < freeFallEnd) {
		throw new Error('thrustEnd must be >= freeFallEnd');
	}

	const curve = JSON.parse(JSON.stringify(c)) as Curve;

	curve.points = curve.points.map((s) => {
		return {
			t: s.t + freeFallEnd,
			n: s.n
		};
	});

	// Helper: linear interpolation of thrust at a given time
	const sampleAt = (t: number, arr: Point[]): Point => {
		const exact = arr.find((s) => Math.abs(s.t - t) < 1e-12);
		if (exact) return { t, n: exact.n };

		const j = arr.findIndex((s) => s.t > t);
		if (j <= 0) {
			// If outside range, assume T=0 beyond provided curve
			return { t, n: 0.0 };
		}
		const a = arr[j - 1];
		const b = arr[j];
		const u = (t - a.t) / (b.t - a.t);
		return { t, n: a.n + u * (b.n - a.n) };
	};

	// Sort by time
	const S = [...curve.points].sort((a, b) => a.t - b.t);
	const t0 = freeFallStart;
	const t1 = freeFallEnd;
	const t2 = thrustEnd;

	// State after free fall
	const v_ff = 0.0 + g * (t1 - t0);
	const y_ff = 0.0 + 0.5 * g * Math.pow(t1 - t0, 2);

	// Build full knot list for [t1, t2]
	let knots: Point[] = [];
	if (S.length > 0) {
		knots.push(sampleAt(t1, S));
		for (const s of S) {
			if (s.t > t1 && s.t < t2) knots.push(s);
		}
		knots.push(sampleAt(t2, S));
	} else {
		// No thrust data: treat as zero-thrust
		knots = [
			{ t: t1, n: 0.0 },
			{ t: t2, n: 0.0 }
		];
	}

	// Integrate exactly over each linear segment
	let y = y_ff;
	let v = v_ff;
	let J = 0.0;

	for (let i = 0; i < knots.length - 1; i++) {
		const a = knots[i];
		const b = knots[i + 1];
		const dt = b.t - a.t;
		const s = (b.n - a.n) / dt; // thrust slope

		// save velocity at start of segment
		const v_i = v;

		// impulse on this segment (trapezoid)
		J += 0.5 * (a.n + b.n) * dt;

		// velocity update
		const dv = g * dt - (a.n / m) * dt - (s / (2.0 * m)) * dt * dt;
		v += dv;

		// displacement update
		const dy =
			v_i * dt + 0.5 * g * dt * dt - (a.n / (2.0 * m)) * dt * dt - (s / (6.0 * m)) * dt * dt * dt;
		y += dy;
	}

	return new MotionResult(y, v, J);
}
