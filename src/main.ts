/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";

import { from, fromEvent, interval, merge, Observable, of, timer } from "rxjs";
import { map, filter, scan, mergeWith, startWith, mergeMap, take, delay, last, tap, first, finalize } from "rxjs/operators";
import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";

/** Constants */

const Viewport = {
    CANVAS_WIDTH: 200,
    CANVAS_HEIGHT: 400,
	UNRENDER_THRESHOLD: 385,
} as const;

const Zones = {
	DETECTION_ZONE: 300,
	GOOD_ZONE: 320,
	PERFECT_ZONE: 340,
	END_PERFECT_ZONE: 360,
	END_GOOD_ZONE: 375,
	END_DETECTION_ZONE: 375,
}

const Constants = {
    TICK_RATE_MS: 10,

	// SONG_NAME: "nightsOfNights",
	// SONG_NAME: "nightsOfNights_bg",
	// SONG_NAME: "nightsOfNights_isuck",
	// SONG_NAME: "stickyBug",
	// SONG_NAME: 'megalovania',
	// SONG_NAME: 'megalovania-bg',
	// SONG_NAME: 'monstadt-night',
	// SONG_NAME: 'IlVentoDoro',
	// SONG_NAME: 'IlVentoDoro2',
	// SONG_NAME: 'summertime',
	// SONG_NAME: 'renaiCirculation',
	// SONG_NAME: 'stapleStable',
	// SONG_NAME: 'turningLove',
	SONG_NAME: 'Say!Fanfare',
	// SONG_NAME: "RockinRobin",
    // SONG_NAME: "ThroughTheFireAndTheFlames",
	// SONG_NAME: "pianoMan",
	// SONG_NAME: "guitarMan",
	// SONG_NAME: 'bonAppatit',
	// SONG_NAME: "constallation_vocals",
	// SONG_NAME: "cantina",
	// SONG_NAME: 'dot',
	// SONG_NAME: 'dotSmall',
	// SONG_NAME: 'drag',
	// SONG_NAME: 'drag2',
	// SONG_NAME: 'drag3',
	// SONG_NAME: "sus",
	// SONG_NAME: "sageJihen",
	// SONG_NAME: "f--kingbull----",
	// SONG_NAME: "IWannaBeAGirl",
	// SONG_NAME: "loveTrial",

	BASE_SCORE: 10
} as const;

const Note = {
    RADIUS: 0.07 * Viewport.CANVAS_WIDTH,
    TAIL_WIDTH: 10,
	SPEED: 3.5 // xunit / tickz
};

const Bar = {
	width: Note.RADIUS * 1.5
}

/** User input */

type Key = "KeyS" | "KeyD" | "KeyJ" | "KeyK";

type Event = "keydown" | "keyup" | "keypress";

/** Utility functions */

/** State processing */

class AMusic {
	readonly duration: number;

	constructor (
		public readonly played: Boolean,
		public readonly instrument: string,
		public readonly velocity: number,
		public readonly pitch: number,
		public readonly start: number,
		public readonly end: number
	) { 
		this.duration = this.end - this.start
	}

	// WARNING: UNPURE, ONLY USE THIS IN SUBSCRIBE
	public readonly playSound = () => {
		const volume = this.velocity / 127

		samples[this.instrument].triggerAttackRelease(
			Tone.Frequency(this.pitch, 'midi').toNote(),
			this.duration,
			undefined,
			volume
		)
	}

	public readonly startStream = () => {
		const volume = this.velocity / 127

		samples[this.instrument].triggerAttack(
			Tone.Frequency(this.pitch, 'midi').toNote(),
			undefined,
			volume
		)
	}

	public readonly randomPitch = () => {
		return new AMusic(
			this.played,
			this.instrument,
			127, // people need to know they fuck up
			Math.floor(25 + (Math.random() * 65)),
			0,
			Math.random() / 2,
		)
	}

	public readonly stopSound = () => {
		samples[this.instrument].triggerRelease(
			Tone.Frequency(this.pitch, 'midi').toNote(),
		)
	}
}

class ANote {
	constructor (
		public readonly y: number,
		public readonly endY: number,
		public readonly associatedMusic: AMusic,

		public readonly isStream: boolean = false,
		public readonly clicked: boolean = false,
	) { }

