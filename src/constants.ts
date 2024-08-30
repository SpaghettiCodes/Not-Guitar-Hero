// constants

const ViewportConstants = {
    CANVAS_WIDTH: 200,
    CANVAS_HEIGHT: 400,
    UNRENDER_THRESHOLD: 385,
} as const;

const ZonesConstants = {
    GOOD_ZONE: 320,
    PERFECT_ZONE: 340,
    END_PERFECT_ZONE: 360,
    END_GOOD_ZONE: 375,
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
    "~test-dot",
    "~test-dotSmall",
    "~test-drag",
    "~test-drag2",
    "~test-drag3",
    "~test-drag4",
    "sus",
    "sageJihen",
    "galaticMermaidSupport",
    "galaticMermaid",
    "IWannaBeAGirl",
    "loveTrial",
    "~test-combo",
    "sleepingBeauty",
    "glimpseOfUs",
    "stayWithMe",
    "ifICanStopOneHeartFromBreaking",
    "biteTheSecondHand",
    "UnderKids",
    "TrappedInThePast",
    "RainingAfterAll",
    "LowAsDirt",
    "ComparedChild",
    "BusToAnotherWorld",
    "supadopa",
    "starryJet",
    "hopeIsTheThingWithFeathers",
    "Tempestissimo",
    "rideOnTime",
    "aoNoSumika",
    "aoNoWaltz-bg",
    "aoNoWaltz",
    "DORAEEEMONIII",
    "amongUs",
    "amongDrip",
    "duelInTheMist",
    "~test-dotFast",
];

const ScoreConstant = {
    BASE_SCORE: 10,
};

const TimeConstant = {
    TICK_RATE_MS: 10,
    SONG_NAME: "combo",
    DELAY_SEC: 1.5,
    END_DELAY_SEC: 2,
} as const;

const NoteConstants = {
    RADIUS: 0.07 * ViewportConstants.CANVAS_WIDTH,
    TAIL_WIDTH: 10,
    // SPEED: 7
    SPEED: 4.5, // xunit / tick
    // SPEED: 2
};

const BarConstants = {
    width: NoteConstants.RADIUS * 1.5,
};

const SeedConstants = {
    pitchSEED: 42,
    durationSEED: 24,
};

export {
    ViewportConstants,
    ZonesConstants,
    SONG_LIST,
    ScoreConstant,
    TimeConstant,
    NoteConstants,
    BarConstants,
    SeedConstants,
};
