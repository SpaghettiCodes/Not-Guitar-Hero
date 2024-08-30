/** Rendering (side effects) */

import {
    fromEvent,
    map,
    merge,
    Observable,
    scan,
    Subscription,
} from "rxjs";
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
    SampleLibraryType,
    State,
} from "./types";
import {
    createClickStream,
    createKeyboardStream,
    createNoteStream,
    createTickStream,
    fromKeyPress,
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
    sampleLibary: SampleLibraryType,
    sourceSubscription: Subscription,
) {
    if (s.gameEnd) {
        sourceSubscription.unsubscribe();
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

    // sets required attributes, creates necessary Observables, and merge and subscribes to the observables
    const generateGame = (csv_contents: string): Subscription => {
        showGame();

        svg.setAttribute("height", `${ViewportConstants.CANVAS_HEIGHT}`);
        svg.setAttribute("width", `${ViewportConstants.CANVAS_WIDTH}`);

        const resetState = (prev: State): State => ({
            ...prev,
            music: null,
        });

        const control$ = createKeyboardStream(),
            { playingInstrument, noteStream$ } = createNoteStream(csv_contents),
            tick$ = createTickStream();

        const source$ = merge(tick$, control$, noteStream$)
            .pipe(
                scan(
                    (prevState: State, modifier: (prev: State) => State) => ({
                        ...modifier(resetState(prevState)),
                        rng: nextNumber(prevState.rng),
                    }),
                    initialState(playingInstrument),
                ),
            )
            .subscribe((s: State) => {
                renderGameFrame(s, sampleLibary, source$);
            });
        return source$;
    };

    type gameSourceData = Readonly<{
        sourceStream: Subscription;

        leave: boolean;
        retry: boolean;

        prevSourceStream: Subscription | null;
    }>;

    // initial Observables and statuses
    const initialSources = (csv_contents: string): gameSourceData => ({
        sourceStream: generateGame(csv_contents),
        leave: false,
        retry: false,
        prevSourceStream: null,
    });

    // creates a Observable that serves as a 'back button' listener.
    const backButton = (): Observable<
        (prev: gameSourceData) => gameSourceData
    > =>
        merge(
            fromKeyPress("Escape"),
            createClickStream(
                document.getElementById("backButton") as HTMLElement,
            ),
        ).pipe(
            map(
                () =>
                    (prev: gameSourceData): gameSourceData => ({
                        ...prev,
                        leave: true,
                        retry: false,
                    }),
            ),
        );

    // creates a Observable that serves as a 'retry button' listener
    const retryButton = (
        csv_contents: string,
    ): Observable<(prev: gameSourceData) => gameSourceData> =>
        merge(
            fromKeyPress("KeyR"),
            createClickStream(
                document.getElementById("retryButton") as HTMLElement,
            ),
        ).pipe(
            map(
                // this creates a new source stream, which replaces the old
                // source stream. The old source stream is then passed into
                // subscribe to be unsubscribed from
                () =>
                    (prev: gameSourceData): gameSourceData => ({
                        ...prev,
                        sourceStream: generateGame(csv_contents),
                        prevSourceStream: prev.sourceStream,
                        leave: false,
                        retry: true,
                    }),
            ),
        );

    // merges the two 'retry' and 'back' streams into one stream, and subscribes to it
    const linkButtons = (csv_contents: string): undefined => {
        const stream = merge(retryButton(csv_contents), backButton())
            .pipe(
                scan(
                    (prev, modifier) => modifier(prev),
                    initialSources(csv_contents),
                ),
            )
            .subscribe((data) => {
                if (data.leave) {
                    // cleanup
                    data.sourceStream.unsubscribe();
                    stream.unsubscribe();
                    showSongSelection();
                } else if (data.retry && data.prevSourceStream) {
                    // unsubscribe from the previous stream
                    data.prevSourceStream.unsubscribe();
                }
            });
    };

    fetch(`${baseUrl}/assets/${songName}.csv`)
        .then((response) => {
            if (!response.ok) throw response.statusText;
            return response.text();
        })
        .then((text) => linkButtons(text))
        .catch((error) => {
            console.error("Error fetching the CSV file:", error),
                showSongSelection();
        });
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

    const datas = sortedSongList.map((songName): Observable<string> => {
        const menuDiv = document.createElement("div");
        menuDiv.setAttribute("class", "menu_item");
        menuDiv.innerText = songName;
        menu.appendChild(menuDiv);

        const menu$ = fromEvent(menuDiv, "click").pipe(map(() => songName));

        return menu$;
    });

    const listener$ = merge(...datas).subscribe((songName: string): undefined => {
        showLoading();
        renderGame(songName, sample);
    });
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
