/** Rendering (side effects) */

import { fromEvent, map, merge, sample, scan, tap } from "rxjs";
import { BarConstants, NoteConstants, SONG_LIST, ViewportConstants } from "./constants";
import { initialState, playSound, SampleLibraryType, startSound, State, stopSound } from "./types";
import { createKeyboardStream, createNoteStream, createTickStream } from "./observable";

/**
 * Renders the current state to the canvas.
 *
 * In MVC terms, this updates the View using the Model.
 *
 * @param s Current state
 */

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement | HTMLElement) => {
	elem instanceof SVGGraphicsElement ? 
	elem.setAttribute("visibility", "visible") : 
	elem.setAttribute('class', '')
    
	elem.parentNode!.appendChild(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGGraphicsElement | HTMLElement) =>
	elem instanceof SVGGraphicsElement ?
	elem.setAttribute("visibility", "hidden"):
	elem.setAttribute('class', 'hide')

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

/** Control Buttons */
const
	redControl = document.getElementById('red') as SVGElement & HTMLElement,
	yellowControl = document.getElementById('yellow') as SVGElement & HTMLElement,
	blueControl = document.getElementById('blue') as SVGElement & HTMLElement,
	greenControl = document.getElementById('green') as SVGElement & HTMLElement

/** Falling ball SVG Container */
const ballSvg = document.getElementById('innerSvg') as SVGElement & HTMLElement

/** Rendering for game screen */

function renderControls (s: State) {
	// Add blocks to the main grid canvas
	s.keyPressed.includes('KeyS') ? 
	greenControl.setAttribute('class', 'selected-highlight-green') :
	greenControl.setAttribute('class', '')

	s.keyPressed.includes('KeyD') ? 
	redControl.setAttribute('class', 'selected-highlight-red') :
	redControl.setAttribute('class', '')

	s.keyPressed.includes('KeyJ') ? 
	blueControl.setAttribute('class', 'selected-highlight-blue') :
	blueControl.setAttribute('class', '')

	s.keyPressed.includes('KeyK') ? 
	yellowControl.setAttribute('class', 'selected-highlight-yellow') :
	yellowControl.setAttribute('class', '')
}

const multipler = document.getElementById('multiplierText') as HTMLElement,
	scoreText = document.getElementById('scoreText') as HTMLElement,
	comboText = document.getElementById('comboText') as HTMLElement

function renderData(s: State) {
	scoreText.innerText = String(s.data.score)
	comboText.innerText = String(s.data.combo)
	multipler.innerText = String(s.data.multiplier) + 'x'
}

function renderBallFrame(s: State) {
	ballSvg.innerHTML = ''
	// ballSvg.childNodes.forEach(childNodes => childNodes.remove())

	const { greenLine, redLine, blueLine, yellowLine } = s.gameFrame
	const xLocation = ['20%', '40%', '60%', '80%']
	const color = ['green', 'red', 'blue', 'yellow']
	const lines = [ greenLine, redLine, blueLine, yellowLine ]

	const drawOnSVG = (color: string, cx: string) => (y: number) => {
		ballSvg.appendChild(createSvgElement(ballSvg.namespaceURI, "circle", {
			r: `${NoteConstants.RADIUS}`,
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
			'stroke-width': `${BarConstants.width}`
		}))
	} 

	lines.forEach(
		(line, lineIndex) => line.line.forEach(
			(node) => {
				drawOnSVG(color[lineIndex], xLocation[lineIndex])(Math.min(node.y, ViewportConstants.UNRENDER_THRESHOLD))
				if (node.isStream) {
					drawBarSVG(color[lineIndex], xLocation[lineIndex])(Math.min(node.y, ViewportConstants.UNRENDER_THRESHOLD), node.endY)
					drawOnSVG(color[lineIndex], xLocation[lineIndex])(node.endY)
				}
			}
		)
	)
}

function musicPlayer(s: State, sampleLibary: SampleLibraryType) {
	if (s.music)
		playSound(s.music, sampleLibary)
	if (s.startStream)
		startSound(s.startStream, sampleLibary)
	if (s.stopMusic)
		stopSound(s.stopMusic, sampleLibary)
}

const gameOver = document.getElementById('gameOver') as SVGGraphicsElement & HTMLElement

function renderGameFrame(s: State, sampleLibary: SampleLibraryType) {
	if (s.gameEnd) {
		show(gameOver)
	} else {
		hide(gameOver)
		renderControls(s)
		renderBallFrame(s)
		renderData(s)
		musicPlayer(s, sampleLibary)
	}
}

const svg = document.getElementById('svgCanvas') as SVGGraphicsElement & HTMLElement

function renderGame(songName: string, sampleLibary: SampleLibraryType) {
	const { protocol, hostname, port } = new URL(import.meta.url);
	const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

	const generateGame = (csv_contents: string, sampleLibary: SampleLibraryType) => {
		showGame()
	
		svg.setAttribute('height', `${ViewportConstants.CANVAS_HEIGHT}`)
		svg.setAttribute('width', `${ViewportConstants.CANVAS_WIDTH}`)	
	
		hide(document.getElementById('menu-main') as HTMLElement)
		show(document.getElementById('game') as HTMLElement)
	
		const control$ = createKeyboardStream(),
			noteStream$ = createNoteStream(csv_contents),
			tick$ = createTickStream()

	
		const source$ = merge(tick$, control$, noteStream$).pipe(
			scan((prevState: State, modifier: (prev: State) => State) => modifier(prevState), initialState)
		).subscribe((s: State) => {
			renderGameFrame(s, sampleLibary)
		})

		fromEvent(document.getElementById('backButton') as HTMLElement, 'click')
		.pipe()
		.subscribe(() => {
			source$.unsubscribe()
			showSongSelection()
		})
	}

	fetch(`${baseUrl}/assets/${songName}.csv`)
		.then((response) => {
			if (!response.ok)
				throw response.statusText
			return response.text()
		})
		.then((text) => generateGame(text, sampleLibary))
		.catch((error) => {
				console.error("Error fetching the CSV file:", error),
				showSongSelection()
			}
		);
}

function showGame() {
	hide(document.getElementById('menu-main') as HTMLElement)
	show(document.getElementById('game') as HTMLElement)
}

/** Rendering for song selection screen */

function renderSongSelection(sample: SampleLibraryType) {
	const menu = document.getElementById('menu')!

	const datas = SONG_LIST.map(songName => {
		const menuDiv = document.createElement('div')
		menuDiv.setAttribute('class', 'menu_item')
		menuDiv.innerText = songName
		menu.appendChild(menuDiv)

		const menu$ = fromEvent(menuDiv, 'click')
		.pipe(
			map(() => songName)
		)

		return menu$
	})

	const listener$ = merge(...datas)
	.subscribe(
		(songName) => {
			renderGame(songName, sample)
		}
	)

}

function showSongSelection() {
	hide(document.getElementById('game') as HTMLElement)
	show(document.getElementById('menu-main') as HTMLElement)
}

export { renderSongSelection, showSongSelection }