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
