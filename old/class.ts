// not sure

/** State processing */

class AMusic {
    readonly duration: number;

    constructor(
        public readonly played: Boolean,
        public readonly instrument: string,
        public readonly velocity: number,
        public readonly pitch: number,
        public readonly start: number,
        public readonly end: number,
    ) {
        this.duration = this.end - this.start;
    }

    // WARNING: UNPURE, ONLY USE THIS IN SUBSCRIBE
    public readonly playSound = () => {
        const volume = this.velocity / 127;

        samples[this.instrument].triggerAttackRelease(
            Tone.Frequency(this.pitch, "midi").toNote(),
            this.duration,
            undefined,
            volume,
        );
    };

    public readonly startStream = () => {
        const volume = this.velocity / 127;

        samples[this.instrument].triggerAttack(
            Tone.Frequency(this.pitch, "midi").toNote(),
            undefined,
            volume,
        );
    };

    public readonly randomPitch = () => {
        return new AMusic(
            this.played,
            this.instrument,
            127, // people need to know they fuck up
            Math.floor(25 + Math.random() * 65),
            0,
            Math.random() / 2,
        );
    };

    public readonly stopSound = () => {
        samples[this.instrument].triggerRelease(
            Tone.Frequency(this.pitch, "midi").toNote(),
        );
    };
}

class ANote {
    constructor(
        public readonly y: number,
        public readonly endY: number,
        public readonly associatedMusic: AMusic,

        public readonly isStream: boolean = false,
        public readonly clicked: boolean = false,
    ) {}

    public readonly click = () => {
        return new ANote(
            this.y,
            this.endY,
            this.associatedMusic,
            this.isStream,
            true,
        );
    };

    public readonly unclick = () => {
        return new ANote(
            this.y,
            this.endY,
            this.associatedMusic,
            this.isStream,
            false,
        );
    };

    public readonly move = () =>
        this.clicked
            ? new ANote(
                  this.y,
                  this.endY + Note.SPEED,
                  this.associatedMusic,
                  this.isStream,
                  this.clicked,
              )
            : new ANote(
                  this.y + Note.SPEED,
                  this.endY + Note.SPEED,
                  this.associatedMusic,
                  this.isStream,
                  this.clicked,
              );
}

class ALine {
    constructor(
        public readonly line: ReadonlyArray<ANote> = [],
        public readonly hold: boolean = false,
        public readonly clicked: number = 0,
    ) {}

    public readonly replaceLine = (line: ReadonlyArray<ANote>) => {
        return new ALine(line, this.hold, this.clicked);
    };

    public readonly lineDown = (clicked: number = 0) => {
        return new ALine(this.line, true, clicked);
    };

    public readonly lineUp = (clicked: number = 0) => {
        return new ALine(this.line, false, clicked);
    };

    public readonly front = () => {
        return this.line.at(0);
    };

    public readonly replaceFront = (newNode: ANote, replace: ANote) => {
        const index = this.line.indexOf(replace);
        if (index < 0) {
            return this;
        }
        return this.replaceLine([
            ...this.line.slice(0, index),
            newNode,
            ...this.line.slice(index + 1),
        ]);
    };

    public readonly back = () => {
        return this.line.at(-1);
    };

    public readonly removeFront = () => {
        return this.replaceLine(this.line.slice(1));
    };

    public readonly tick = () => {
        return this.replaceLine(
            (this.line.length > 0
                ? (this.line.at(0)!.isStream
                      ? this.line.at(0)!.endY
                      : this.line.at(0)!.y) > Viewport.UNRENDER_THRESHOLD
                    ? this.line.slice(1)
                    : this.line
                : this.line
            ).map((note) => note.move()),
        );
    };
}

type lineNames = "greenLine" | "redLine" | "blueLine" | "yellowLine";

class AGameFrame {
    constructor(
        public readonly greenLine: ALine = new ALine(),
        public readonly redLine: ALine = new ALine(),
        public readonly blueLine: ALine = new ALine(),
        public readonly yellowLine: ALine = new ALine(),
    ) {}
}

class AGameData {
    constructor(
        public readonly multiplier: number,
        public readonly score: number,
        public readonly combo: number,

        public readonly lastNodePlayed: boolean,
    ) {}
}

type State = Readonly<{
    gameEnd: boolean;

    keyPressed: ReadonlyArray<Key>;
    gameFrame: AGameFrame;

    data: AGameData;

    music: AMusic | null;
    startStream: AMusic | null;
    stopMusic: AMusic | null;
}>;

const initialState: State = {
    gameEnd: false,
    keyPressed: [],
    gameFrame: new AGameFrame(),
    data: new AGameData(1, 0, 0, false),

    music: null,
    startStream: null,
    stopMusic: null,
};