	public readonly click = () => {
		return new ANote(this.y, this.endY, this.associatedMusic, this.isStream, true)
	}

	public readonly unclick = () => {
		return new ANote(this.y, this.endY, this.associatedMusic, this.isStream, false)
	}

	public readonly move = () => this.clicked ? 
	new ANote(this.y, this.endY + Note.SPEED, this.associatedMusic, this.isStream, this.clicked) :
	new ANote(this.y + Note.SPEED, this.endY + Note.SPEED, this.associatedMusic, this.isStream, this.clicked)
}

class ALine {
	constructor (
		public readonly line: ReadonlyArray<ANote> = [],
		public readonly hold: boolean = false,
		public readonly clicked: number = 0
	) { }

	public readonly replaceLine = (line: ReadonlyArray<ANote>) => {
		return new ALine(line, this.hold, this.clicked)
	}

	public readonly lineDown = (clicked: number = 0) => {
		return new ALine(this.line, true, clicked)
	}

	public readonly lineUp = (clicked: number = 0) => {
		return new ALine(this.line, false, clicked)
	}

	public readonly front = () => {
		return this.line.at(0)
	}

	public readonly replaceFront = (newNode: ANote, replace: ANote) => {
		const index = this.line.indexOf(replace)
		if (index < 0) {
			return this
		}
		return this.replaceLine([...this.line.slice(0, index), newNode, ...this.line.slice(index + 1)])
	}

	public readonly back = () => {
		return this.line.at(-1)
	}

	public readonly removeFront = () => {
		return this.replaceLine(this.line.slice(1))
	}

	public readonly tick = () => {
		return this.replaceLine(
			(this.line.length > 0 ? 
				((this.line.at(0)!.isStream) ? this.line.at(0)!.endY : this.line.at(0)!.y) > Viewport.UNRENDER_THRESHOLD ? 
				this.line.slice(1) : 
				this.line
			: this.line).map(note => note.move())
		)
	}
}

type lineNames = 'greenLine' | 'redLine' | 'blueLine' | 'yellowLine'

class AGameFrame {
	constructor (
		public readonly greenLine: ALine = new ALine(),
		public readonly redLine: ALine = new ALine(),
		public readonly blueLine: ALine = new ALine(),
		public readonly yellowLine: ALine = new ALine(),
	) { }
}

class AGameData {
	constructor (
		public readonly multiplier: number,
		public readonly score: number,
		public readonly combo: number,
		public readonly totalNodes: number,
		public readonly notesPlayed: number,
	) { }
}

type State = Readonly<{
    gameEnd: boolean,

	keyPressed: ReadonlyArray<Key>,
	gameFrame: AGameFrame,

	data: AGameData,

	music: AMusic | null
	startStream: AMusic | null
	stopMusic: AMusic | null
}>;

const initialState: (totalNodes: number) => State = (totalNodes) => ({
    gameEnd: false,
	keyPressed: [],
	gameFrame: new AGameFrame(),
	data: new AGameData(1, 0, 0, totalNodes, 0),

	music: null,
	startStream: null,
	stopMusic: null,
})

/**
 * Updates the state by proceeding with one time step.
 *
 * @param s Current state
 * @returns Updated state
 */
const tick = (s: State) => s;

/** Rendering (side effects) */

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement) => {
    elem.setAttribute("visibility", "visible");
    elem.parentNode!.appendChild(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGGraphicsElement) =>
    elem.setAttribute("visibility", "hidden");

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {},
) => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
};

/**
 * This is the function called on page load. Your main game loop
 * should be called here.
 */
