/** Rendering (side effects) */

import {
    fromEvent,
    map,
    merge,
    Observable,
    scan,
    Subscription,
    tap,
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
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement | HTMLElement) => {
    elem instanceof SVGGraphicsElement
        ? elem.setAttribute("visibility", "visible")
        : elem.setAttribute("class", "");

    elem.parentNode!.appendChild(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
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

function renderControls(s: State): undefined {
    // Add blocks to the main grid canvas
    const controlArray = Array(
        greenControl,
        redControl,
        blueControl,
        yellowControl,
    );
    const helpArray = Array(greenHelp, redHelp, blueHelp, yellowHelp);
    const colorNames = Array("green", "red", "blue", "yellow");

    const highlightControls = (
        controlDom: HTMLElement,
        helpDom: HTMLElement,
        color: string,
    ): undefined => {
        controlDom.setAttribute("class", `selected-highlight-${color}`);
        helpDom.setAttribute("class", `heavy help-highlight-${color}`);
    };

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

const multipler = document.getElementById("multiplierText") as HTMLElement,
    scoreText = document.getElementById("scoreText") as HTMLElement,
    comboText = document.getElementById("comboText") as HTMLElement,
    accuracyText = document.getElementById("accuracyText") as HTMLElement;

function renderData(s: State): undefined {
    scoreText.innerText = String(s.data.score);
    comboText.innerText = String(s.data.combo);
    multipler.innerText = String(s.data.multiplier) + "x";
    accuracyText.textContent =
        calculateAccuracy(s.data.hitNotes, s.data.totalNotes).toFixed(4) + "%";
	// accuracyText.textContent = `${s.data.hitNotes} | ${s.data.totalNotes}`
}

function renderBallFrame(s: State): undefined {
    ballSvg.innerHTML = "";

    const { greenLine, redLine, blueLine, yellowLine } = s.gameFrame;
    const xLocation = ["20%", "40%", "60%", "80%"];
    const color = ["green", "red", "blue", "yellow"];
    const lines = [greenLine, redLine, blueLine, yellowLine];

    const drawOnSVG = (color: string, cx: string) => (y: number) => {
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

    const renderNode = (color: string, cx: string) => (node: Note) => {
        drawOnSVG(
            color,
            cx,
        )(Math.min(node.y, ViewportConstants.UNRENDER_THRESHOLD));
        if (node.isStream) {
            drawBarSVG(color, cx)(
                Math.min(node.y, ViewportConstants.UNRENDER_THRESHOLD),
                node.endY,
            );
            drawOnSVG(color, cx)(node.endY);
        }
    };

    lines.forEach((line, lineIndex) =>
        line.line.forEach(renderNode(color[lineIndex], xLocation[lineIndex])),
    );
}

function musicPlayer(s: State, sampleLibary: SampleLibraryType) {
    if (s.music !== null) s.music(sampleLibary);
}

const gameOver = document.getElementById("gameOver") as SVGGraphicsElement &
        HTMLElement,
    gameOverText = document.getElementById(
        "gameOverText",
    ) as SVGGraphicsElement & HTMLElement;

function showEndScreen(data: GameData) {
    show(gameOver);
    gameOverText.textContent =
        data.hitNotes === data.totalNotes ? "Full Clear" : "Game Over";
}

function renderGameFrame(s: State, sampleLibary: SampleLibraryType, sourceSubscription: Subscription) {
    if (s.gameEnd) {
		sourceSubscription.unsubscribe()
        showEndScreen(s.data);
    } else {
        hide(gameOver);
        renderControls(s);
        renderBallFrame(s);
        renderData(s);
        musicPlayer(s, sampleLibary);
    }
}

const svg = document.getElementById("svgCanvas") as SVGGraphicsElement &
    HTMLElement;

function renderGame(songName: string, sampleLibary: SampleLibraryType) {
    const { protocol, hostname, port } = new URL(import.meta.url);
    const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

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

    type streamData = Readonly<{
        sourceStream: Subscription;

        leave: boolean;
        retry: boolean;

        prevSourceStream: Subscription | null;
    }>;

    const initialValue = (csv_contents: string): streamData => ({
        sourceStream: generateGame(csv_contents),
        leave: false,
        retry: false,
        prevSourceStream: null,
    });

    const backButton = (): Observable<(prev: streamData) => streamData> => {
        return merge(
            fromKeyPress("Escape"),
            createClickStream(
                document.getElementById("backButton") as HTMLElement,
            ),
        ).pipe(
            map(
                () =>
                    (prev: streamData): streamData => ({
                        ...prev,
                        leave: true,
                        retry: false,
                    }),
            ),
        );
    };

    const retryButton = (
        csv_contents: string,
    ): Observable<(prev: streamData) => streamData> => {
        return merge(
            fromKeyPress("KeyR"),
            createClickStream(
                document.getElementById("retryButton") as HTMLElement,
            ),
        ).pipe(
            map(
                () =>
                    (prev: streamData): streamData => ({
                        ...prev,
                        sourceStream: generateGame(csv_contents),
                        prevSourceStream: prev.sourceStream,
                        leave: false,
                        retry: true,
                    }),
            ),
        );
    };

    const linkButtons = (csv_contents: string): undefined => {
        const stream = merge(retryButton(csv_contents), backButton())
            .pipe(
                scan(
                    (prev, modifier) => modifier(prev),
                    initialValue(csv_contents),
                ),
            )
            .subscribe((data) => {
                if (data.leave) {
                    data.sourceStream.unsubscribe();
                    stream.unsubscribe();
                    showSongSelection();
                } else if (data.retry && data.prevSourceStream) {
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

function showGame() {
    hide(document.getElementById("loading") as HTMLElement);
    hide(document.getElementById("menu-main") as HTMLElement);
    show(document.getElementById("game") as HTMLElement);
}

/** Rendering for song selection screen */

function renderSongSelection(sample: SampleLibraryType) {
    const menu = document.getElementById("menu")!;

    const sortedSongList = sorted(
        SONG_LIST,
        (a) => (b) => a.toLowerCase() >= b.toLowerCase(),
    );

    const datas = sortedSongList.map((songName) => {
        const menuDiv = document.createElement("div");
        menuDiv.setAttribute("class", "menu_item");
        menuDiv.innerText = songName;
        menu.appendChild(menuDiv);

        const menu$ = fromEvent(menuDiv, "click").pipe(map(() => songName));

        return menu$;
    });

    const listener$ = merge(...datas).subscribe((songName) => {
        showLoading();
        renderGame(songName, sample);
    });
}

function showSongSelection() {
    hide(document.getElementById("loading") as HTMLElement);
    hide(document.getElementById("game") as HTMLElement);
    show(document.getElementById("menu-main") as HTMLElement);
}

function showLoading() {
    hide(document.getElementById("game") as HTMLElement);
    hide(document.getElementById("menu-main") as HTMLElement);
    show(document.getElementById("loading") as HTMLElement);
}

export { renderSongSelection, showSongSelection, showLoading };
