// observables

import {
    delay,
    filter,
    from,
    fromEvent,
    interval,
    map,
    merge,
    mergeMap,
    mergeWith,
    Observable,
    of,
    tap,
    timer,
} from "rxjs";
import {
    addPlayableNode,
    clickNote,
    GameFrame,
    Key,
    Line,
    lineDown,
    lineFront,
    lineNames,
    lineRemoveFront,
    lineReplaceNote,
    lineUp,
    Music,
    newGameFrame,
    newMusic,
    Note,
    playSound,
    randomPitch,
    startSound,
    State,
    stopSound,
    tickLine,
    unclickNote,
} from "./types";
import {
    NoteConstants,
    ScoreConstant,
    TimeConstant,
    ViewportConstants,
    ZonesConstants,
} from "./constants";
import { insertElement, processCSV, removeElement } from "./util";

const keyPress$ = fromEvent<KeyboardEvent>(document, "keydown");

const keyRelease$ = fromEvent<KeyboardEvent>(document, "keyup");

const fromKeyPress = (keyCode: Key): Observable<KeyboardEvent> =>
    keyPress$.pipe(filter(({ code, repeat }) => code === keyCode && !repeat));

const fromKeyRelease = (keyCode: Key): Observable<KeyboardEvent> =>
    keyRelease$.pipe(filter(({ code, repeat }) => code === keyCode && !repeat));

const createKeyboardStream = (): Observable<(state: State) => State> => {
    const checkReleaseDetection =
            (key: lineNames) =>
            (prev: State): State => {
                const lineAssociated = lineUp(prev.gameFrame[key]);
                const firstElement = lineFront(lineAssociated);

                if (
                    !firstElement ||
                    !firstElement.isStream ||
                    !firstElement.clicked
                )
                    return {
                        ...prev,
                        gameFrame: {
                            ...prev.gameFrame,
                            [key]: lineAssociated,
                        },
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
                            hitNotes: prev.data.hitNotes + 1,
                            totalNotes: prev.data.totalNotes + 1,
                        },
                        music: stopSound(firstElement.associatedMusic),
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
                            totalNotes: prev.data.totalNotes + 1,
                        },
                        music: stopSound(firstElement.associatedMusic),
                    };
                }
            },
        checkHitDetection =
            (key: lineNames) =>
            (prev: State): State => {
                const lineAssociated = lineDown(prev.gameFrame[key]);
                const firstElement = lineFront(lineAssociated);

                if (!firstElement || firstElement.clickedBefore)
                    return {
                        ...prev,
                        data: {
                            ...prev.data,
                            multiplier: 1,
                            combo: 0,
                            totalNotes: prev.data.totalNotes + 1,
                        },
                        gameFrame: {
                            ...prev.gameFrame,
                            [key]: lineAssociated,
                        },
                        music: playSound(
                            randomPitch(prev.data.playingInstrument, prev.rng),
                        ),
                    };

                const elementY = firstElement.y;
                const isStream = firstElement.isStream;

                // outside of detection zone, play random music
                if (
                    !(
                        elementY >= ZonesConstants.GOOD_ZONE &&
                        elementY <= ZonesConstants.END_GOOD_ZONE
                    )
                )
                    return {
                        ...prev,
                        data: {
                            ...prev.data,
                            multiplier: 1,
                            combo: 0,
                            totalNotes: prev.data.totalNotes + 1,
                        },
                        gameFrame: {
                            ...prev.gameFrame,
                            [key]: lineAssociated,
                        },
                        music: playSound(
                            randomPitch(prev.data.playingInstrument, prev.rng),
                        ),
                    };

                // remove node

                const newCombo = prev.data.combo + 1;
                const newMultiplier =
                    1 + Number((Math.floor(newCombo / 10) * 0.2).toFixed(1));

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
                    },
                    data: {
                        ...prev.data,
                        ...(isStream ? {} : newScores),
                        ...{
                            hitNotes: prev.data.hitNotes + 1,
                            totalNotes: prev.data.totalNotes + 1,
                        },
                    },
                    music: isStream
                        ? startSound(firstElement.associatedMusic)
                        : playSound(firstElement.associatedMusic),
                };
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

