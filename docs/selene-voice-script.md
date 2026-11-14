# Selene's and Iris's voices

Recorded voices make the guides sound the same, calm and human on every computer. Every line a guide can say has a recording: the tours, the tip clouds, Say hello on the home page, and the lines that change with what the visitor picks (the example's name in the sky viewer, the spectrum in Cryostella). 113 lines in all.

## How it works

- `site/assets/voice/manifest.json` lists every recording as { guide, text, file }. `js/selene.js` loads it and plays a recording only when **the words on screen match it exactly** (spaces tidied).
- So when someone edits a line, its old recording simply stops playing and the line is silent (its words still appear) until it is recorded again. A guide can never say something different from the screen.
- The device's built-in voice is never used, because it sounds robotic.
- Voice is off until the visitor switches it on, because it would talk over a screen reader. The switch is in the tour card and in each tip cloud; they are the same setting, one per guide, and it is remembered. Say hello always speaks, since the visitor asked for it.
- The voice switch only appears when the guide has recordings.

## Adding or re-recording a line

1. Generate the line in ElevenLabs with the guide's voice (below), and save it as an MP3 in `site/assets/voice/`. Any file name works; the existing ones say where the line is used.
2. Add or update its entry in `manifest.json`: `guide` ("selene" or "iris"), `text` (the words exactly as on screen, with the normal spelling, such as SPHEREx), and `file`.
3. Reload the page. Only the step's words are recorded, not its title, because the words appear in step with the recording.

Spelling for speech: say "Sphere-ex" for SPHEREx, "three-eye Atlas" for 3I/ATLAS, "Wise oh-eight-five-five" for WISE 0855 and "R W Aurigae" for RW Aurigae. The manifest keeps the screen spelling.

## The voices

Made with ElevenLabs text to speech (Eleven v4 model, default settings) on 14 November 2026. Credited in each page footer and in `docs/ai-use-log.md`.

- **Selene:** library voice `flHkNRp1BlvT73UL6gyz` (listed in the library as "Jessica Anne Bogart - Eloquent Villain").
- **Iris:** ElevenLabs' Bella voice, `hpp4J3VqNfWAUOO0d1Us` ("Bella - Professional, Bright, Warm").

## Lines that will need re-recording when their wording changes

These were recorded while their wording still describes something temporary. When the text changes they go silent, so record the new words:

- Sky viewer tour: examples ("Pictures not ready yet"), practice, search ("Live search is not ready yet"), do-pick, do-watch, stage (practice pictures).
- Sky viewer tip: "Saving is not switched on in this version yet".
- Home tour: menu and places (more parts joining), soon ("on their way this weekend"), try (practice pictures), team (worded differently on another branch), go.
- Cryostella: the sound-key step ("for now these are practice ones") and the last game tip ("When real SPHEREx spectra are ready").
- Any new spectrum, example or guide adds new lines: record them the same way.

## Every recorded line

### Sky viewer tour, Selene (27)

| File | Words on screen |
| --- | --- |
| selene-tour-welcome.mp3 | Welcome to the sky viewer. It shows every picture the SPHEREx space telescope took of one patch of sky, in date order, so you can spot things that move or change. I'll walk you through it one page at a time, and you'll do the clicking. |
| selene-tour-steps.mp3 | The sky viewer works in three steps, and this bar always shows which one you are on: choose a patch of sky, watch it change, then your candidates. Step 2 opens once you have picked something. |
| selene-tour-examples-2a3d30.mp3 | Each card is a patch of sky prepared in advance. The headline one is comet 3I/ATLAS, a visitor from another star system. The others are nearby stars and brown dwarfs that move, or stars whose brightness changes. Cards marked Pictures not ready yet are still waiting for their SPHEREx data. |
| selene-tour-practice-d9f89b.mp3 | The last card holds practice pictures: made-up pictures for trying the viewer. They are not SPHEREx data, and the page always says so. |
| selene-tour-next-bar.mp3 | When you pick a card it is marked Selected, and this bar says what you picked. Nothing opens until you press Next, so you can change your mind first. |
| selene-tour-search-3f3fab.mp3 | If you know where to look, you can type a position in the sky here, as right ascension and declination. Live search is not ready yet, so for now the cards are the way in. |
| selene-tour-tips.mp3 | On every page I leave a short tip that says what to do next. If you don't need them, press Hide tips. |
| selene-tour-do-pick-43f4a4.mp3 | Click Practice pictures now. I'll use them to show you the viewer. |
| selene-tour-do-watch-b5754d.mp3 | Practice pictures is selected. Now click Watch it change in the step bar to move on to step 2. |
| selene-tour-stage-fdbe4e.mp3 | Every picture shows the same patch of sky. The small cross marks the position you chose: it is a pointer, not a discovery. The corners show the picture's number, status, date and colour. These are practice pictures, not real SPHEREx data. |
| selene-tour-mark.mp3 | If a picture is worth another look, press Mark as candidate. A candidate is something to check again, not a discovery. The line beside the button says which picture you would mark. |
| selene-tour-timeline.mp3 | Each mark is one picture, placed by its real date, so a gap in time shows as a gap. Its shape tells you what was seen: a solid disc is a clear detection, a half ring is faint, a plain ring is not detected and a dashed ring means no picture. |
| selene-tour-play.mp3 | Press Play to watch the pictures in date order. It stops at the last one. The arrows step one picture at a time, or jump to the first and the last. |
| selene-tour-more-open.mp3 | Some controls are tucked away to keep the screen calm. Click More controls to see them. If you don't need them now, choose Skip this part. |
| selene-tour-more-goto.mp3 | Type a picture's number here and press Go, or Enter, to jump straight to it. Handy when you want to look at one picture again. |
| selene-tour-more-speed.mp3 | Speed sets how fast Play moves through the pictures: Slow, Normal or Fast. It changes straight away, even while playing. |
| selene-tour-more-compare.mp3 | Compare two lays two pictures on top of each other. Choose a Then picture and a Now picture, then drag the divider across, or use the arrow keys. Each picture is a different colour, so a change in brightness is not always a real change. |
| selene-tour-more-labels.mp3 | Labels shows or hides the words in the corners of the picture: its number, status, date and colour. Hide them for a clear view of the sky. |
| selene-tour-tabs-about.mp3 | These four tabs hold the facts. About, open now, explains this target and what each shape means. Click Colour to open the next tab, or press Next. |
| selene-tour-tabs-colour.mp3 | SPHEREx sees infrared colours our eyes cannot. Drag along this bar to move through them. Each mark is one picture, and the sentence underneath says what was seen at that colour. Click Details next. |
| selene-tour-tabs-details.mp3 | Details describes the picture on screen: its date, colour, status, position and a link to it in the archive. Click Table next. |
| selene-tour-tabs-table.mp3 | Table lists every picture, one row each, with its date, colour, status and brightness. Screen readers can read it row by row and column by column. |
| selene-tour-strip.mp3 | Here are all the pictures side by side, each with its date and status. Pick one to jump straight to it. |
| selene-tour-do-candidates.mp3 | That's the viewer. Now click My candidates in the step bar to see where your marked pictures go. |
| selene-tour-candidates.mp3 | Pictures you mark as candidates are listed here. They are saved in this browser only, and a candidate is a picture worth another look, not a discovery. |
| selene-tour-again.mp3 | When you want more sky, go back to step 1 and pick another example. The step bar takes you to any step you have opened. |
| selene-tour-themes.mp3 | Last thing: switch between Light, Dark and Colour-blind friendly here. Everything works with a keyboard and a screen reader too. Enjoy exploring! |

### Home page tour, Selene (15)

| File | Words on screen |
| --- | --- |
| selene-home-tour-welcome.mp3 | I'm named after the Greek goddess of the Moon, and I look after this whole site. It lets you watch pictures from NASA's SPHEREx space telescope change over time, spot things that move, and explore the colours of light. Let me show you around. You'll do the clicking. |
| selene-home-tour-idea.mp3 | SPHEREx photographs the whole sky every six months, in 102 colours of infrared light. Put its pictures of one patch of sky in date order, and anything that moves or changes gives itself away. That idea is behind everything here. |
| selene-home-tour-menu-8974dd.mp3 | This menu sits at the top of every page: Home, the Sky viewer, Cryostella and My candidates. The soft pill shows where you are. On a phone the menu folds away behind the Menu button. |
| selene-home-tour-tours.mp3 | This is my tour of the whole site. Each part also has its own tour, led by its own guide: press Take the tour on any page to meet them. |
| selene-home-tour-try-df1adf.mp3 | This little game is the idea in twenty seconds: two pictures of the same patch of sky, and one spot that moves. The pictures are practice ones, drawn by our code. |
| selene-home-tour-do-blink.mp3 | Press Blink and watch the picture flick. Which spot jumps? You can pick it after the tour. |
| selene-home-tour-places-59c6db.mp3 | These are the parts of the site, each with its guide. I look after the sky viewer, where you watch real pictures change. Iris, goddess of the rainbow, looks after Cryostella, where you read, hear and play with the colours of light. |
| selene-home-tour-do-hello.mp3 | Press Say hello on Iris's card. She'll introduce herself, and I'll carry on when she's done. |
| selene-home-tour-soon-ccb458.mp3 | More parts are on their way this weekend: the Cosmic Orchestra with Orpheus, puzzles made from SPHEREx pictures, and Your Beginnings. They join the menu when they're ready. |
| selene-home-tour-candidates.mp3 | In the sky viewer you can mark a picture as a candidate: something worth another look, never a discovery. They're kept here, in this browser only. |
| selene-home-tour-skymap.mp3 | Each place you visit lights a star. It's kept in this browser only, and nothing expires, so take your time. |
| selene-home-tour-everyone.mp3 | Everything works with a keyboard and a screen reader. Every sound has words, every chart has a table, and nothing moves on until you choose. |
| selene-home-tour-team-48913e.mp3 | These are the six people who made this site, and me with it. Pawana leads the team. Each of them gets a moon of their own. |
| selene-home-tour-themes.mp3 | Switch between Light, Dark and Colour-blind friendly here. Your choice is kept for every page. |
| selene-home-tour-go-7df19d.mp3 | Open the Sky viewer or Cryostella. Its guide will take over from me with a tour of its own. |

### Sky viewer tips, Selene (15)

| File | Words on screen |
| --- | --- |
| selene-tip-pick-36494f.mp3 | Pick one of the examples below. Comet 3I/ATLAS is a good first one. Nothing opens yet, so you can change your mind. |
| selene-tip-empty-011e5f.mp3 | There are no pictures to show for this one yet. Go back and pick another example, or try the practice pictures below. |
| selene-tip-play-595a12.mp3 | Press Play under the picture to watch every picture in date order. You can also drag along the timeline, or use the arrow buttons. |
| selene-tip-mark-b369d3.mp3 | When a picture catches your eye, press Pause to stop on it. Then press Mark as candidate, just under the picture. |
| selene-tip-next-saved-385d43.mp3 | You marked a picture as a candidate. Mark more if you like. When you are ready, press Next to see your list. |
| selene-tip-next-unsaved-f3d089.mp3 | You pressed Mark as candidate. Saving is not switched on in this version yet, so the picture was not kept. When you are ready, press Next. |
| selene-tip-next-skip-6249d1.mp3 | No need to mark anything. When you are ready, press Next to see the My candidates page. |
| selene-tip-line-97e7e4.mp3 | Pictures you mark as candidates are listed here. A candidate is a picture worth another look, not a discovery. Ready for more sky? |
| selene-tip-picked-3i-atlas-a4c998.mp3 | You picked Comet 3I/ATLAS. Press Next to open it in the sky viewer. |
| selene-tip-picked-barnards-star-ece319.mp3 | You picked Barnard's Star. Press Next to open it in the sky viewer. |
| selene-tip-picked-epsilon-indi-b-b78e5e.mp3 | You picked Epsilon Indi B. Press Next to open it in the sky viewer. |
| selene-tip-picked-wise-0855-bd25a2.mp3 | You picked WISE 0855. Press Next to open it in the sky viewer. |
| selene-tip-picked-rw-aur-406ba6.mp3 | You picked RW Aurigae. Press Next to open it in the sky viewer. |
| selene-tip-picked-r-dra-513728.mp3 | You picked R Draconis. Press Next to open it in the sky viewer. |
| selene-tip-picked-practice-fb8e4e.mp3 | You picked Practice pictures. Press Next to open it in the sky viewer. |

### Cryostella tour, Iris (42)

| File | Words on screen |
| --- | --- |
| iris-cryostella-tour-welcome.mp3 | I'm the goddess of the rainbow, and a messenger of the gods. Welcome to Cryostella, the icy star, where we look for the marks ice leaves in the colours of light. I'll show you every step, and you'll do the clicking. |
| iris-cryostella-tour-name.mp3 | Cryo comes from the Greek for icy cold, and stella is Latin for star. Ice in the cold clouds where stars and planets form is one of the things SPHEREx was built to study. |
| iris-cryostella-tour-steps.mp3 | Cryostella has four short steps, and this bar shows which one you are on. You can jump to any of them, and the Back button works too. |
| iris-cryostella-tour-tips-5e0b92.mp3 | On every step I leave a tip that says what to do now. If you don't need them, press Hide tips. |
| iris-cryostella-tour-band.mp3 | This band is light, from violet on the left, past red, into infrared. The narrow rainbow is all our eyes can see. SPHEREx sees the long stretch on the right, out to 5 microns, in 102 colours. |
| iris-cryostella-tour-do-walk.mp3 | Drag the slider to the right, past red, into the infrared. Take your time: watch the swatch and the words change as you go. |
| iris-cryostella-tour-readout.mp3 | The micron number, the colour's name and a sentence follow the slider. In the infrared the swatch turns striped: a colour we cannot see. |
| iris-cryostella-tour-do-read.mp3 | Click Read a spectrum in the step bar. |
| iris-cryostella-tour-chart.mp3 | It shows how bright the light is at each colour: colour along the bottom, brightness up the side. Each dot is one picture SPHEREx took, at one colour. Triangles mark the bumps and dips: filled for a bump, outlined for a dip. |
| iris-cryostella-tour-do-explore.mp3 | Move this slider a few steps, by dragging or with the arrow keys. The ring walks along the curve, and the line underneath reads out each point. |
| iris-cryostella-tour-more.mp3 | This opens the full list of bumps and dips, whether each one has been checked, and every number as a table, for screen readers too. |
| iris-cryostella-tour-do-hear.mp3 | Click Hear it in the step bar. |
| iris-cryostella-tour-key-fce8a3.mp3 | Every sound has words, written here from our sound key. The team chooses the sounds; for now these are practice ones. |
| iris-cryostella-tour-settings.mp3 | Sound settings has two sliders. Sweep length is how many seconds the sound takes to go from the shortest colour to the longest: slower makes small dips easier to hear. Volume sets how loud it plays. |
| iris-cryostella-tour-do-game.mp3 | Click Name that spectrum in the step bar. |
| iris-cryostella-tour-mystery.mp3 | Press Play the mystery spectrum and listen, as often as you like. |
| iris-cryostella-tour-look.mp3 | Rather look than listen? Show the mystery graph: no names and no marks, just its shape. |
| iris-cryostella-tour-answer.mp3 | Then choose: a cold cloud, with dips, or a comet, with bumps. Three rounds, and no timer. |
| iris-cryostella-tour-end.mp3 | Come back to any step from this bar, and press Take the tour whenever you'd like me again. Enjoy the colours! |
| iris-cryostella-tour-practice-fe40d1.mp3 | All the spectra here are real SPHEREx data: Elias 16, a star behind an icy cloud; Comet 3I/ATLAS, December 2025; and Comet 3I/ATLAS, August 2025. |
| iris-cryostella-tour-pick-757a18.mp3 | Here are 3 real SPHEREx spectra. The tick shows which one is open. We'll start with this one, and you can read the others after. |
| iris-cryostella-tour-about-7ab0e8.mp3 | This line says what Elias 16 is and how many pictures went into its curve. A dip is marked near 3.05 microns. The team has not checked yet what causes it, so I won't guess. |
| iris-cryostella-tour-challenge-269009.mp3 | Now my tip sets you a challenge: find the dip near 3.05 microns, where the curve drops. |
| iris-cryostella-tour-do-find-6241d7.mp3 | Move the ring into the dip near 3.05 microns. You'll know when you've found it. |
| iris-cryostella-tour-sonify-828d1f.mp3 | Here Elias 16, a star behind an icy cloud becomes sound. It is a sonification: sounds mapped by rules we chose, not the sound of the object. A line moves across the graph while it plays, from the shortest colour to the longest. |
| iris-cryostella-tour-do-play-e508ef.mp3 | Press Play the spectrum and listen to the end. The dip near 3.05 microns comes about halfway through: the sound key below says how it is marked. |
| iris-cryostella-tour-do-other-1-1e5a74.mp3 | There are 2 more spectra to read. Click Comet 3I/ATLAS, December 2025 and I'll tell you what to look for. Or choose Skip this part to go on. |
| iris-cryostella-tour-about-8f9a84.mp3 | This line says what 3I/ATLAS, December 2025 is and how many pictures went into its curve. No bumps or dips are marked on this one yet, so read its shape: where does it rise, and where does it drop? |
| iris-cryostella-tour-challenge-100470.mp3 | On this one my tip has no challenge: nothing is marked yet, so there is nothing to hunt for. It asks you to look at the shape instead. |
| iris-cryostella-tour-sonify-cf903f.mp3 | Here Comet 3I/ATLAS, December 2025 becomes sound. It is a sonification: sounds mapped by rules we chose, not the sound of the object. A line moves across the graph while it plays, from the shortest colour to the longest. |
| iris-cryostella-tour-do-play-3ccca4.mp3 | Press Play the spectrum and listen to the end. Nothing is marked on this one, so follow how the sound changes as the curve rises and drops. |
| iris-cryostella-tour-do-other-2-3f3334.mp3 | There is one more spectrum to read. Click Comet 3I/ATLAS, August 2025 and I'll tell you what to look for. Or choose Skip this part to go on. |
| iris-cryostella-tour-about-9768fe.mp3 | This line says what 3I/ATLAS, August 2025 is and how many pictures went into its curve. No bumps or dips are marked on this one yet, so read its shape: where does it rise, and where does it drop? |
| iris-cryostella-tour-sonify-0dd379.mp3 | Here Comet 3I/ATLAS, August 2025 becomes sound. It is a sonification: sounds mapped by rules we chose, not the sound of the object. A line moves across the graph while it plays, from the shortest colour to the longest. |
| iris-cryostella-tour-do-hear-other-2078ba.mp3 | Want to hear how a different one sounds? Click Comet 3I/ATLAS, December 2025, then play it too. Or choose Skip this part. |
| iris-cryostella-tour-do-play-other-5603cb.mp3 | Press Play the spectrum and listen to 3I/ATLAS, December 2025. Nothing is marked on this one, so follow how the sound changes as the curve rises and drops. Does it sound different from the last one? |
| iris-cryostella-tour-do-play-other-8a0bfb.mp3 | Press Play the spectrum and listen to 3I/ATLAS, August 2025. Nothing is marked on this one, so follow how the sound changes as the curve rises and drops. Does it sound different from the last one? |
| iris-cryostella-tour-do-other-2-7ae16f.mp3 | There is one more spectrum to read. Click Comet 3I/ATLAS, December 2025 and I'll tell you what to look for. Or choose Skip this part to go on. |
| iris-cryostella-tour-do-other-1-d2abcf.mp3 | There are 2 more spectra to read. Click Elias 16, a star behind an icy cloud and I'll tell you what to look for. Or choose Skip this part to go on. |
| iris-cryostella-tour-do-hear-other-636603.mp3 | Want to hear how a different one sounds? Click Elias 16, a star behind an icy cloud, then play it too. Or choose Skip this part. |
| iris-cryostella-tour-do-play-other-d4677b.mp3 | Press Play the spectrum and listen to Elias 16. The dip near 3.05 microns comes about halfway through: the sound key below says how it is marked. Does it sound different from the last one? |
| iris-cryostella-tour-do-other-2-499899.mp3 | There is one more spectrum to read. Click Elias 16, a star behind an icy cloud and I'll tell you what to look for. Or choose Skip this part to go on. |

### Cryostella tips, Iris (12)

| File | Words on screen |
| --- | --- |
| iris-tip-c-walk-6900e3.mp3 | Hi, I'm Iris, goddess of the rainbow. Welcome to Cryostella, the icy star, where we look for ice in the colours of light. Each colour has a wavelength, measured in microns. Drag the slider under the rainbow to the right, past red. |
| iris-tip-c-ir-278874.mp3 | Past red, our eyes see nothing, but SPHEREx keeps going, out to 5 microns, in 102 colours. Ice and gas can leave marks in these colours. Press Next to learn how to read them. |
| iris-tip-r-explore-264217.mp3 | This graph is a spectrum: how bright something is at each colour. Move the slider under the graph, and the ring walks along the curve. |
| iris-tip-r-find-bdd756.mp3 | Now a challenge: find the dip near 3.05 microns, where the curve drops. Move the ring into it. |
| iris-tip-r-found-dip-f20607.mp3 | You found a dip! Less light arrived at that colour, as if something soaked it up. In a cold cloud, ice can do that, but the team has not checked yet what causes this one. Try another spectrum, or press Next. |
| iris-tip-r-found-bump-13700c.mp3 | You found a bump! More light arrived at that colour. Around a comet, glowing gas can do that, but the team has not checked yet what causes this one. Try another spectrum, or press Next. |
| iris-tip-r-open-f2533a.mp3 | No bumps or dips are marked on this one yet, so there is nothing to hunt for. Look at its shape instead: where does it rise, and where does it drop? Then try another spectrum, or press Next. |
| iris-tip-h-play-cd2ad5.mp3 | Now listen to a spectrum. Press Play the spectrum. What each sound means is written just under the player, and a line shows where it is on the graph. |
| iris-tip-h-heard-3232e0.mp3 | Did you hear it change where the graph changes? Play the other spectrum to compare, or press Next for a listening game. |
| iris-tip-g-play-75875b.mp3 | A listening game: press Play the mystery spectrum, then choose cloud or comet. You can play it as often as you like. If you prefer to look, choose Show the mystery graph. |
| iris-tip-g-done-183895.mp3 | That's all three rounds. Well played! When real SPHEREx spectra are ready, they will be here to explore. Want more sky? The sky viewer is waiting. |
| iris-tip-r-find-69ed29.mp3 | Now a challenge: look at its shape: where it rises and where it drops. Move the ring into it. |

### Say hello (home page) (2)

| File | Words on screen |
| --- | --- |
| selene-hello-a01a98.mp3 | Hi, I'm Selene, goddess of the Moon. Come and watch the sky change, and spot what moves! |
| iris-hello-148d9a.mp3 | Hi, I'm Iris, goddess of the rainbow. Come and see the colours your eyes can't, and hear them too! |

