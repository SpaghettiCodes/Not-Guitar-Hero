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
    reduce,
    switchMap,
    timer,
} from "rxjs";
import {
    addPlayableNode,
    clickNote,
    GameFrame,
    gameFrameEmpty,
    Key,
    Line,
    lineDown,
    lineFront,
    lineFrontRange,
    lineNames,
    lineRemoveFront,
    lineReplaceNote,
    lineUp,
    Music,
    newMusic,
    Note,
    playSound,
    randomPitch,
    startSound,
    State,
    stopSound,
    tickGameFrame,
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

// Observable that detects if a key is pressed down (keydown)
const keyPress$ = fromEvent<KeyboardEvent>(document, "keydown");

// Observable that detects if a key is released (keyup)
const keyRelease$ = fromEvent<KeyboardEvent>(document, "keyup");

// From keyPress$ observable, extract out KeyboardEvent associated to the key code
// also ensures no repetition of KeyBoardEvent emission (key held down)
const fromKeyPress = (keyCode: Key): Observable<KeyboardEvent> =>
    keyPress$.pipe(filter(({ code, repeat }) => code === keyCode && !repeat));

// from keyRelease$ observable, extract out KeyboardEvent associated to the key code
const fromKeyRelease = (keyCode: Key): Observable<KeyboardEvent> =>
    keyRelease$.pipe(filter(({ code, repeat }) => code === keyCode && !repeat));

// creates the Keyboard Observables
const createKeyboardStream = (): Observable<(state: State) => State> => {
    // Function that takes in a specific line name and
    // returns a function that performs mouse release logic on that line
    const checkReleaseDetection =
            (key: lineNames) =>
            (prev: State): State => {
                // gets the associated line from the previous game frame
                // toggles click on the line
                const lineAssociated = lineUp(prev.gameFrame[key]);

                // reads the first element from the line
                const firstElement = lineFrontRange(
                    lineAssociated,
                    ZonesConstants.GOOD_ZONE,
                    ZonesConstants.END_GOOD_ZONE,
                );

                // if the first element isnt a stream, and isnt be clicked on
                // we do nothing
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

                // first element from here is guranteed to be a stream that is being held on
                const elementY = firstElement.endY;

                const newCombo = prev.data.combo + 1;
                const newMultiplier =
                    1 + Number((Math.floor(newCombo / 10) * 0.2).toFixed(1));

                if (
                    elementY >= ZonesConstants.GOOD_ZONE &&
                    elementY <= ZonesConstants.END_GOOD_ZONE
                ) {
                    // valid release point, remove the node, and save the elements Y value
                    return {
                        ...prev,
                        gameFrame: {
                            ...prev.gameFrame,
                            [key]: lineRemoveFront(lineAssociated),
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
        // Function that takes in a specific line name and
        // returns a function that performs mouse click logic on that line
        checkHitDetection =
            (key: lineNames) =>
            (prev: State): State => {
                const lineAssociated = lineDown(prev.gameFrame[key]);
                const firstElement = lineFrontRange(
                    lineAssociated,
                    ZonesConstants.GOOD_ZONE,
                    ZonesConstants.END_GOOD_ZONE,
                );

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

                // closest element isnt in detection zone, play random music
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
                        // if its a normal note, we can remove it
                        // if its a stream, we want to toggle click on it
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
                        ...(isStream ? {} : newScores), // if it is a stream, we do not want to update the scores
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
        // combines both key press and key release for a keyCode
        controlObservable = (
            keyCode: Key,
            onkeyPress: (prev: State) => State,
            onkeyRelease: (prev: State) => State,
        ): Observable<(prev: State) => State> => {
            const keyRelease$ = fromKeyRelease(keyCode).pipe(
                map(
                    () =>
                        (state: State): State =>
                            state.gameEnd
                                ? state
                                : {
                                      ...onkeyRelease(state),
                                      keyPressed: removeElement(
                                          state.keyPressed,
                                          keyCode,
                                      ),
                                  },
                ),
            );

            const keyPress$ = fromKeyPress(keyCode).pipe(
                map(
                    () =>
                        (state: State): State =>
                            state.gameEnd
                                ? state
                                : {
                                      ...onkeyPress(state),
                                      keyPressed: insertElement(
                                          state.keyPressed,
                                          keyCode,
                                      ),
                                  },
                ),
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

// creates the note stream, which returns two values
// 1. the note stream
// 2. the instrument we are playing as (for random noise when we miss)
const createNoteStream = (
    csv_contents: string,
): Readonly<{
    playingInstrument: string | undefined;
    noteStream$: Observable<(state: State) => State>;
}> => {
    const processedCSV = processCSV(csv_contents)
            .filter((data) => data.length === 6)
            .map(
                (data): Music =>
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
            (ZonesConstants.NODE_LOCATION / NoteConstants.SPEED) *
            TimeConstant.TICK_RATE_MS,
        firstNoteStart = Number(processedCSV.at(0)?.start),
        delayBeginAmt = Math.max(
            TimeConstant.DELAY_SEC * 1000,
            maxTravelTime - firstNoteStart,
        ),
        maxDuration = Math.max(...processedCSV.map((x) => x.end)),
        // appends a playable node to state
        // calls addPlayableNode for gameframe and
        // returns a new State with the new Gameframe
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
            mergeMap(
                (value: Music): Observable<(prev: State) => State> =>
                    of(value).pipe(
                        value.played
                            ? delay(
                                  value.start * 1000 -
                                      maxTravelTime +
                                      delayBeginAmt,
                              )
                            : delay(value.start * 1000 + delayBeginAmt),
                        map(
                            (value: Music) =>
                                (prev: State): State =>
                                    value.played
                                        ? appendPlayableNode(value, prev)
                                        : {
                                              ...prev,
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

// creates the tick stream
const createTickStream = (): Observable<(state: State) => State> => {
    const // gets the list of missed notes from a game frame
        // missed notes == notes that are going to be unrendered in this tick
        missedNotes = (prev: GameFrame) =>
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
        // get the number of missed notes from a game frame
        missedNotesCount = (prev: GameFrame): number =>
            missedNotes(prev).length,
        /**
         * Updates the state by proceeding with one time step.
         *
         * @param s Current state
         * @returns Updated state
         */
        tick = (prev: State): State => {
            const missedCount = missedNotesCount(prev.gameFrame);
            return {
                ...prev,
                // if the last note is played, and the game frame is completely empty
                // we can safely end the game
                gameEnd:
                    prev.data.lastNodePlayed && gameFrameEmpty(prev.gameFrame),
                gameFrame: tickGameFrame(prev.gameFrame),

                outofboundmusic: missedNotes(prev.gameFrame)
                    .filter((x) => x.isStream)
                    .map((x) => stopSound(x.associatedMusic)),

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

// creates an observable for an element when it is clicked
function createClickStream(buttonElement: HTMLElement) {
    return fromEvent(buttonElement, "click");
}

// creates a Observable that serves as a 'back button' listener.
const backButton = (): Observable<(state: State) => State> =>
    merge(
        fromKeyPress("Escape"),
        createClickStream(document.getElementById("backButton") as HTMLElement),
    ).pipe(
        map(
            () =>
                (prev: State): State => ({
                    ...prev,
                    data: {
                        ...prev.data,
                        leave: true,
                    },
                }),
        ),
    );

// creates a Observable that serves as a 'retry button' listener
const retryButton = (): Observable<(state: State) => State> =>
    merge(
        fromKeyPress("KeyR"),
        createClickStream(
            document.getElementById("retryButton") as HTMLElement,
        ),
    ).pipe(
        map(
            () =>
                (prev: State): State => ({
                    ...prev,
                    data: {
                        ...prev.data,
                        retry: true,
                    },
                }),
        ),
    );

// observable to grab the csv content
const grabCSVData = <T, U>(
    url: string,
    successFunction: (csvContents: string) => T,
    errorFunction: (error: string) => U,
): Observable<() => T | U> =>
    from(fetch(url)).pipe(
        switchMap((response) =>
            response.ok
                ? from(response.text()).pipe(
                      reduce((acc, text) => acc + text, ""),
                      // this returns a function which has side effect
                      // which would be ran in subscribe
                      map((string) => () => successFunction(string)),
                  )
                : of(response.statusText).pipe(
                      // this also
                      map((err) => () => errorFunction(err)),
                  ),
        ),
    );

export {
    createKeyboardStream,
    createNoteStream,
    createTickStream,
    createClickStream,
    fromKeyPress,
    backButton,
    retryButton,
    grabCSVData,
};
