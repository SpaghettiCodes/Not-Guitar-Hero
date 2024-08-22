# pip install miditoolkit numpy inquirer
from miditoolkit.midi import parser as midi_parser
from pathlib import Path
import sys
import numpy as np
import inquirer
from typing import Optional

help_info = """
Usage: python midi.py [OPTION] [FILE]

Options:
  --help         Show this help message and exit

If no OPTION or FILE is supplied, the script will prompt you to choose a MIDI (.mid) file from the current directory.

Examples:
  python script.py --help
  python script.py my_file.mid
"""


allowed_instruments = {
    "Electric Bass (finger)": "bass-electric",
    "Electric Bass (pick)": "bass-electric",
    "Bassoon": "bassoon",
    "Cello": "cello",
    "Clarinet": "clarinet",
    "Contrabass": "contrabass",
    "Flute": "flute",
    "French Horn": "french-horn",
    "Acoustic Guitar (nylon)": "guitar-nylon",
    "Acoustic Guitar (steel)": "guitar-acoustic",
    "Electric Guitar (jazz)": "guitar-electric",
    "Electric Guitar (clean)": "guitar-electric",
    "Electric Guitar (muted)": "guitar-electric",
    "Reed Organ": "harmonium",
    "Orchestral Harp": "harp",
    "Rock Organ": "organ",
    "Church Organ": "organ",
    "Acoustic Grand Piano": "piano",
    "Bright Acoustic Piano": "piano",
    "Electric Grand Piano": "piano",
    "Honky-tonk Piano": "piano",
    "Electric Piano 1": "piano",
    "Electric Piano 2": "piano",
    "Soprano Sax": "saxophone",
    "Alto Sax": "saxophone",
    "Tenor Sax": "saxophone",
    "Baritone Sax": "saxophone",
    "Trombone": "trombone",
    "Trumpet": "trumpet",
    "Tuba": "tuba",
    "Violin": "violin",
    "Xylophone": "xylophone",
}
reversed_dict = {v: k for k, v in allowed_instruments.items()}

GM_INSTRUMENTS = [
    "Acoustic Grand Piano",
    "Bright Acoustic Piano",
    "Electric Grand Piano",
    "Honky-tonk Piano",
    "Electric Piano 1",
    "Electric Piano 2",
    "Harpsichord",
    "Clavinet",
    "Celesta",
    "Glockenspiel",
    "Music Box",
    "Vibraphone",
    "Marimba",
    "Xylophone",
    "Tubular Bells",
    "Dulcimer",
    "Drawbar Organ",
    "Percussive Organ",
    "Rock Organ",
    "Church Organ",
    "Reed Organ",
    "Accordion",
    "Harmonica",
    "Tango Accordion",
    "Acoustic Guitar (nylon)",
    "Acoustic Guitar (steel)",
    "Electric Guitar (jazz)",
    "Electric Guitar (clean)",
    "Electric Guitar (muted)",
    "Overdriven Guitar",
    "Distortion Guitar",
    "Guitar Harmonics",
    "Acoustic Bass",
    "Electric Bass (finger)",
    "Electric Bass (pick)",
    "Fretless Bass",
    "Slap Bass 1",
    "Slap Bass 2",
    "Synth Bass 1",
    "Synth Bass 2",
    "Violin",
    "Viola",
    "Cello",
    "Contrabass",
    "Tremolo Strings",
    "Pizzicato Strings",
    "Orchestral Harp",
    "Timpani",
    "String Ensemble 1",
    "String Ensemble 2",
    "SynthStrings 1",
    "SynthStrings 2",
    "Choir Aahs",
    "Voice Oohs",
    "Synth Voice",
    "Orchestra Hit",
    "Trumpet",
    "Trombone",
    "Tuba",
    "Muted Trumpet",
    "French Horn",
    "Brass Section",
    "SynthBrass 1",
    "SynthBrass 2",
    "Soprano Sax",
    "Alto Sax",
    "Tenor Sax",
    "Baritone Sax",
    "Oboe",
    "English Horn",
    "Bassoon",
    "Clarinet",
    "Piccolo",
    "Flute",
    "Recorder",
    "Pan Flute",
    "Blown Bottle",
    "Shakuhachi",
    "Whistle",
    "Ocarina",
    "Lead 1 (square)",
    "Lead 2 (sawtooth)",
    "Lead 3 (calliope)",
    "Lead 4 (chiff)",
    "Lead 5 (charang)",
    "Lead 6 (voice)",
    "Lead 7 (fifths)",
    "Lead 8 (bass + lead)",
    "Pad 1 (new age)",
    "Pad 2 (warm)",
    "Pad 3 (polysynth)",
    "Pad 4 (choir)",
    "Pad 5 (bowed)",
    "Pad 6 (metallic)",
    "Pad 7 (halo)",
    "Pad 8 (sweep)",
    "FX 1 (rain)",
    "FX 2 (soundtrack)",
    "FX 3 (crystal)",
    "FX 4 (atmosphere)",
    "FX 5 (brightness)",
    "FX 6 (goblins)",
    "FX 7 (echoes)",
    "FX 8 (sci-fi)",
    "Sitar",
    "Banjo",
    "Shamisen",
    "Koto",
    "Kalimba",
    "Bagpipe",
    "Fiddle",
    "Shanai",
    "Tinkle Bell",
    "Agogo",
    "Steel Drums",
    "Woodblock",
    "Taiko Drum",
    "Melodic Tom",
    "Synth Drum",
    "Reverse Cymbal",
    "Guitar Fret Noise",
    "Breath Noise",
    "Seashore",
    "Bird Tweet",
    "Telephone Ring",
    "Helicopter",
    "Applause",
    "Gunshot",
]