const createNoteStream = (
    csv_contents: string,
): Readonly<{
    playingInstrument: string | undefined;
    noteStream$: Observable<(state: State) => State>;
}> => {
    const processedCSV = processCSV(csv_contents)
            .filter((data) => data.length === 6)
            .map((data) =>
                newMusic(
                    String(data[0]).toLowerCase() === "true",
                    data[1],
                    Number(data[2]),
                    Number(data[3]),
                    Number(data[4]),
                    Number(data[5]),
                ),
            ),
        maxTravelTime =
            (ZonesConstants.PERFECT_ZONE / NoteConstants.SPEED) *
            TimeConstant.TICK_RATE_MS,
        firstNoteStart = Number(processedCSV.at(0)?.start),
        delayBeginAmt = Math.max(
            TimeConstant.DELAY_SEC * 1000,
            maxTravelTime - firstNoteStart,
        ),
        maxDuration = Math.max(...processedCSV.map((x) => x.end)),
        appendPlayableNode = (music: Music, state: State): State => {
            return {
                ...state,
                gameFrame: addPlayableNode(music, state.gameFrame),
            };
        };

    return {
        playingInstrument: processedCSV.find((v) => v.played === true)
            ?.instrument,
        noteStream$: from(processedCSV).pipe(
            mergeMap((value) =>
                of(value).pipe(
                    value.played
                        ? delay(
                              value.start * 1000 -
                                  maxTravelTime +
                                  delayBeginAmt,
                          )
                        : delay(value.start * 1000 + delayBeginAmt),
                    map(
                        (value) =>
                            (prev: State): State =>
                                value.played
                                    ? appendPlayableNode(value, prev)
                                    : {
                                          ...prev,
                                          data: {
                                              ...prev.data,
                                          },
                                          music: playSound(value),
                                      },
                    ),
                ),
            ),
            mergeWith(
                timer((maxDuration + TimeConstant.END_DELAY_SEC) * 1000).pipe(
                    map(
                        () =>
                            (prev: State): State => ({
                                ...prev,
                                data: {
                                    ...prev.data,
                                    lastNodePlayed: true,
                                },
                            }),
                    ),
                ),
            ),
        ),
    };
};

const createTickStream = (): Observable<(state: State) => State> => {
    /**
     * Updates the state by proceeding with one time step.
     *
     * @param s Current state
     * @returns Updated state
     */

    const missedNotes = (prev: GameFrame) =>
            Array(
                prev.greenLine,
                prev.redLine,
                prev.blueLine,
                prev.yellowLine,
            ).reduce(
                (
                    missed: ReadonlyArray<Note>,
                    line: Line,
                ): ReadonlyArray<Note> => {
                    const front = lineFront(line);
                    if (front === undefined) return missed;

                    if (front.isStream)
                        return front.endY > ViewportConstants.UNRENDER_THRESHOLD
                            ? missed.concat(front)
                            : missed;
                    return front.y > ViewportConstants.UNRENDER_THRESHOLD
                        ? missed.concat(front)
                        : missed;
                },
                [],
            ),
        missedNotesCount = (prev: GameFrame): number =>
            missedNotes(prev).length,
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
            ),
        tick = (prev: State): State => {
            const missedCount = missedNotesCount(prev.gameFrame);
            return {
                ...prev,
                gameEnd:
                    prev.data.lastNodePlayed && gameFrameEmpty(prev.gameFrame),
                gameFrame: tickGameFrame(prev.gameFrame),

                data: {
                    ...prev.data,
                    multiplier: missedCount ? 1 : prev.data.multiplier,
                    combo: missedCount ? 0 : prev.data.combo,
                    totalNotes: prev.data.totalNotes + missedCount,
                },
            };
        };

    return interval(TimeConstant.TICK_RATE_MS).pipe(map(() => tick));
};

function createClickStream(buttonElement: HTMLElement) {
    return fromEvent(buttonElement, "click");
}

export {
    createKeyboardStream,
    createNoteStream,
    createTickStream,
    createClickStream,
    fromKeyPress,
};
