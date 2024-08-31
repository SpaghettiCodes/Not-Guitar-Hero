/** Rendering (side effects) */

import { from, fromEvent, map, merge, Observable, of, reduce, scan, Subscription, switchMap } from "rxjs";
import {
    BarConstants,
    NoteConstants,
    SONG_LIST,
    ViewportConstants,
} from "./constants";
import {
    GameData,
    initialState,
    Key,
    nextNumber,
    Note,
    resetState,
    SampleLibraryType,
    State,
} from "./types";
import {
    backButton,
    createKeyboardStream,
    createNoteStream,
    createTickStream,
    retryButton,
} from "./observable";
import { calculateAccuracy, sorted } from "./util";

/**
 * Renders the current state to the canvas.
 *
 * In MVC terms, this updates the View using the Model.
 *
 * @param s Current state
 */

/**
 * Displays a SVG element OR HTML element on the canvas. Brings to foreground.
 * @param elem SVG | HTML element to display
 */
const show = (elem: SVGGraphicsElement | HTMLElement) => {
    elem instanceof SVGGraphicsElement
        ? elem.setAttribute("visibility", "visible")
        : elem.setAttribute("class", "");

    elem.parentNode!.appendChild(elem);
};

/**
 * Hides a SVG OR HTML element on the canvas.
 * @param elem SVG | HTML element to hide
 */
const hide = (elem: SVGGraphicsElement | HTMLElement) =>
    elem instanceof SVGGraphicsElement
        ? elem.setAttribute("visibility", "hidden")
        : elem.setAttribute("class", "hide");

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
): SVGElement => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
};

/** Control Buttons */
const redControl = document.getElementById("red") as SVGElement & HTMLElement,
    yellowControl = document.getElementById("yellow") as SVGElement &
        HTMLElement,
    blueControl = document.getElementById("blue") as SVGElement & HTMLElement,
    greenControl = document.getElementById("green") as SVGElement & HTMLElement;

/** Falling ball SVG Container */
const ballSvg = document.getElementById("innerSvg") as SVGElement & HTMLElement;

/** Rendering for game Controls*/
const redHelp = document.getElementById("red-text") as SVGElement & HTMLElement,
    yellowHelp = document.getElementById("yellow-text") as SVGElement &
        HTMLElement,
    blueHelp = document.getElementById("blue-text") as SVGElement & HTMLElement,
    greenHelp = document.getElementById("green-text") as SVGElement &
        HTMLElement;

// renders the highlights for the controls
function renderControls(s: State): undefined {
    const controlArray = Array(
        greenControl,
        redControl,
        blueControl,
        yellowControl,
    );
    const helpArray = Array(greenHelp, redHelp, blueHelp, yellowHelp);
    const colorNames = Array("green", "red", "blue", "yellow");

    // highlights a control
    const highlightControls = (
        controlDom: HTMLElement,
        helpDom: HTMLElement,
        color: string,
    ): undefined => {
        controlDom.setAttribute("class", `selected-highlight-${color}`);
        helpDom.setAttribute("class", `heavy help-highlight-${color}`);
    };

    // removes highlights from a control
    const unhighlightControls = (
        controlDom: HTMLElement,
        helpDom: HTMLElement,
    ): undefined => {
        controlDom.setAttribute("class", "");
        helpDom.setAttribute("class", "heavy");
    };

    Array("KeyS", "KeyD", "KeyJ", "KeyK").forEach((value, valueIndex) => {
        s.keyPressed.includes(value as Key)
            ? highlightControls(
                  controlArray.at(valueIndex)!,
                  helpArray.at(valueIndex)!,
                  colorNames.at(valueIndex)!,
              )
            : unhighlightControls(
                  controlArray.at(valueIndex)!,
                  helpArray.at(valueIndex)!,
              );
    });
}

// User score elements
const multipler = document.getElementById("multiplierText") as HTMLElement,
    scoreText = document.getElementById("scoreText") as HTMLElement,
    comboText = document.getElementById("comboText") as HTMLElement,
    accuracyText = document.getElementById("accuracyText") as HTMLElement;

// Renders the user data
function renderData(s: State): undefined {
    scoreText.innerText = String(s.data.score);
    comboText.innerText = String(s.data.combo);
    multipler.innerText = String(s.data.multiplier) + "x";
    accuracyText.textContent =
        calculateAccuracy(s.data.hitNotes, s.data.totalNotes).toFixed(4) + "%";
    // accuracyText.textContent = `${s.data.hitNotes} | ${s.data.totalNotes}`
}

// renders the falling circles
function renderBallFrame(s: State): undefined {
    ballSvg.innerHTML = "";

    const { greenLine, redLine, blueLine, yellowLine } = s.gameFrame;
    const xLocation = ["20%", "40%", "60%", "80%"];
    const color = ["green", "red", "blue", "yellow"];
    const lines = [greenLine, redLine, blueLine, yellowLine];

    // draws a circle svg
    const drawCircleSVG = (color: string, cx: string) => (y: number) => {
        ballSvg.appendChild(
            createSvgElement(ballSvg.namespaceURI, "circle", {
                r: `${NoteConstants.RADIUS}`,
                cx: `${cx}`,
                cy: `${y}`,
                style: `fill: ${color}`,
                class: "shadow",
            }),
        );
    };

    // draws a bar svg
    const drawBarSVG =
        (color: string, cx: string) => (startY: number, endY: number) => {
            ballSvg.appendChild(
                createSvgElement(ballSvg.namespaceURI, "line", {
                    x1: `${cx}`,
                    x2: `${cx}`,
                    y1: `${startY}`,
                    y2: `${endY}`,
                    stroke: `${color}`,
                    "stroke-width": `${BarConstants.width}`,
                }),
            );
        };

    // curried function that draws the node on a specific x location with a specific color
    const renderNode = (color: string, cx: string) => (node: Note) => {
        drawCircleSVG(
            color,
            cx,
        )(Math.min(node.y, ViewportConstants.UNRENDER_THRESHOLD));
        if (node.isStream) {
            drawBarSVG(color, cx)(
                Math.min(node.y, ViewportConstants.UNRENDER_THRESHOLD),
                node.endY,
            );
            drawCircleSVG(color, cx)(node.endY);
        }
    };

    lines.forEach((line, lineIndex) =>
        line.line.forEach(renderNode(color[lineIndex], xLocation[lineIndex])),
    );
}