export function main(csv_contents: string) {
    // Canvas elements
    const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
        HTMLElement;
    const preview = document.querySelector(
        "#svgPreview",
    ) as SVGGraphicsElement & HTMLElement;
    const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
        HTMLElement;
    const container = document.querySelector("#main") as HTMLElement;

    svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
    svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);

    // Text fields
    const multiplier = document.querySelector("#multiplierText") as HTMLElement;
    const scoreText = document.querySelector("#scoreText") as HTMLElement;
    const highScoreText = document.querySelector(
        "#highScoreText",
    ) as HTMLElement;
	const comboText = document.querySelector('#comboText') as HTMLElement;

    /** User input */

    const keyPress$ = fromEvent<KeyboardEvent>(document, "keydown");
	const keyRelease$ = fromEvent<KeyboardEvent>(document, "keyup")

    const fromKeyPress = (keyCode: Key) =>
        keyPress$.pipe(
			filter(({ code, repeat }) => code === keyCode && !repeat)
		);

	const fromKeyRelease = (keyCode: Key) => 
        keyRelease$.pipe(
			filter(({ code, repeat }) => code === keyCode && !repeat)
		);

	function removeElement<T>(array: ReadonlyArray<T>, element: T) : ReadonlyArray<T> {
		const indexOfElement = array.indexOf(element)
		if (indexOfElement < 0)
			return array
		return [...array.slice(0, indexOfElement), ...array.slice(indexOfElement + 1, array.length)]
	} 

	function insertElement<T>(array: ReadonlyArray<T>, element: T) : ReadonlyArray<T> {
		const indexOfElement = array.indexOf(element)
		if (indexOfElement < 0)
			return array.concat(element)
		// already exist, why does it already exist?
		return array
	} 

	const checkReleaseDetection = (key: lineNames) => (prev: State) => {
		const lineDownPosition = prev.gameFrame[key].clicked
		const lineAssociated = prev.gameFrame[key].lineUp()
		const firstElement = lineAssociated.front()

		if (!firstElement)
			return {
				...prev,
				gameFrame: {
					...prev.gameFrame,
					...({ [key]: lineAssociated })
				},
				music: null
			}

		if (!firstElement.isStream || !firstElement.clicked)
			return {
				...prev,
				gameFrame: {
					...prev.gameFrame,
					...({ [key]: lineAssociated })
				},
				music: null
			}

		// stream is released

		const elementY = firstElement.endY
		// remove node
		const removedLine = {
			[key]: lineAssociated.removeFront().lineUp(elementY)
		}

		const newCombo = prev.data.combo + 1
		const newMultiplier = 1 + (Math.floor(newCombo / 10) * 0.2)

		if (elementY >= Zones.GOOD_ZONE && elementY <= Zones.END_GOOD_ZONE) {
			return {
				...prev,
				gameFrame: {
					...prev.gameFrame,
					...removedLine
				},
				data: {
					...prev.data,
					multiplier: newMultiplier,
					score: prev.data.score + (Constants.BASE_SCORE * newMultiplier),
					combo: newCombo,
					notesPlayed: prev.data.notesPlayed + 1
				},
				stopMusic: firstElement.associatedMusic, 
			}
		}
		else {
			// too early!
			return {
				...prev,
				gameFrame: {
					...prev.gameFrame,
					...{
						[key]: lineAssociated.replaceFront(firstElement.unclick(), firstElement)
					}
				},
				data: {
					...prev.data,
					multiplier: 1,
					combo: 0,
				},
				stopMusic: firstElement.associatedMusic,
			}
		}
	}

	const checkHitDetection = (key: lineNames) => (prev: State) => {
		const lineAssociated = prev.gameFrame[key].lineDown()
		const firstElement = lineAssociated.front()

		if (!firstElement)
			return {
				...prev,
				gameFrame: {
					...prev.gameFrame,
					...({ [key]: lineAssociated })
				},
				music: null
			}

		const elementY = firstElement.y
		const isStream = firstElement.isStream

		if (!(elementY >= Zones.DETECTION_ZONE && elementY <= Zones.END_DETECTION_ZONE))
			return {
				...prev,
				gameFrame: {
					...prev.gameFrame,
					...({ [key]: lineAssociated })
				},
				music: null
			}

		// remove node
		const removedLine = {
			[key]: lineAssociated.removeFront().lineDown(elementY)
		}

		const newCombo = prev.data.combo + 1
		const newMultiplier = 1 + (Math.floor(newCombo / 10) * 0.2)

		if (elementY >= Zones.GOOD_ZONE && elementY <= Zones.END_GOOD_ZONE) {
			const newScores = {
				multiplier: newMultiplier,
				score: prev.data.score + (Constants.BASE_SCORE * newMultiplier),
				combo: newCombo,
			}
			return {
				...prev,
				gameFrame: {
					...prev.gameFrame,
					...((isStream) ? {
						[key]: lineAssociated.replaceFront(firstElement.click(), firstElement)
					} : removedLine)
				},
				data: {
					...prev.data,
					...((isStream) ? {} : newScores),
					notesPlayed: prev.data.notesPlayed + Number((isStream) ? 0 : 1)
				},
				...((isStream) ? 
				{startStream: firstElement.associatedMusic} :
				{music: firstElement.associatedMusic}),
			}
		}
		else {
			// too early!
			return {
				...prev,
				gameFrame: {
					...prev.gameFrame,
					...removedLine
				},
				data: {
					...prev.data,
					multiplier: 1,
					combo: 0,
					notesPlayed: prev.data.notesPlayed + 1
				},
				music: firstElement.associatedMusic.randomPitch(),
			}
		}
	}

	const controlObservable = (keyCode: Key, onkeyPress: (prev: State) => State, onkeyRelease: (prev: State) => State) => {
		const keyRelease$ = fromKeyRelease(keyCode).pipe(
			map(() => (state: State) => ({
				...onkeyRelease(state),
				keyPressed: removeElement(state.keyPressed, keyCode),
			})),
		)

		const keyPress$ = fromKeyPress(keyCode).pipe(
			map(() => (state: State) => ({
				...onkeyPress(state),
				keyPressed: insertElement(state.keyPressed, keyCode),
			})),
		)

		return merge(keyPress$, keyRelease$)
	}

	const control$ = merge(
			controlObservable('KeyS', checkHitDetection('greenLine'), checkReleaseDetection('greenLine')),
			controlObservable('KeyD', checkHitDetection('redLine'), checkReleaseDetection('redLine')),
			controlObservable('KeyJ', checkHitDetection('blueLine'), checkReleaseDetection('blueLine')),
			controlObservable('KeyK', checkHitDetection('yellowLine'), checkReleaseDetection('yellowLine')),
		)

	/** Reading the csv file */
	const processCSV = (csv_contents: string) => {
		return csv_contents
				.split('\n')
				.splice(1) // remove csv header
				.map(line => line.split(','))
				.filter(data => data.length == 6) // ensure no invalid lines
	}

	const appendPlayableNode = (music: AMusic, state: State) => {
		const yEndPosition = -(Note.SPEED * music.duration * 1000) / Constants.TICK_RATE_MS
		const newNode = new ANote(0, yEndPosition, music, music.duration >= 1)
		const { greenLine, redLine, blueLine, yellowLine } = state.gameFrame
		const lines = Array(greenLine, redLine, blueLine, yellowLine)
		const start = music.start

		const availableLines = lines
			.filter(line => {
				if (line.back() === undefined) {
					return true
				}
				const lastDuration = line.back()!.associatedMusic.duration
				const lastStart = line.back()!.associatedMusic.start

				if (line.back()!.isStream)
					return start > lastDuration + lastStart || start < lastStart
				else
					return start != lastStart
			})
		const availableLine = availableLines.at(Math.floor(Math.random() * availableLines.length))

		if (availableLine === undefined) {
			// all 4 lines are full, just play the sound
			return {
				...state,
				data: {
					...state.data,
					notesPlayed: state.data.notesPlayed + 1
				},
				music: music
			}
		}

		// set new line
		const newLine = insertElement(availableLine.line, newNode)

		// determine which type
		const lineNames = ['greenLine', 'redLine', 'blueLine', 'yellowLine']
		const lineIndex = lines.indexOf(availableLine)
		const lineName = lineNames.at(lineIndex)

		if (lineName === undefined)
			return state

		const newLineObj = {
			[lineName]: availableLine.replaceLine(newLine)
		}

		return {
			...state,
			gameFrame: {
				...state.gameFrame,
				...newLineObj
			}
		}
	}

	const createNoteStreamObservable = () => {
		const maxTravelTime = Zones.PERFECT_ZONE / Note.SPEED * Constants.TICK_RATE_MS
		const processedCSV = processCSV(csv_contents)
		const firstNoteStart = Number(processedCSV.at(0)?.at(4))
		const CSVlength = processedCSV.length
		const delayBegin = Math.max(0, maxTravelTime - firstNoteStart)

		return { 
			notesLength: CSVlength,
			noteStream$: from(processedCSV)
			.pipe(
				map(data => new AMusic(
					String(data[0]).toLowerCase() === 'true',
					data[1],
					Number(data[2]),
					Number(data[3]),
					Number(data[4]),
					Number(data[5])
				)),
				mergeMap(value => of(value).pipe(
					(value.played ? 
						delay(((value.start * 1000) - maxTravelTime) + delayBegin) : 
						delay((value.start * 1000) + delayBegin)),
					map(value => (prev: State) =>
						value.played ? appendPlayableNode(value, prev) : {
							...prev,
							data: {
								...prev.data,
								notesPlayed: prev.data.notesPlayed + 1
							},
							music: value
						}
					),
				)),
			)
		}
	}

	const { notesLength, noteStream$ } = createNoteStreamObservable()
	console.log(notesLength)

    /** Determines the rate of time steps */
    const tick$ = interval(Constants.TICK_RATE_MS);

    /**
     * Renders the current state to the canvas.
     *
     * In MVC terms, this updates the View using the Model.
     *
     * @param s Current state
     */

	const darkRedHightlight = document.getElementById('red-highlight'),
	darkYellowHighlight = document.getElementById('yellow-highlight'),
	darkBlueHighlight = document.getElementById('blue-highlight'),
	darkGreenHighlight = document.getElementById('green-highlight'),
	ballSvg = document.getElementById('innerSvg') as SVGElement & HTMLElement

	const renderControls = (s: State) => {
        // Add blocks to the main grid canvas
		s.keyPressed.includes('KeyS') ? 
			darkGreenHighlight?.setAttribute('class', 'selected-highlight') :
			darkGreenHighlight?.setAttribute('class', 'dark-green-highlight')

		s.keyPressed.includes('KeyD') ? 
			darkRedHightlight?.setAttribute('class', 'selected-highlight') :
			darkRedHightlight?.setAttribute('class', 'dark-red-highlight')

		s.keyPressed.includes('KeyJ') ? 
			darkBlueHighlight?.setAttribute('class', 'selected-highlight') :
			darkBlueHighlight?.setAttribute('class', 'dark-blue-highlight')

		s.keyPressed.includes('KeyK') ? 
			darkYellowHighlight?.setAttribute('class', 'selected-highlight') :
			darkYellowHighlight?.setAttribute('class', 'dark-yellow-highlight')
	}

	const renderGameFrame = (s: State) => {
		ballSvg.innerHTML = ''
		// ballSvg.childNodes.forEach(childNodes => childNodes.remove())

		const { greenLine, redLine, blueLine, yellowLine } = s.gameFrame
		const xLocation = ['20%', '40%', '60%', '80%']
		const color = ['green', 'red', 'blue', 'yellow']
		const lines = [ greenLine, redLine, blueLine, yellowLine ]

		const drawOnSVG = (color: string, cx: string) => (y: number) => {
			ballSvg.appendChild(createSvgElement(ballSvg.namespaceURI, "circle", {
				r: `${Note.RADIUS}`,
				cx: `${cx}`,
				cy: `${y}`,
				style: `fill: ${color}`,
				class: "shadow",
			}));
		}

		const drawBarSVG =  (color: string, cx: string) => (startY: number, endY: number) => {
			ballSvg.appendChild(createSvgElement(ballSvg.namespaceURI, "line", {
				x1: `${cx}`,
				x2: `${cx}`,
				y1: `${startY}`,
				y2: `${endY}`,
				stroke: `${color}`,
				'stroke-width': `${Bar.width}`
			}))
		} 

		lines.forEach(
			(line, lineIndex) => line.line.forEach(
				(node, nodeIndex, nodesArr) => {
					drawOnSVG(color[lineIndex], xLocation[lineIndex])(Math.min(node.y, Viewport.UNRENDER_THRESHOLD))
					if (node.isStream) {
						drawBarSVG(color[lineIndex], xLocation[lineIndex])(Math.min(node.y, Viewport.UNRENDER_THRESHOLD), node.endY)
						drawOnSVG(color[lineIndex], xLocation[lineIndex])(node.endY)
					}
				}
			)
		)
	}

	const renderData = (s: State) => {
		scoreText.innerText = String(s.data.score)
		comboText.innerText = String(s.data.combo)
		multiplier.innerText = String(s.data.multiplier)
	}

	const musicPlayer = (s: State) => {
		if (s.music)
			s.music.playSound()
		if (s.startStream)
			s.startStream.startStream()
		if (s.stopMusic)
			s.stopMusic.stopSound()
	}

	const render = (s: State) => {
		renderControls(s)
		renderGameFrame(s)
		renderData(s)
		musicPlayer(s)
	};

	const missedLine = (prev: AGameFrame) => 
		Array(prev.greenLine, prev.redLine, prev.blueLine, prev.yellowLine)
		.reduce(
			(missed, line) => 
				missed + (line.front() ? 
				Number(line.front()!.y > Zones.END_DETECTION_ZONE) : 
				0),
		0)

	const unrenderedNodes = (prev: AGameFrame) => 
		Array(prev.greenLine, prev.redLine, prev.blueLine, prev.yellowLine)
		.reduce(
			(missed, line) => 
				missed + (line.front() ? Number(
					(line.front()!.isStream ? line.front()!.endY : line.front()!.y) > Viewport.UNRENDER_THRESHOLD
				) : 0),
		0)

	const tickGameFrame = (prev: AGameFrame) => new AGameFrame(
			prev.greenLine.tick(),
			prev.redLine.tick(),
			prev.blueLine.tick(),
			prev.yellowLine.tick()
		)

	const tick = (prev: State) => {
		const unrenderedCount = unrenderedNodes(prev.gameFrame)
		const missedCount = missedLine(prev.gameFrame)
		return {
			...prev,
			gameEnd: prev.data.notesPlayed >= prev.data.totalNodes,
			gameFrame: tickGameFrame(prev.gameFrame),

			data: {
				...prev.data,
				multiplier: missedCount ? 1 : prev.data.multiplier,
				combo: missedCount ? 0 : prev.data.combo,
				notesPlayed: prev.data.notesPlayed + unrenderedCount
			},

			music: null,
			startStream: null, 
			stopMusic: null
		}
	}

    const source$ = tick$
        .pipe(
			map(() => tick),
			mergeWith(control$, noteStream$),
			scan((prevState: State, modifier: (prev: State) => State) => modifier(prevState), initialState(notesLength)),
			// tap((value) => console.log(value.data.notesPlayed))
		)
        .subscribe((s: State) => {
            render(s);

            if (s.gameEnd) {
                show(gameover);
            } else {
                hide(gameover);
            }
        });
}

