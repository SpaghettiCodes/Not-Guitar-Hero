// constants

const ViewportConstants = {
    CANVAS_WIDTH: 200,
    CANVAS_HEIGHT: 400,
    UNRENDER_THRESHOLD: 385,
} as const;

const ZonesConstants = {
    DETECTION_ZONE: 300,
    GOOD_ZONE: 320,
    PERFECT_ZONE: 340,
    END_PERFECT_ZONE: 360,
    END_GOOD_ZONE: 375,
    END_DETECTION_ZONE: 375,
};

const SONG_LIST = [
    "this does not exist",
    "nightsOfNights-piano",
    "stickyBug",
    "megalovania",
    "megalovania-bg",
    "monstadt-night",
    "IlVentoDoro",
    "IlVentoDoro2",
    "summertime",
    "renaiCirculation",
    "stapleStable",
    "turningLove",
    "turningLove2",
    "Say!Fanfare",
    "RockinRobin",
    "ThroughTheFireAndTheFlames",
    "pianoMan",
    "guitarMan",
    "bonAppatit",
    "constallation_vocals",
    "cantina",
    "dot",
    "dotSmall",
    "drag",
    "drag2",
    "drag3",
    "sus",
    "sageJihen",
    "f--kingbull----",
    "IWannaBeAGirl",
    "loveTrial",
    "combo",
	'sleepingBeauty',
];

const ScoreConstant = {
    BASE_SCORE: 10,
};

const TimeConstant = {
    TICK_RATE_MS: 10,
    SONG_NAME: "combo",
    DELAY_SEC: 1.5,
} as const;

const NoteConstants = {
    RADIUS: 0.07 * ViewportConstants.CANVAS_WIDTH,
    TAIL_WIDTH: 10,
    // SPEED: 7
    SPEED: 3.5, // xunit / tick
};

const BarConstants = {
    width: NoteConstants.RADIUS * 1.5,
};

export {
    ViewportConstants,
    ZonesConstants,
    SONG_LIST,
    ScoreConstant,
    TimeConstant,
    NoteConstants,
    BarConstants,
};
