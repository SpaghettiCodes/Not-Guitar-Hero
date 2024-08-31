// types and functions on specific types

import * as Tone from "tone";
import {
    NoteConstants,
    SeedConstants,
    TimeConstant,
    ViewportConstants,
} from "./constants";
import { insertElement } from "./util";
import { Subscription } from "rxjs";

/** User input */

type Key = "KeyS" | "KeyD" | "KeyJ" | "KeyK" | "KeyR" | "Escape";

type MouseEventName = "keydown" | "keyup" | "keypress";

/** SampleLibrary type from tonejs-instruments  */

type SampleLibraryType = Readonly<{
    [key: string]: Tone.Sampler;
}>;

/** Everything related to Music and Sounds */

type Music = Readonly<{
    played: Boolean;
    instrument: string;
    velocity: number;
    pitch: number;
    start: number;
    end: number;
}>;

// Creates a new Music object
const newMusic = (
    played: Boolean,
    instrument: string,
    velocity: number,
    pitch: number,
    start: number,
    end: number,
): Music => ({
    played: played,
    instrument: instrument,
    velocity: velocity,
    pitch: pitch,
    start: start,
    end: end,
});

// gets the duration of the Music
const getDuration = (sound: Music): number => sound.end - sound.start;

// plays the sound for {sound.duration} duration
const playSound = (sound: Music) => (samples: SampleLibraryType) => {
    const volume = sound.velocity / 127;

    samples[sound.instrument].triggerAttackRelease(
        Tone.Frequency(sound.pitch, "midi").toNote(),
        getDuration(sound),
        undefined,
        volume,
    );
};

// starts playing the sound, does not stop unless stopSound is called on sound
const startSound = (sound: Music) => (samples: SampleLibraryType) => {
    const volume = sound.velocity / 127;

    samples[sound.instrument].triggerAttack(
        Tone.Frequency(sound.pitch, "midi").toNote(),
        undefined,
        volume,
    );
};

// generates a random pitch given the instrument
const randomPitch = (instrument: string | undefined, rng: RNGFields): Music => {
    return {
        played: false,
        instrument: instrument ? instrument : "piano", // if no notes are playable, by default, play piano
        velocity: 127,
        pitch: Math.floor(25 + rng.pitch.value * 65),
        start: 0,
        end: rng.duration.value / 2,
    };
};

// stops playing a sound. Sound must be played with startSound first
const stopSound =
    (sound: Music) =>
    (samples: SampleLibraryType): undefined => {
        samples[sound.instrument].triggerRelease(
            Tone.Frequency(sound.pitch, "midi").toNote(),
        );
    };

/** Everything related to Notes displayed on the screen */

type Note = Readonly<{
    y: number;
    endY: number;
    associatedMusic: Music;
    isStream: boolean;
    clicked: boolean;
    clickedBefore: boolean;
}>;

// creates a new Note object
const newNote = (
    y: number,
    endY: number,
    associatedMusic: Music,
    isStream: boolean = false,
    clicked: boolean = false,
    clickedBefore: boolean = false,
): Note => ({
    y: y,
    endY: endY,
    associatedMusic: associatedMusic,
    isStream: isStream,
    clicked: clicked,
    clickedBefore: clickedBefore,
});

// creates a copy of the note that is clicked, also sets clicked before flag to true
const clickNote = (note: Note): Note => ({
    ...note,
    clicked: true,
    clickedBefore: true,
});

// creates a copy of the node that is not clicked (i.e. note is released)
const unclickNote = (note: Note): Note => ({ ...note, clicked: false });

// moves the note based on the speed given
const moveNote = (note: Note, speed: number): Note =>
    note.clicked
        ? {
              ...note,
              endY: note.endY + speed,
          }
        : {
              ...note,
              y: note.y + speed,
              endY: note.endY + speed,
          };

/** Represents a Line on the Game Frame */

type lineNames = "greenLine" | "redLine" | "blueLine" | "yellowLine";

type Line = Readonly<{
    // array of notes for this line
    line: ReadonlyArray<Note>;
    // is the button corresponding to this line being held?
    hold: boolean;
}>;

// creates a new List object
const newList = (
    line: ReadonlyArray<Note> = [],
    hold: boolean = false,
): Line => ({
    line: line,
    hold: hold,
});

// returns a copy of {line} with {newLine} replacing the previous line's inner line
const updateLine = (line: Line, newLine: ReadonlyArray<Note>): Line => ({
    ...line,
    line: newLine,
});

// returns a copy of {line} which is held down
const lineDown = (line: Line): Line => ({
    ...line,
    hold: true,
});

