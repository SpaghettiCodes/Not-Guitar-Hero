/** Hide / show svgCanvas*/

// Canvas elements
const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
    HTMLElement;
const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
    HTMLElement;

const menu = document.getElementById("menu-main") as HTMLElement;
const game = document.getElementById("game") as HTMLElement;

hide(menu);
show(game);

svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);

/** Clicking Keys */

// Text fields
const multiplier = document.querySelector("#multiplierText") as HTMLElement;
const scoreText = document.querySelector("#scoreText") as HTMLElement;
const highScoreText = document.querySelector("#highScoreText") as HTMLElement;
const comboText = document.querySelector("#comboText") as HTMLElement;

const keyPress$ = fromEvent<KeyboardEvent>(document, "keydown");
const keyRelease$ = fromEvent<KeyboardEvent>(document, "keyup");

const fromKeyPress = (keyCode: Key) =>
    keyPress$.pipe(filter(({ code, repeat }) => code === keyCode && !repeat));

const fromKeyRelease = (keyCode: Key) =>
    keyRelease$.pipe(filter(({ code, repeat }) => code === keyCode && !repeat));

function removeElement<T>(
    array: ReadonlyArray<T>,
    element: T,
): ReadonlyArray<T> {
    const indexOfElement = array.indexOf(element);
    if (indexOfElement < 0) return array;
    return [
        ...array.slice(0, indexOfElement),
        ...array.slice(indexOfElement + 1, array.length),
    ];
}

function insertElement<T>(
    array: ReadonlyArray<T>,
    element: T,
): ReadonlyArray<T> {
    const indexOfElement = array.indexOf(element);
    if (indexOfElement < 0) return array.concat(element);
    // already exist, why does it already exist?
    return array;
}

const checkReleaseDetection = (key: lineNames) => (prev: State) => {
    const lineDownPosition = prev.gameFrame[key].clicked;
    const lineAssociated = prev.gameFrame[key].lineUp();
    const firstElement = lineAssociated.front();

    if (!firstElement)
        return {
            ...prev,
            gameFrame: {
                ...prev.gameFrame,
                [key]: lineAssociated,
            },
            music: null,
        };

    if (!firstElement.isStream || !firstElement.clicked)
        return {
            ...prev,
            gameFrame: {
                ...prev.gameFrame,
                [key]: lineAssociated,
            },
            music: null,
        };

    // stream is released

    const elementY = firstElement.endY;

    const newCombo = prev.data.combo + 1;
    const newMultiplier =
        1 + Number((Math.floor(newCombo / 10) * 0.2).toFixed(1));

    if (elementY >= Zones.GOOD_ZONE && elementY <= Zones.END_GOOD_ZONE) {
        // remove element
        return {
            ...prev,
            gameFrame: {
                ...prev.gameFrame,
                [key]: lineAssociated.removeFront().lineUp(elementY),
            },
            data: {
                ...prev.data,
                multiplier: newMultiplier,
                score: prev.data.score + Constants.BASE_SCORE * newMultiplier,
                combo: newCombo,
            },
            stopMusic: firstElement.associatedMusic,
        };
    } else {
        // too early!
        return {
            ...prev,
            gameFrame: {
                ...prev.gameFrame,
                [key]: lineAssociated.replaceFront(
                    firstElement.unclick(),
                    firstElement,
                ),
            },
            data: {
                ...prev.data,
                multiplier: 1,
                combo: 0,
            },
            stopMusic: firstElement.associatedMusic,
        };
    }
};

const checkHitDetection = (key: lineNames) => (prev: State) => {
    const lineAssociated = prev.gameFrame[key].lineDown();
    const firstElement = lineAssociated.front();

    if (!firstElement)
        return {
            ...prev,
            gameFrame: {
                ...prev.gameFrame,
                [key]: lineAssociated,
            },
            music: null,
        };

    const elementY = firstElement.y;
    const isStream = firstElement.isStream;

    if (
        !(
            elementY >= Zones.DETECTION_ZONE &&
            elementY <= Zones.END_DETECTION_ZONE
        )
    )
        return {
            ...prev,
            gameFrame: {
                ...prev.gameFrame,
                [key]: lineAssociated,
            },
            music: null,
        };

    // remove node

    const newCombo = prev.data.combo + 1;
    const newMultiplier =
        1 + Number((Math.floor(newCombo / 10) * 0.2).toFixed(1));

    if (elementY >= Zones.GOOD_ZONE && elementY <= Zones.END_GOOD_ZONE) {
        const newScores = {
            multiplier: newMultiplier,
            score: prev.data.score + Constants.BASE_SCORE * newMultiplier,
            combo: newCombo,
        };
        return {
            ...prev,
            gameFrame: {
                ...prev.gameFrame,
                [key]: isStream
                    ? lineAssociated.replaceFront(
                          firstElement.click(),
                          firstElement,
                      )
                    : lineAssociated.removeFront().lineDown(elementY),
            },
            data: {
                ...prev.data,
                ...(isStream ? {} : newScores),
            },
            ...(isStream
                ? { startStream: firstElement.associatedMusic }
                : { music: firstElement.associatedMusic }),
        };
    } else {
        // too early!
        return {
            ...prev,
            gameFrame: {
                ...prev.gameFrame,
                [key]: lineAssociated.removeFront().lineDown(elementY),
            },
            data: {
                ...prev.data,
                multiplier: 1,
                combo: 0,
            },
            music: firstElement.associatedMusic.randomPitch(),
        };
    }
};

const controlObservable = (
    keyCode: Key,
    onkeyPress: (prev: State) => State,
    onkeyRelease: (prev: State) => State,
) => {
    const keyRelease$ = fromKeyRelease(keyCode).pipe(
        map(() => (state: State) => ({
            ...onkeyRelease(state),
            keyPressed: removeElement(state.keyPressed, keyCode),
        })),
    );

    const keyPress$ = fromKeyPress(keyCode).pipe(
        map(() => (state: State) => ({
            ...onkeyPress(state),
            keyPressed: insertElement(state.keyPressed, keyCode),
        })),
    );

    return merge(keyPress$, keyRelease$);
};

const control$ = merge(
    controlObservable(
        "KeyS",
        checkHitDetection("greenLine"),
        checkReleaseDetection("greenLine"),
    ),
    controlObservable(
        "KeyD",
        checkHitDetection("redLine"),
        checkReleaseDetection("redLine"),
    ),
    controlObservable(
        "KeyJ",
        checkHitDetection("blueLine"),
        checkReleaseDetection("blueLine"),
    ),
    controlObservable(
        "KeyK",
        checkHitDetection("yellowLine"),
        checkReleaseDetection("yellowLine"),
    ),
);