def get_file() -> Optional[Path]:
    if len(sys.argv) > 1:
        if sys.argv[1] == "--help":
            print(help_info)
            return None
        else:
            file = Path(sys.argv[1])
            assert file.is_file(), "Argument must be a file!"
            assert file.suffix == ".mid", "Need to use .mid file"
            return file
    else:
        mid_files = list(Path(".").glob("*.mid"))
        assert (
            len(mid_files) > 0
        ), "If no argument is supplied, you must have midi files in current folder"
        questions = [
            inquirer.List(
                "file", message="Choose the midi file to convert.", choices=mid_files
            )
        ]

        return inquirer.prompt(questions)["file"]


def main():
    file = get_file()
    if file is None:
        return

    midi_obj = midi_parser.MidiFile(file)

    print("Loaded File!")

    SkipAll = False

    valid_instruments = []
    for idx, instrument in enumerate(midi_obj.instruments):

        current_notes = sorted(instrument.notes, key=lambda n: (n.start, -n.pitch))
        max_time = max(t.end for t in current_notes)
        zeros = np.zeros(max_time)
        for n in current_notes:
            zeros[n.start : n.end] += 1

        if GM_INSTRUMENTS[instrument.program] in allowed_instruments:
            valid_instruments.append((instrument, max(zeros), idx))
        else:
            if SkipAll:
                continue
            questions = [
                inquirer.List(
                    "action",
                    message=f"Unsure which instrument...Do you want to skip or replace {GM_INSTRUMENTS[instrument.program]}?",
                    choices=["Skip", "Replace", "SkipAll"],
                ),
            ]
            answers = inquirer.prompt(questions)

            # If they choose to replace, provide the list to scroll through
            if answers["action"] == "Replace":
                replace_question = [
                    inquirer.List(
                        "replacement",
                        message=f"Choose a replacement option for instrument: {GM_INSTRUMENTS[instrument.program]}",
                        choices=list(set(allowed_instruments.values())),
                        carousel=True,  # Allows scrolling through the options
                    ),
                ]
                replacement_answer = inquirer.prompt(replace_question)

                instrument.program = GM_INSTRUMENTS.index(
                    reversed_dict[replacement_answer["replacement"]]
                )

                valid_instruments.append((instrument, max(zeros), idx))

            elif answers["action"] == "SkipAll":
                SkipAll = True

    mapping = {}
    running_idx = 0
    choices = []
    count = []
    for idx, (i, m, _) in enumerate(valid_instruments):
        if m >= 5:
            continue

        choices.append(
            f"{GM_INSTRUMENTS[i.program]} with {int(m)} simultaneous notes and {len(i.notes)} notes in song"
        )

        count.append(len(i.notes))

        mapping[running_idx] = idx
        running_idx += 1

    default = count.index(max(count))

    questions = [
        inquirer.List(
            "instrument",
            message="Choose the instrument to convert to the user_played instrument?",
            choices=choices,
            default=choices[default],
        ),
    ]

    chosen_idx = mapping.get(
        choices.index(inquirer.prompt(questions)["instrument"]), default
    )

    ticks_per_sec = midi_obj.ticks_per_beat * midi_obj.tempo_changes[0].tempo / 60
    data = []
    for idx, instrument in enumerate(valid_instruments):
        instrument_name = allowed_instruments[GM_INSTRUMENTS[instrument[0].program]]

        for i in instrument[0].notes:

            data.append(
                (
                    chosen_idx == idx,
                    instrument_name,
                    i.velocity,
                    i.pitch,
                    i.start / ticks_per_sec,
                    i.end / ticks_per_sec,
                )
            )

    data.sort(key=lambda x: x[4])

    with open(file.with_suffix(".csv"), "w", encoding="utf8") as f:
        f.write("user_played, instrument_name, velocity, pitch, start (s), end (s)\n")
        for i in data:
            f.write(",".join((map(str, i))) + "\n")

    print(f"Saved CSV as: {file.with_suffix('.csv')}")


if __name__ == "__main__":
    main()
