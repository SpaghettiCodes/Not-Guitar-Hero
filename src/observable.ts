// observables

import {
    delay,
    endWith,
    filter,
    first,
    from,
    fromEvent,
    interval,
    map,
    merge,
    mergeMap,
    of,
	tap,
} from "rxjs";
import {
    clickNote,
    GameFrame,
    getDuration,
    Key,
    lineBack,
    lineDown,
    lineFront,
    lineNames,
    lineRemoveFront,
    lineReplaceNote,
    lineUp,
    Music,
    newGameFrame,
    newMusic,
    newNote,
    playSound,
    randomPitch,
    State,
    tickLine,
    unclickNote,
    updateLine,
} from "./types";
import {
    NoteConstants,
    ScoreConstant,
    TimeConstant,
    ZonesConstants,
} from "./constants";
import { insertElement, processCSV, removeElement } from "./util";

const keyPress$ = fromEvent<KeyboardEvent>(document, "keydown")

const keyRelease$ = fromEvent<KeyboardEvent>(document, "keyup")

const fromKeyPress = (keyCode: Key) =>
	keyPress$.pipe(
		filter(({ code, repeat }) => code === keyCode && !repeat),
	)

const fromKeyRelease = (keyCode: Key) =>
	keyRelease$.pipe(
		filter(({ code, repeat }) => code === keyCode && !repeat),
	)