// Load in the instruments and then start your game!
export const samples = SampleLibrary.load({
	instruments: [
		"bass-electric",
		"bassoon",
		"cello",
		"clarinet",
		"contrabass",
		"flute",
		"french-horn",
		"guitar-acoustic",
		"guitar-electric",
		"guitar-nylon",
		"harmonium",
		"harp",
		"organ",
		"piano",
		"saxophone",
		"trombone",
		"trumpet",
		"tuba",
		"violin",
		"xylophone"
	], // SampleLibrary.list,
	baseUrl: "samples/",
});

// The following simply runs your main function on window load.  Make sure to leave it in place.
// You should not need to change this, beware if you are.
if (typeof window !== "undefined") {
    const start_game = (contents: string) => {
        document.body.addEventListener(
            "mousedown",
            function () {
				console.log('Starting the Game')
                main(contents);
            },
            { once: true },
        );
    };

    const { protocol, hostname, port } = new URL(import.meta.url);
    const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

    Tone.ToneAudioBuffer.loaded().then(() => {
        for (const instrument in samples) {
            samples[instrument].toDestination();
            samples[instrument].release = 0.5;
        }
		fetch(`${baseUrl}/assets/${Constants.SONG_NAME}.csv`)
			.then((response) => response.text())
			.then((text) => start_game(text))
			.catch((error) =>
				console.error("Error fetching the CSV file:", error),
			);
    });
}