// plays the music
function musicPlayer(s: State, sampleLibary: SampleLibraryType) {
    if (s.music !== null) s.music(sampleLibary);
    if (s.outofboundmusic.length !== 0)
        s.outofboundmusic.forEach((musicFunc) => musicFunc(sampleLibary));
}

// game over elements
const gameOver = document.getElementById("gameOver") as SVGGraphicsElement &
        HTMLElement,
    gameOverText = document.getElementById(
        "gameOverText",
    ) as SVGGraphicsElement & HTMLElement;

// shows the end screen, as well as the message based on the user performance
function showEndScreen(data: GameData) {
    show(gameOver);
    gameOverText.textContent =
        data.hitNotes === data.totalNotes ? "Full Clear" : "Game Over";
}

// renders the game frame based on data in state
// sourceSubscription is needed to properly unsubscribe from the Subsription when the game ends
function renderGameFrame(
    s: State,
    sampleLibary: SampleLibraryType
) {
    if (s.gameEnd) {
        showEndScreen(s.data);
    } else {
        hide(gameOver);
        renderControls(s);
        renderBallFrame(s);
        renderData(s);
        musicPlayer(s, sampleLibary);
    }
}

// the main svg frame
const svg = document.getElementById("svgCanvas") as SVGGraphicsElement &
    HTMLElement;

// renders the Game Screen, given the songName
function renderGame(
    songName: string,
    sampleLibary: SampleLibraryType,
): undefined {
    const { protocol, hostname, port } = new URL(import.meta.url);
    const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

    // sets required attributes, creates necessary Observables for the game
    // and merge and subscribes to the observables
    const generateGame = (csv_contents: string): undefined => {
        showGame();

        svg.setAttribute("height", `${ViewportConstants.CANVAS_HEIGHT}`);
        svg.setAttribute("width", `${ViewportConstants.CANVAS_WIDTH}`);

        const control$ = createKeyboardStream(),
            { playingInstrument, noteStream$ } = createNoteStream(csv_contents),
            tick$ = createTickStream();

        const source$ = merge(
            tick$,
            control$,
            noteStream$,
            retryButton(),
            backButton(),
        )
            .pipe(
                scan(
                    (prevState: State, modifier: (prev: State) => State) => ({
                        ...modifier(resetState(prevState)),
                        rng: nextNumber(prevState.rng),
                    }),
                    initialState(playingInstrument),
                ),
            )
            .subscribe({
                next: (s: State) => {
                    if (s.data.leave) {
                        source$.unsubscribe();
                        showSongSelection();
                    } else if (s.data.retry) {
                        source$.unsubscribe();
                        renderGame(songName, sampleLibary);
                    } else {
                        renderGameFrame(s, sampleLibary);
                    }
                },
            });
    };

	// observable to grab the csv content
	// so sorry that this isnt in observable.ts, this was last minute work
	from(fetch(`${baseUrl}/assets/${songName}.csv`)).pipe(
		switchMap(
			(response) => response.ok ? 
			from(response.text())
			.pipe(
				reduce((acc, text) => acc + text, ""),
				// this returns a function which has side effect
				// which would be ran in subscribe
				map((string) => () => generateGame(string))
			) : 
			of(response.statusText)
			.pipe(
				// this also
				map((err) => () => {
					console.error('Error fetching CSV File')
					showSongSelection()
				})
			)
		),
	).subscribe({
		next: (runner) => runner(),
		error: () => {
			console.error("Error fetching the CSV file"),
			showSongSelection();
		}
	})
}

// hides other elements, display the game frame
function showGame() {
    hide(document.getElementById("loading") as HTMLElement);
    hide(document.getElementById("menu-main") as HTMLElement);
    show(document.getElementById("game") as HTMLElement);
}

// renders the song selection screen
function renderSongSelection(sample: SampleLibraryType): undefined {
    const menu = document.getElementById("menu")!;

    const sortedSongList = sorted(
        SONG_LIST,
        (a) => (b) => a.toLowerCase() >= b.toLowerCase(),
    );

	const divs = sortedSongList.map((songName: string) => { 
        const menuDiv = document.createElement("div");
        menuDiv.setAttribute("class", "menu_item");
        menuDiv.innerText = songName;
		menu.appendChild(menuDiv)
		return menuDiv
	})

    const datas = divs.map((div: HTMLElement): Observable<string> => fromEvent(div, "click").pipe(map(() => div.innerText)))

    merge(...datas).subscribe(
        (songName: string): undefined => {
            showLoading();
            renderGame(songName, sample);
        },
    );
}

// hides every other element, shows the main menu (song selection) screen
function showSongSelection() {
    hide(document.getElementById("loading") as HTMLElement);
    hide(document.getElementById("game") as HTMLElement);
    show(document.getElementById("menu-main") as HTMLElement);
}

// hides every other element, shows the loading screen
function showLoading() {
    hide(document.getElementById("game") as HTMLElement);
    hide(document.getElementById("menu-main") as HTMLElement);
    show(document.getElementById("loading") as HTMLElement);
}

export { renderSongSelection, showSongSelection, showLoading };
