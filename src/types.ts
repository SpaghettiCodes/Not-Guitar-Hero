// types and functions on specific types

import * as Tone from "tone";
import { NoteConstants, ViewportConstants } from "./constants";

/** User input */

type Key = "KeyS" | "KeyD" | "KeyJ" | "KeyK" | "KeyR" | "Escape";

type MouseEventName = "keydown" | "keyup" | "keypress";

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

const newMusic = (
    played: Boolean,
    instrument: string,
    velocity: number,
    pitch: number,
    start: number,
    end: number,
) => ({
    played: played,
    instrument: instrument,
    velocity: velocity,
    pitch: pitch,
    start: start,
    end: end,
});

const getDuration = (sound: Music): number => sound.end - sound.start;

const playSound = (sound: Music, samples: SampleLibraryType) => {
    const volume = sound.velocity / 127;

    samples[sound.instrument].triggerAttackRelease(
        Tone.Frequency(sound.pitch, "midi").toNote(),
        getDuration(sound),
        undefined,
        volume,
    );
};

const startSound = (sound: Music, samples: SampleLibraryType) => {
    const volume = sound.velocity / 127;

    samples[sound.instrument].triggerAttack(
        Tone.Frequency(sound.pitch, "midi").toNote(),
        undefined,
        volume,
    );
};

const randomPitch = (sound: Music): Music => {
    return {
        played: sound.played,
        instrument: sound.instrument,
        velocity: 127,
        pitch: Math.floor(25 + Math.random() * 65),
        start: 0,
        end: Math.random() / 2,
    };
};

const stopSound = (sound: Music, samples: SampleLibraryType) => {
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
}>;

const newNote = (
    y: number,
    endY: number,
    associatedMusic: Music,
    isStream: boolean = false,
    clicked: boolean = false,
): Note => ({
    y: y,
    endY: endY,
    associatedMusic: associatedMusic,
    isStream: isStream,
    clicked: clicked,
});

const clickNote = (note: Note): Note => ({ ...note, clicked: true });

const unclickNote = (note: Note): Note => ({ ...note, clicked: false });

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
    line: ReadonlyArray<Note>;
    hold: boolean;
    clicked: number;
}>;

const newList = (
    line: ReadonlyArray<Note> = [],
    hold: boolean = false,
    clicked: number = 0,
): Line => ({
    line: line,
    hold: hold,
    clicked: clicked,
});

const updateLine = (line: Line, newLine: ReadonlyArray<Note>): Line => ({
    ...line,
    line: newLine,
});

const lineDown = (line: Line, clicked: number = -1): Line => ({
    ...line,
    hold: true,
    clicked: clicked,
});

const lineUp = (line: Line, clicked: number = -1): Line => ({
    ...line,
    hold: false,
    clicked: clicked,
});

const lineFront = (line: Line): Note | undefined => line.line.at(0);

const lineBack = (line: Line): Note | undefined => line.line.at(-1);

const lineReplaceNote = (line: Line, newNode: Note, target: Note): Line => {
    const index = line.line.indexOf(target);
    if (index < 0) return line;
    return updateLine(line, [
        ...line.line.slice(0, index),
        newNode,
        ...line.line.slice(index + 1),
    ]);
};

const lineRemoveFront = (line: Line): Line => {
    return updateLine(line, line.line.slice(1));
};

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

/** Type to represent data contained in game */

type GameData = Readonly<{
    multiplier: number;
    score: number;
    combo: number;
    lastNodePlayed: boolean;
}>;

const newGameData = (
    multiplier: number,
    score: number,
    combo: number,
    lastNodePlayed: boolean,
) => ({
    multiplier: multiplier,
    score: score,
    combo: combo,
    lastNodePlayed: lastNodePlayed,
});

/** Type to represent a State in the game */

type State = Readonly<{
    gameEnd: boolean;

    keyPressed: ReadonlyArray<Key>;
    gameFrame: GameFrame;

    data: GameData;

    music: Music | null;
    startStream: Music | null;
    stopMusic: Music | null;
}>;

const initialState: State = {
    gameEnd: false,
    keyPressed: [],
    gameFrame: newGameFrame(),
    data: newGameData(1, 0, 0, false),

    music: null,
    startStream: null,
    stopMusic: null,
};

/** Lazy Evaluation */

interface LazySequence<T> {
	value: T;
	next: () => LazySequence<T>;
};

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
    lineBack,
    lineReplaceNote,
    lineRemoveFront,
    tickLine,
    type GameFrame,
    newGameFrame,
    type GameData,
    newGameData,
    type State,
    initialState,
	type LazySequence
};