// returns a copy of {line} which is released
const lineUp = (line: Line): Line => ({
    ...line,
    hold: false,
});

// accesses the first element in the line
const lineFront = (line: Line): Note | undefined => line.line.at(0);

// gets the first element which is within the range of {lowerBound} and {upperBound}
const lineFrontRange = (
    line: Line,
    lowerBound: number,
    upperBound: number,
): Note | undefined =>
    line.line.find((x) => x.y >= lowerBound && x.y <= upperBound);

// accesses the last element in the line
const lineBack = (line: Line): Note | undefined => line.line.at(-1);

// replaces {target} note with {newNoTe} note, and returns a new Line object with the new inner line
const lineReplaceNote = (line: Line, newNoTe: Note, target: Note): Line => {
    const index = line.line.indexOf(target);
    if (index < 0) return line;
    return updateLine(line, [
        ...line.line.slice(0, index),
        newNoTe,
        ...line.line.slice(index + 1),
    ]);
};

// returns a new Line object with its first note removed
const lineRemoveFront = (line: Line): Line => {
    return updateLine(line, line.line.slice(1));
};

// ticks the line
// 1. removes the first element on the line if it is out of render threshold
// 2. moves all note in the line by speed
const tickLine = (line: Line): Line => {
    return updateLine(
        line,
        (line.line.length > 0
            ? lineFront(line)
                ? (lineFront(line)!.isStream
                      ? lineFront(line)!.endY
                      : lineFront(line)!.y) >
                  ViewportConstants.UNRENDER_THRESHOLD
                    ? line.line.slice(1)
                    : line.line
                : line.line
            : line.line
        ).map((note) => moveNote(note, NoteConstants.SPEED)),
    );
};

/** Type to represent the gameFrame */

type GameFrame = Readonly<{
    greenLine: Line;
    redLine: Line;
    blueLine: Line;
    yellowLine: Line;
}>;

// creates a new GameFrame object
const newGameFrame = (
    greenLine: Line = newList(),
    redLine: Line = newList(),
    blueLine: Line = newList(),
    yellowLine: Line = newList(),
): GameFrame => ({
    greenLine: greenLine,
    redLine: redLine,
    blueLine: blueLine,
    yellowLine: yellowLine,
});

// ticks the game frame, and returns the updated gameframe
// by ticking the game frame, we are just calling tickLine to all 4 lines
const tickGameFrame = (prev: GameFrame): GameFrame =>
    newGameFrame(
        tickLine(prev.greenLine),
        tickLine(prev.redLine),
        tickLine(prev.blueLine),
        tickLine(prev.yellowLine),
    );

// contains the logic to add a new playable note into a gameframe
// a new playable note is added into the gameframe by
// 1. filtering available lines
// 2. choosing one of the lines based on the music's pitch
// 3. adding the node into the line
const addPlayableNode = (music: Music, gameFrame: GameFrame): GameFrame => {
    const yEndPosition =
        -(NoteConstants.SPEED * getDuration(music) * 1000) /
        TimeConstant.TICK_RATE_MS;
    const newNode = newNote(0, yEndPosition, music, getDuration(music) >= 1);
    const { greenLine, redLine, blueLine, yellowLine } = gameFrame;
    const lines = Array(greenLine, redLine, blueLine, yellowLine);
    const start = music.start;

    const availableLines = lines.filter((line) => {
        if (lineBack(line) === undefined) {
            return true;
        }
        const lastDuration = getDuration(lineBack(line)!.associatedMusic);
        const lastStart = lineBack(line)!.associatedMusic.start;

        if (lineBack(line)!.isStream)
            return start > lastDuration + lastStart || start < lastStart;
        else return start != lastStart;
    });
    const availableLine = availableLines.at(
        music.pitch % availableLines.length,
    );

    if (availableLine === undefined) {
        // all 4 lines are full, sad :(
        return gameFrame;
    }

    // set new line
    const newLine = insertElement(availableLine.line, newNode);

    // determine which line
    const lineNames = ["greenLine", "redLine", "blueLine", "yellowLine"];
    const lineIndex = lines.indexOf(availableLine);
    const lineName = lineNames.at(lineIndex);

    if (lineName === undefined) return gameFrame;

    return {
        ...gameFrame,
        [lineName]: updateLine(availableLine, newLine),
    };
};

// check if the game frame is completely empty
// i.e. no more nodes to play
const gameFrameEmpty = (prev: GameFrame): boolean =>
    Array(prev.greenLine, prev.redLine, prev.blueLine, prev.yellowLine).filter(
        (line) => line.line.length,
    ).length === 0;

/** Type to represent data contained in game */