const createKeyboardStream = () => {
        const checkReleaseDetection = (key: lineNames) => (prev: State) => {
		const lineAssociated = lineUp(prev.gameFrame[key]);
		const firstElement = lineFront(lineAssociated);

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

            if (
                elementY >= ZonesConstants.GOOD_ZONE &&
                elementY <= ZonesConstants.END_GOOD_ZONE
            ) {
                // remove element

                return {
                    ...prev,
                    gameFrame: {
                        ...prev.gameFrame,
                        [key]: lineUp(
                            lineRemoveFront(lineAssociated),
                            elementY,
                        ),
                    },
                    data: {
                        ...prev.data,
                        multiplier: newMultiplier,
                        score:
                            prev.data.score +
                            ScoreConstant.BASE_SCORE * newMultiplier,
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
                        [key]: lineReplaceNote(
                            lineAssociated,
                            unclickNote(firstElement),
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
        },

		checkHitDetection = (key: lineNames) => (prev: State) => {
            const lineAssociated = lineDown(prev.gameFrame[key]);
            const firstElement = lineFront(lineAssociated);

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
                    elementY >= ZonesConstants.DETECTION_ZONE &&
                    elementY <= ZonesConstants.END_DETECTION_ZONE
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

            if (
                elementY >= ZonesConstants.GOOD_ZONE &&
                elementY <= ZonesConstants.END_GOOD_ZONE
            ) {
                const newScores = {
                    multiplier: newMultiplier,
                    score:
                        prev.data.score +
                        ScoreConstant.BASE_SCORE * newMultiplier,
                    combo: newCombo,
                };

                return {
                    ...prev,
                    gameFrame: {
                        ...prev.gameFrame,
                        [key]: isStream
                            ? lineReplaceNote(
                                  lineAssociated,
                                  clickNote(firstElement),
                                  firstElement,
                              )
                            : lineRemoveFront(lineAssociated),
                        elementY,
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
                        [key]: lineRemoveFront(lineAssociated),
                    },
                    data: {
                        ...prev.data,
                        multiplier: 1,
                        combo: 0,
                    },
                    music: randomPitch(firstElement.associatedMusic),
                };
            }
        },

		controlObservable = (
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

    return merge(
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
};

const createNoteStream = (csv_contents: string) => {
    const processedCSV = processCSV(csv_contents).filter(
            (data) => data.length === 6,
        ),
        maxTravelTime =
            (ZonesConstants.PERFECT_ZONE / NoteConstants.SPEED) *
            TimeConstant.TICK_RATE_MS,
        firstNoteStart = Number(processedCSV.at(0)?.at(4)),
        delayBeginAmt = Math.max(
            TimeConstant.DELAY_SEC * 1000,
            maxTravelTime - firstNoteStart,
        ),
        appendPlayableNode = (music: Music, state: State) => {
            const yEndPosition =
                -(NoteConstants.SPEED * getDuration(music) * 1000) /
                TimeConstant.TICK_RATE_MS;
            const newNode = newNote(
                0,
                yEndPosition,
                music,
                getDuration(music) >= 1,
            );
            const { greenLine, redLine, blueLine, yellowLine } =
                state.gameFrame;
            const lines = Array(greenLine, redLine, blueLine, yellowLine);
            const start = music.start;

            const availableLines = lines.filter((line) => {
                if (lineBack(line) === undefined) {
                    return true;
                }
                const lastDuration = getDuration(
                    lineBack(line)!.associatedMusic,
                );
                const lastStart = lineBack(line)!.associatedMusic.start;

                if (lineBack(line)!.isStream)
                    return (
                        start > lastDuration + lastStart || start < lastStart
                    );
                else return start != lastStart;
            });
            const availableLine = availableLines.at(
                music.pitch % availableLines.length,
            );

            if (availableLine === undefined) {
                // all 4 lines are full, ignore
                // can ah like that? idk
                // const maxTravelTime = ZonesConstants.PERFECT_ZONE / NoteConstants.SPEED * TimeConstant.TICK_RATE_MS
                // const detached = of(music).pipe(delay(maxTravelTime)).subscribe(playSound(music))
                return state;
            }

            // set new line
            const newLine = insertElement(availableLine.line, newNode);

            // determine which type
            const lineNames = [
                "greenLine",
                "redLine",
                "blueLine",
                "yellowLine",
            ];
            const lineIndex = lines.indexOf(availableLine);
            const lineName = lineNames.at(lineIndex);

            if (lineName === undefined)
                // impossible btw
                return state;

            return {
                ...state,
                gameFrame: {
                    ...state.gameFrame,
                    [lineName]: updateLine(availableLine, newLine),
                },
            };
        };

    return from(processedCSV).pipe(
        map((data) =>
            newMusic(
                String(data[0]).toLowerCase() === "true",
                data[1],
                Number(data[2]),
                Number(data[3]),
                Number(data[4]),
                Number(data[5]),
            ),
        ),
        mergeMap((value) =>
            of(value).pipe(
                value.played
                    ? delay(value.start * 1000 - maxTravelTime + delayBeginAmt)
                    : delay(value.start * 1000 + delayBeginAmt),
                map(
                    (value) => (prev: State) =>
                        value.played
                            ? appendPlayableNode(value, prev)
                            : {
                                  ...prev,
                                  data: {
                                      ...prev.data,
                                  },
                                  music: value,
                              },
                ),
            ),
        ),
        endWith((prev: State) => ({
            ...prev,
            data: {
                ...prev.data,
                lastNodePlayed: true,
            },
        })),
    );
};

const createTickStream = () => {
    /**
     * Updates the state by proceeding with one time step.
     *
     * @param s Current state
     * @returns Updated state
     */

    const missedLine = (prev: GameFrame) =>
            Array(
                prev.greenLine,
                prev.redLine,
                prev.blueLine,
                prev.yellowLine,
            ).reduce(
                (missed, line) =>
                    missed +
                    (lineFront(line)
                        ? Number(
                              lineFront(line)!.y >
                                  ZonesConstants.END_DETECTION_ZONE,
                          )
                        : 0),
                0,
            ),
        gameFrameEmpty = (prev: GameFrame) =>
            Array(
                prev.greenLine,
                prev.redLine,
                prev.blueLine,
                prev.yellowLine,
            ).filter((line) => line.line.length).length === 0,
        tickGameFrame = (prev: GameFrame): GameFrame =>
            newGameFrame(
                tickLine(prev.greenLine),
                tickLine(prev.redLine),
                tickLine(prev.blueLine),
                tickLine(prev.yellowLine),
            );

    const tick = (prev: State) => {
        const missedCount = missedLine(prev.gameFrame);
        return {
            ...prev,
            gameEnd: prev.data.lastNodePlayed && gameFrameEmpty(prev.gameFrame),
            gameFrame: tickGameFrame(prev.gameFrame),

            data: {
                ...prev.data,
                multiplier: missedCount ? 1 : prev.data.multiplier,
                combo: missedCount ? 0 : prev.data.combo,
            },

            music: null,
            startStream: null,
            stopMusic: null,
        };
    };

    return interval(TimeConstant.TICK_RATE_MS).pipe(map(() => tick));
};

function createClickStream (buttonElement: HTMLElement) {
	return fromEvent(buttonElement, 'click')
}

export { createKeyboardStream, createNoteStream, createTickStream, createClickStream, fromKeyPress };
