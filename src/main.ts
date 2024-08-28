/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";

import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";
import { renderSongSelection, showSongSelection } from "./view";

// The following simply runs your main function on window load.  Make sure to leave it in place.
// You should not need to change this, beware if you are.
if (typeof window !== "undefined") {
	// Load in the instruments and then start your game!
	const samples = SampleLibrary.load({
		instruments: [
			"bass-electric",
			"bassoon",
			"cello",
			"clarinet",
			"contrabass",
			"flute",
			"french-horn",
			"guitar-acoustic",
			"guitar-electric",
			"guitar-nylon",
			"harmonium",
			"harp",
			"organ",
			"piano",
			"saxophone",
			"trombone",
			"trumpet",
			"tuba",
			"violin",
			"xylophone"
		], // SampleLibrary.list,
		baseUrl: "samples/",
	});

	Tone.ToneAudioBuffer.loaded().then(() => {
        for (const instrument in samples) {
            samples[instrument].toDestination();
            samples[instrument].release = 0.5;
        }
    });

	renderSongSelection(samples)
	showSongSelection()
}