type GameData = Readonly<{
    // represents the score multiplier
    multiplier: number;

    // represents the current score
    score: number;

    // represents the current combo
    combo: number;

    // represents the total number of successful presses
    hitNotes: number;

    // represents the total number of presses + missed notes
    totalNotes: number;

    // represents the final music has been released by the music observable
    lastNodePlayed: boolean;

    // represents the instrument that we are playing as
    playingInstrument: string | undefined;

    leave: boolean;
    retry: boolean;
}>;

// creates a new GameData object
const newGameData = (
    multiplier: number,
    score: number,
    combo: number,

    lastNodePlayed: boolean,
    playingInstrument: string | undefined,

    leave: boolean = false,
    retry: boolean = false,
): GameData => ({
    multiplier: multiplier,
    score: score,
    combo: combo,

    hitNotes: 0,
    totalNotes: 0,

    lastNodePlayed: lastNodePlayed,
    playingInstrument: playingInstrument,

    leave: leave,
    retry: retry,
});

/** Lazy Evaluation */

interface LazySequence<T> {
    value: T;
    next: () => LazySequence<T>;
}

/** RNG */

/**
 * A random number generator which provides two pure functions
 * `hash` and `scaleToRange`.  Call `hash` repeatedly to generate the
 * sequence of hashes.
 *
 * RNG class is sourced from 2102 Applied Class Exercise Week 4
 */
abstract class RNG {
    // LCG using GCC's constants
    private static m = 0x80000000; // 2**31
    private static a = 1103515245;
    private static c = 12345;

    /**
     * Call `hash` repeatedly to generate the sequence of hashes.
     * @param seed
     * @returns a hash of the seed
     */
    public static hash = (seed: number) => (RNG.a * seed + RNG.c) % RNG.m;

    /**
     * Takes hash value and scales it to the range [0, 1]
     */
    public static scale = (hash: number) => hash / (RNG.m - 1);
}

// A Lazy sequence of RNG numbers, generate the next RNG value by calling .next()
function RNGGenerator(seed: number): LazySequence<number> {
    return (function _next(seed: number): LazySequence<number> {
        const newHash = RNG.hash(seed);
        return {
            value: RNG.scale(seed),
            next: () => _next(newHash),
        };
    })(seed);
}

/** Type to represent RNG in the game */

type RNGFields = Readonly<{
    pitch: LazySequence<number>; // rng value for pitch
    duration: LazySequence<number>; // rng value for duration
}>;

// calls next for both pitch and duration rng sequence
const nextNumber = (rngfield: RNGFields): RNGFields => ({
    pitch: rngfield.pitch.next(),
    duration: rngfield.duration.next(),
});

/** Type to represent a state in the game */

type State = Readonly<{
    // true if the game has ended
    gameEnd: boolean;

    // a list of keys that is being pressed
    keyPressed: ReadonlyArray<Key>;
    gameFrame: GameFrame;

    data: GameData;

    // a function to play music, if there is nothing to be played, it is set to null
    // this function is called in subscribe as it is unpure
    music: ((samples: SampleLibraryType) => void) | null;

    outofboundmusic: ReadonlyArray<(sample: SampleLibraryType) => void>;

    rng: RNGFields;
}>;

/**
 *  Creates the initial state, accepts a playing instrument value, which represents
 * the instrument that the player is playing as
 */
const initialState = (playingInstrument: string | undefined): State => ({
    gameEnd: false,
    keyPressed: [],
    gameFrame: newGameFrame(),
    data: newGameData(1, 0, 0, false, playingInstrument),

    music: null,
    outofboundmusic: [],

    rng: {
        pitch: RNGGenerator(SeedConstants.pitchSEED),
        duration: RNGGenerator(SeedConstants.durationSEED),
    },
});

const resetState = (prev: State): State => ({
    ...prev,
    data: {
        ...prev.data,
        leave: false,
        retry: false,
    },
    music: null,
    outofboundmusic: [],
});

export {
    type Key,
    type MouseEventName,
    type SampleLibraryType,
    type Music,
    newMusic,
    getDuration,
    playSound,
    startSound,
    randomPitch,
    stopSound,
    type Note,
    newNote,
    clickNote,
    unclickNote,
    moveNote,
    type lineNames,
    type Line,
    newList,
    updateLine,
    lineDown,
    lineUp,
    lineFront,
    lineFrontRange,
    lineBack,
    lineReplaceNote,
    lineRemoveFront,
    tickLine,
    type GameFrame,
    newGameFrame,
    tickGameFrame,
    addPlayableNode,
    gameFrameEmpty,
    type GameData,
    newGameData,
    type State,
    nextNumber,
    initialState,
    resetState,
    type LazySequence,
    RNGGenerator,
};
