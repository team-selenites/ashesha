# Viewer design direction

Team Selenites, 10 November 2026. Owner: Pawana. Draft for the team to react to.

## Who and where

A judge or student on a laptop in a dim hackathon hall at night, or a blind visitor at home with a screen reader. They pick a target and want to see it move or change within seconds. Light is the default since 11 November 2026 (Pawana); it was Dark before. Dark and Colour-blind friendly stay as approved.

## What we borrowed, and from where

| Idea | Seen in | How we use it |
| --- | --- | --- |
| The picture is the hero; one timeline sits right under it | NASA Worldview, Zoom Earth, Windy, RainViewer (time-lapse imagery players) | A black "stage" with the timeline directly below, like a video scrubber |
| Ticks placed by real date, with gaps shown | Weather radar timelines (past vs forecast marker) | The comet's August and December chapters show as two clusters with a marked gap, so time is not faked |
| Click anywhere on the track to jump; speed control kept | RainViewer, Windy community feedback | Click or drag the timeline; Slow, Normal, Fast stay |
| Then and Now divider | ESA/Webb "Slider Tool" (Hubble vs Webb) | Compare any two images with a draggable divider, also usable by keyboard |
| Quiet labels over the picture | NASA Eyes on the Solar System | Image number, status, date and colour sit in the corners of the stage; an overlay switch hides them |
| Motion rules | Emil Kowalski, "Great Animations" | Under 300 ms, ease-out, interruptible; nothing animates on keyboard steps; playback cuts hard, like an astronomer's blink comparison |

## Placement

- Wide screens: search, examples and the label key in a left column; the viewer fills the right. The viewer is visible without scrolling.
- Phones: search, examples, viewer, key, in that order. After picking an example the page scrolls to the viewer.
- Order inside the viewer: stage, timeline, playback buttons, then the strip, the colour slider beside the image details, then the table.

## Less on screen at once (10 November, after Pawana's review)

- The facts sit in four tabs beside the picture: About (summary, groups of dates, the shape key), Colour, Details and Table. One at a time, so a newcomer is not handed everything at once.
- The separate "What the labels mean" section moved into the About tab, next to the picture it explains. The left column is now search and examples only, so both columns end at about the same height.
- Keyboard help for the timeline is read out to screen readers instead of printed under the controls.

## One step per screen (11 November, after Pawana's review)

The single page felt crowded: search, examples, viewer, tabs, strip and candidates all competed at once. It is now three steps, each on its own screen:

1. **Choose a patch of sky**: the examples first (the comet gets the full row), then the coordinate boxes.
2. **Watch it change**: the viewer, with the tabs beside the picture from 960 px wide.
3. **My candidates**.

Why this shape, and not a longer step-by-step wizard:

- GOV.UK's "one thing per page" rule: one decision per screen is easier to take in, especially for people new to the subject.
- Nielsen Norman Group on wizards: step-by-step suits newcomers, but a wizard is wrong when people need to move back and forth between steps, or for experts. Watching, comparing and marking need to stay together, so step 2 stays one screen; in their hotel-booking example two screens beat both one screen and five.
- Their progressive disclosure advice: show the core controls first and put the rest behind one clearly named control, no more than two levels deep. Speed, Compare two, Labels and Go to image now sit behind **More controls**.

How it behaves:

- A step bar under the title always shows the three steps and which one is on screen (`aria-current="step"`). The steps are not locked: judges can jump straight to any of them. On phones only the current step's name is written out; the others are numbers (their names stay readable to screen readers).
- Every step after the first has a named way back ("Choose another patch of sky", "Back to the sky viewer"), and step 2 ends with "Next: My candidates".
- Each step has its own address (`#choose`, `#watch`, `#my-candidates`), so the browser's Back button works. `?target=` links still open straight on step 2, and `#watch/<id>` works too.
- Picking an example moves to step 2. Focus lands on the new step's heading and the page title changes, so screen readers say where you are. The new screen fades in for 220 ms; nothing moves with reduced motion. Playback stops when you leave step 2.
- Past step 1 the header shrinks (smaller title; the introduction and the tour button wait on step 1) so the picture sits higher.
- Selene's tour opens the screen each of its steps talks about.
- Without JavaScript the three sections stay on one page, in order.

### Selene on every step (11 November, later)

- Each step opens with Selene beside a small thought cloud that says what to do on that screen and gives the way to the next one: step 1 "pick an example below"; step 2 "press Play, mark what catches your eye" with **Next: My candidates** (before anything is loaded it offers **Choose a patch of sky** instead); step 3 explains candidates and offers **Choose another patch of sky**. The words are in `viewer.html` (the sky viewer's page since 12 November; it was `index.html`), one paragraph per situation, so they can be edited without touching code (`js/guide.js`).
- It sits in the page beside the step heading (under it on phones), so it never covers anything and never pops up. Her lips move silently while a new tip appears; reduced motion keeps her still. **Hide tips** folds all three away into a small "Show Selene's tip" button for the rest of the visit; the tips are back on the next visit. While the tour is open, the guide waits, so there is only one Selene on screen.
- The cloud is the tour's cloud (shared drawing in `js/cloud.js`), without the smallest sparkle, which would sit on the words in a small cloud. On phones a lobed cloud would be tall and narrow, so the words sit in a rounded thought box with the same colours, edge and glow.
- The tour card now keeps off the step bar: its welcome card goes below the bar when the middle of the screen would cover it, and beside-the-part positions that would sit on the bar are tried last.

### Nothing moves on by itself (11 November, after Pawana's review)

Every move between steps is the visitor's own click, and each step is split into small parts that Selene names one at a time ("Step 2 · Part 1 of 3").

- **Step 1, part 1:** pick an example. Picking only selects it ("Selected"); nothing opens, so the visitor can change their mind. Practice pictures are the last choice, set apart with a dashed edge.
- **Step 1, part 2:** the Next bar under the examples says "You picked Comet 3I/ATLAS. Press Next to open it in the sky viewer." The bar stays at the bottom of the screen while step 1 scrolls, so Next is always in reach. Selene says the same, with her own Next button.
- **Step 2 is locked** in the step bar (dashed) until something is picked. Asking for it early brings the visitor back to step 1 with "First pick an example above. Then press Next to open it." and focus on the first example.
- **Step 2, part 1:** press Play (or drag the timeline). **Part 2:** pause on a picture that catches your eye and press Mark as candidate; "Skip marking" is there for anyone who does not want to. **Part 3:** press Next to see My candidates. If saving is not switched on yet, Selene says honestly that the picture was not kept.
- Whatever Selene is asking for has a still pink ring (Next, Play, Mark as candidate, then her Next), so the eye goes straight to it. Nothing pulses.
- `?target=` links still open straight on step 2, as the rules require.
- The viewer tells the page what the visitor did with one event, `selenites:viewer` (`loaded`, `play`, `pause`, `move`, `marked`, `cleared`); `js/guide.js` listens to it.

### The tour, page by page (11 November, after Pawana's review)

The tour follows the site in the order a visitor uses it, and the visitor does the moving on:

1. **Welcome** (2 parts): Selene introduces herself, then the step bar.
2. **Step 1, Choose a patch of sky** (7 parts): the example cards, the practice pictures, the Next bar, the position boxes and Selene's tips; then *your turn*: click Practice pictures; then *your turn*: click Watch it change in the step bar.
3. **Step 2, Watch it change** (8 parts): the picture, Mark as candidate, the timeline, Play and the arrows, More controls, the tabs and the strip; then *your turn*: click My candidates in the step bar.
4. **Step 3, My candidates** (3 parts): the list, how to explore more, and the colour switch to finish.

- The card says where it is: "Step 2 of 3 · Watch it change · 3 of 8".
- On a *your turn* step there is no Next button. Only the highlighted control can be clicked (the rest of the page is made inert), focus goes to it so keyboard users can press Enter, and the tour carries on once the click has happened. Back and Skip still work.
- The tour is a non-modal dialog plus `inert` on everything else, which acts like a modal dialog but can leave one control usable. Escape closes it.
- **The card never covers the part it explains or the step bar, and is always fully on screen.** Several scroll positions are tried (the part centred, at the top, at the bottom), first for a spot beside the part and clear of the step bar, then for any spot beside the part. If the part sits just above the step bar, the card goes under the bar; with nothing to point at on a short screen, the page scrolls just past the bar. If the part is too tall to fit with the card, only its visible top is lit and the card sits below it.
- After every step change, once the page stops scrolling, a last check makes sure the whole card (and the lit part, when both fit) is on screen, and scrolls just enough if not.
- During the tour the Next bar on step 1 scrolls with the page instead of sticking to the bottom of the screen, so the spotlight stays on it. When the tour points at Selene's tip cloud, the cloud shows (her own figure in the tip stays hidden, so there is one Selene).
- Checked step by step at 1700 x 860, 1440 x 820, 1366 x 640 and phone width (375 x 812). On phones the card is a sheet along the top or bottom; very tall parts (the example cards, the position boxes, the picture) are partly under it there.
- Recorded voice files are now named after each step (`selene-tour-welcome.mp3` and so on), and the script in `docs/selene-voice-script.md` was regenerated for the 20 lines.

- On a *your turn* step a painted arrow runs from Selene's thought cloud to the control to click. It is drawn fresh for each step: it starts on the edge of the cloud nearest the control, bends gently upwards and ends just outside the control, so its length and curve follow where the two are (a taller hop when they are close). Brush look from an SVG filter: a see-through wash, a solid body and a darker core, in one colour family per theme (plum in Light, lavender in Dark, yellow in Colour-blind friendly), with no white and no shadow. It paints itself in, then nudges towards the control; still for reduced motion. On these steps the card keeps a wider gap from the control (72 px instead of 26) when it fits, so the arrow has room. Drawn in code; Pawana's watercolour arrow picture was only a reference.
- **Hands-on parts, each with "Skip this part":** *More controls*: the visitor clicks it open, then Selene explains Go to image, Speed, Compare two and Labels one by one. *The tabs*: the visitor clicks Colour, Details and Table in turn, and Selene explains each panel while it is open (the whole panel is lit; only the next tab can be clicked). These steps use a slimmer card (500 px) so it fits beside the tall panel. There is no arrow here (it crossed the whole panel): the tab to click pulses gently in the theme's colour, its name is highlighted in Selene's cloud, and Next works too (it opens that tab).
- In Selene's words, the control to click is highlighted (`[name]` in the step text in `js/tour.js`); it is read and spoken as plain text.
- A part as wide as the page and too tall to share the screen with the card (the example cards) gets a wide, short card (980 px, the words in two or three long lines), so the whole part is lit with the card below it. Only if even that does not fit does the light end below the last whole row, never halfway through a card.
- Step changes run in a set order: the old card fades out, then the page is set up for the next step (a panel opened, a tab chosen), then the light glides there. Moving from More controls to the tabs no longer snaps More controls shut, which had made the page jump under the moving light. The light's edge, outline included, stays clear of the next control, and the rings from Selene's tips ("press Play") wait while the tour runs.
- The lit shape follows the part's own corners (a pill stays a pill), and the Light theme's background clouds are hidden during the tour, because they showed through the lit part as white blobs.
- The spotlight hugs the part: its margin is never more than half the gap to a neighbouring element, so it no longer cuts into the controls next to it (the timeline used to clip the Play row).
- The tour moves focus itself at every step. Browsers then often drew the keyboard focus ring (yellow in the tour) even for mouse users. Now, after a click or tap, focus moves quietly with no ring; after a key press the ring always shows, so keyboard users never lose their place.
- The card's label uses the same words as Selene's tips: "Step 2 of 3 · Part 3 of 8".

### Design review (11 November, with the impeccable and ui-ux-pro-max checklists)

Checked in Light, Dark and Colour-blind friendly on all three steps, at 1440 px and 375 px: text contrast at least 4.5:1, every control at least 44 x 44 px, no sideways scrolling, headings in order, every image has alt text, no em dashes in the copy, no bounce easing or layout-property animation. Fixed:

- **No surprise dead end.** Six of the seven examples have no SPHEREx pictures yet. Their cards now say "Pictures not ready yet" (dashed dot and words, not colour alone), and picking one says the viewer will be empty and that Practice pictures work now. Selene's tip and the tour say the same.
- **One primary action per screen.** "Show images" (live search, not ready) is now a quiet secondary button, so Next is the one strong button on step 1.
- **No repeated intro.** "Pick an example and the viewer opens on the next screen" was removed: the header, the Next bar and Selene's tip already say it, and it was no longer true (Next opens the viewer).
- **Tokens, not raw colours.** The main button inside Selene's clouds and the tour now uses `--cta-bg`, `--cta-ink` and `--cta-line`, set per theme.

Left as they are, for the team to decide: some small labels are 12 to 13 px (timeline dates, picture dates, the tour's step label); other parts of `app.css` still use raw colours (the theme switch scenes and the always-dark picture stage); there is no PRODUCT.md or DESIGN.md yet for design tools to read.

### Typing in the clouds

Selene's words used to appear a few letters at a time in an overlay copy of the text, so a half-typed word at the end of a line jumped down once it no longer fitted. Now every letter is laid out first (invisible), so the lines are fixed from the start, and the letters fade in one at a time, evenly spaced, with a blinking caret after the last. When she finishes, the letters are joined back into plain text for screen readers and copying. The same typing is used in the tour cloud and in her tips on each step (`SeleneType` in `js/cloud.js`). Reduced motion shows the words at once.

The letters flow at the pace she is speaking, on a steady 30 ms beat. With her voice on, the device voice reports one word at a time; the typing no longer waits for each word but follows her measured speaking pace and may run up to a word ahead, so there is no pause between words (about 20 letters a second with the voice, about 60 without).

### Colour theme and cursor

- The theme switch is labelled **Colour theme** (it was "Colours", which read as if it were about the pictures). "System theme" was not used: it usually means following the device's own light or dark setting, which this switch does not do.
- Each theme has its own small arrow cursor, 28 px, with a contrasting edge so it shows on every background, including the dark picture: plum in Light, lavender in Dark, yellow in Colour-blind friendly (a plain arrow; an earlier sparkle by its tail was removed). The hand over clickable things and the text bar in typing boxes stay the system ones, so it is always clear what can be clicked. High contrast and forced colours keep the system cursor. Note for the accessibility test: a custom cursor ignores the device's cursor size setting.

### Refreshing starts at step 1

A refresh always opens step 1 completely fresh, with nothing picked (keeping an old pick, such as the tour's practice pictures, greeted visitors as if they had chosen it). Opening a shared `?target=` link fresh still goes straight to step 2, as the rules require.

### Twinkling stars in Dark

In Dark, three extra layers of tiny stars brighten and dim slowly, out of step with each other (cycles of 5.3, 7.1 and 8.9 seconds, never fully off), so now and then a few stars glow a little more while others fade. It runs all the time, with no pause button: Pawana's decision on 11 November 2026, kept deliberately subtle so it does not draw the eye. Nothing moves with reduced motion; the layers are hidden in high contrast, forced colours and print.

This is a deliberate exception to "Do not animate by default" (RULES section 10) and to "nothing moves for more than 5 seconds without a pause control" in `docs/viewer-accessibility-spec.md`; WCAG 2.2.2 (Pause, Stop, Hide) also asks for a way to stop motion that lasts longer than 5 seconds. Visitors who are bothered by it can choose Light or Colour-blind friendly, which have no twinkle, or turn on reduced motion in their device settings. Yeabisra should check it during the accessibility test.

### Selene blends into the page

The cut-out ends in a straight line at her waist, which looked like a picture pasted on the page. Her lower third now fades out softly (a CSS mask). After Pawana's review the glow around her (gold in Colour-blind friendly) and the haze behind her were removed: she stands on the page with no halo. The Colour-blind friendly cloud glow is now soft white instead of yellow. This applies in the tour and the step guide.

## Selene's tour

- A seven-step tour led by Selene: welcome, examples, the picture, the timeline, the strip, the tabs, the colour themes.
- It starts only when asked: the "New here?" button in the header or the button in the empty viewer. A tour that pops up by itself disorients screen reader users and slows down judges who already know what to do.
- It is a real dialog: focus moves in, Escape closes it, each step is read out.
- The spotlight and the card are pinned to the page, not the screen, so they stay exactly on their part while the page scrolls (a fixed overlay redrawn after each scroll trails a frame behind and slides). The dimming is one element with a huge shadow around a rounded hole, as in Intro.js.
- Step changes run in order, as in Driver.js: the card fades out, the page scrolls the next part into view while the spotlight glides to it (about half a second, easing out), the card fades in beside the part, then Selene talks. The card's place is worked out for where the part will be after the scroll, so it never moves again.
- The card never sits on the part it explains: it goes beside it (right, then left), then below or above; if nothing fits it takes the corner that covers least. A trail of two small moons points at the part. On phones it is a sheet on whichever side of the screen is free, and the page scrolls the part into the space left. The card keeps the same width on every step, and the space for the words is reserved first, so it never grows while Selene speaks.
- She speaks from a cloud: soft scalloped edges (fluffier on top) with the face of the Moon in it, two dark seas and a few craters kept towards the edges so the words stay crisp. It changes with the theme: moon-grey in Dark, pink-white in Light, white with a yellow edge in Colour-blind friendly.
- Her voice is a speaker button (muted or speaking icon; small bars move while she talks, so it can be seen as well as heard). It reads each step calmly, one sentence at a time with a soft pause between, slightly slower than normal, using the most natural voice the device has (Edge's "Natural" voices first). It is off until the visitor turns it on, because it would talk over a screen reader. The words on screen are the captions.
- Fateme's recorded voice can replace the device voice: put `selene-tour-1.mp3` to `selene-tour-7.mp3` in `site/assets/voice/` and set `RECORDED = true` in `site/js/tour.js`. The words then follow the recording and Selene's lips follow its loudness. Not yet tested with a real recording.
- The card is wider than before (620 px, 740 px for the welcome) so Selene can be shown large enough to see her lips; she stands at the bottom of the card, beside the buttons.

## Selene herself

Now (10 November, late): Selene and her moon, cut out of a Gemini picture made on a flat green background (credited in the footer, logged in `docs/ai-use-log.md`). No frame, no box, no background: only her and the moon, with a soft glow in the theme's colour.

- **Her lips move with her words.** A small WebGL "rig" bends the picture itself, the way 2D game characters are rigged (Live2D), but on one picture: the lower lip and chin drop, the corners stay put, the upper lip lifts a little, and a dark mouth with a hint of teeth shows in the gap. Rounded sounds (o, u, w) narrow the mouth, stretched ones (e, i, s) widen it, and m, b, p close it. The mouth is worked out letter by letter from the word being said:
  - with her voice on, from the word the device voice is saying at that moment (most voices report each word), at the speed the voice is actually speaking;
  - with a recording, from its loudness;
  - with her voice off, while the words type out, at a speaking pace, like a character in a game.
- **She blinks** every few seconds while talking (now and then twice): the eyelid skin stretches down until the lashes meet the lower lid.
- Where her mouth and eyes are was measured on a zoomed copy of the picture (`RIG` in `site/js/selene.js`). A new picture needs new measurements.
- She only moves while she talks and for a moment after; reduced motion shows the still picture. Without WebGL she is the still picture.
- **Her hand explains.** Her raised hand is a separate layer (the moon behind it was painted in), turned at the wrist. As she talks it opens towards the cloud, settles into a new pose every few words and gives small beats on words, then rests when she stops. It moves on a soft spring, so it eases in and follows through without wobbling.
- Her raised hand and the moon always face the cloud, so on the right of the cloud she is shown mirrored. When she changes sides she fades across instead of jumping.
- The thought bubbles: three bubbles rise on a gentle arc from her head to the cloud, smallest nearest her, placed from where her head and the cloud really are. They puff out one after another at each step and float softly while she talks.
- Phones show her from the chest up with her raised hand, close enough to see her lips and hand move.
- The small round portraits (header button, empty viewer) show her face in front of a full moon.

Lip-sync, made clearer on 12 November: her mouth opens wider (11.5 px instead of 8 on the picture), the upper lip lifts more, rounded sounds (o, u, w) and stretched ones (e, i, s) change the mouth's shape much more and faster, and some words are said more fully than others, so it reads as speech rather than a plain open and close.

Next (planned): a fully animated Selene. Each tour step plays a clip of her talking and gesturing, made on a flat green background with free tools (Dreamina's OmniHuman for the animation, recorded or generated voice) and keyed out live in the page. The player is built and tested with a test clip; the recipe is in `docs/selene-animation-recipe.md`. Her voice script and how to add recordings are in `docs/selene-voice-script.md`. The thought cloud is a real cloud: round lobes of different sizes, an ink outline, a trail of three circles to Selene, and the buttons below it.

Before the cut-out, the Gemini watercolour portrait was shown with softly faded edges in front of a moon drawn by the page; it stays in the site only as a fallback. The code-drawn versions described below were retired.

### Earlier, code-drawn versions (retired)

- An original character drawn in code (`site/js/selene.js`) as a painted, semi-realistic portrait of an adult woman: classical proportions, a straight Greek nose, full lips, calm heavy-lidded eyes. No outside artwork is used, so there is nothing to license. A found-online watercolour was only mood inspiration and is not in the repository.
- Her look comes from ancient art of Selene: a crescent on her brow (the lunate crown), and her raised hand holding the edge of a veil that billows over her head (the velificatio on Roman sarcophagi). Third version (10 November): painted in watercolour, reaching up towards the full Moon, with long dark curls, a gold laurel crown around a silver crescent, a gold earring, a pearl chiton, purple drapery and a gold belt. The pose and palette take their mood from the watercolour Pawana shared; nothing from it is copied.
- She is drawn in three layers: a watercolour ground (wash, splashes, stars, the Moon) and a paper grain, both drawn once, with Selene alone redrawn while she moves, so it stays fast.
- Hades II also has a Selene (white eyes, a pegasus, moons on her dress). Ours is designed to be clearly different: natural grey-violet eyes, no pegasus, no moons on her dress.
- She is the same goddess in every theme. Only the light around her changes: a silver moon in Dark, a dawn-pink moon and wash in Light, a gold-edged veil in Colour-blind friendly.
- How she moves, learned from Live2D (the system behind many 2D game characters) and Duolingo's Rive characters:
  - A rig of layers driven by a few numbers each frame: head angle, breath, eye opening, where the eyes look, brow, mouth open and mouth shape.
  - Parallax: when her head turns, her face moves a little more than her hair behind, so she feels three-dimensional.
  - Spring physics: her curls ripple down their length and lag behind her head; her arm sways gently from the elbow; the veil billows from the hand that holds it.
  - Life while talking: blinks (sometimes double), small quick eye movements, a nod now and then on a new word, a lifted brow on a question.
  - Lip-sync: the mouth is calculated from two numbers (how open, how round or wide) and blends smoothly between letters; the jaw drops as she opens; teeth and tongue show when the mouth is open.
- She only moves while she talks, then settles and stops. Reduced motion keeps her still. Measured at about 60 frames a second in the in-app browser.
- Limits, honestly: this is still vector art made in code. Game-level art (Genshin, Hades) needs an illustrator and a rigging tool such as Rive or Live2D; the same parameters would carry over.
- Next: Fateme's recorded narration can replace the device voice (the mouth would follow the loudness of the recording). The plan's supporting characters (Iris for colours, Orpheus for sound, Argus Panoptes for the 102 colours) can be built on the same rig. Gemini prompts for them, with the green-screen rules, are in `docs/character-prompts.md`.

## One signature moment

When a target loads, the stage's corner marks close in on the centre, as if the telescope is locking on. It plays once per target, lasts about half a second, and becomes a plain fade for reduced motion.

## Still honest

- The centre cross marks the position that was searched, not a detection.
- The colour slider track shows a status mark at each image's colour, so a cluster of solid discs shows where the object is clear. No colour words are claimed until the data is checked.
- The compare view repeats that a brightness difference between two colours is not automatically a real change.

## A site, not one page (12 November 2026, after Pawana's review)

Pawana's review of the first Cryostella page: it did not say what to do or when, it put too much on one page, nothing led to it, and Iris should be as alive as Selene. The site is now several pages that share one menu:

| Page | File | What it is |
| --- | --- | --- |
| Home | `index.html` | The introduction: what the site is, a first win in seconds, where to go, and the sky map |
| Sky viewer | `viewer.html` | The viewer, unchanged in how it works (it was `index.html`) |
| Cryostella | `cryostella.html` | Four short steps with Iris |

Old links keep working: `index.html?target=…`, `?ra=…&dec=…`, `?obs=…` and `#watch/…` are passed straight on to `viewer.html` with the whole address.

### The menu (`js/nav.js`, `css/nav.css`)

- One list of the site's sections (`SECTIONS` in `js/nav.js`) feeds the menu, the home page's cards and the sky map, so a new part is added in one place. A part that is not built yet (`ready: false`) stays out of the menu and shows on the home page as "Being built".
- Wide screens: the brand (a crescent moon with a small star, and the project's name) on the left, the sections in the middle, "Take the tour" with Selene's face on the right. It stays at the top while the page scrolls, on a frosted strip of the theme's background, with a soft line once the page has scrolled under it.
- **The moon follows you.** A small moon, drawn like the moon in the theme switch, sits under the page you are on. Point at or tab to another section and it glides there (320 ms, easing out), then back when you leave. With reduced motion it jumps. Pink in Light, moon-grey in Dark, yellow in Colour-blind friendly.
- Phones: the brand and a Menu button (three lines that turn into a cross). The panel lists each section with its icon and a line about it, with a moon beside the page you are on. Escape or a click outside closes it, and focus returns to Menu.
- During a tour the menu scrolls with the page, so the spotlight stays on it.
- The theme switch moved from `app.js` to `js/theme.js` and is drawn into each page's header, so every page has the same one.

### The home page (`index.html`, `js/home.js`, `css/home.css`)

Research, 12 November (sources at the end of this section):

- **The first click is the core idea.** Game onboarding guidance (Unity, Roblox) says the first interaction should be the most engaging mechanic, the right action should be obvious within about 30 seconds, and there should be a small reward within about 15. Teach by doing, one thing at a time, and keep it skippable.
- **Citizen science loses most people early.** Studies of Zooniverse projects find most volunteers do a few tasks and leave; holding them for a few more tasks matters most, and introducing tasks gradually helped accuracy and retention (Gravity Spy).
- **Hooks that respect people.** Self-Determination Theory frames healthy engagement as supporting autonomy, competence and relatedness; streaks and loss-based rewards work against it, and extra rewards can crowd out curiosity. Our own rules already say no streaks, timers or pressure (requirements A-12 and conflict 6), so "hooked" here means curiosity, mastery, characters and visible progress, never fear of missing out.

What the page does with it:

1. **Hero**: a question, not a description: "Something in the sky is moving. Can you spot it?" One strong button, **Start exploring**, and the tour invitation.
2. **Spot the mover**, playable in about 20 seconds: two practice pictures, a Blink button (or "Blink for me", which stops by itself after a dozen flicks and can be stopped sooner), and three marked spots. Pick the one that jumps. Right: a short burst of sparkles, the path it took, a sentence on how astronomers really do this, and a link to the viewer. Wrong: which spot stayed put, and try again, with no penalty. The spot that moves changes on every visit. A "Describe the two pictures in words" section gives the same in text. The pictures are labelled as practice ones, drawn by our code.
3. **Pick where to go**: a card for each part with its guide. **Say hello** makes that guide introduce herself, her words typing out while her lips move (her voice too, if the visitor turned voices on in the tour). One guide talks at a time. Parts still being built are listed underneath with a dashed "Being built" badge.
4. **Your sky map**: one star per place, joined like a constellation, lit once visited (Spot the mover is the first). "You have lit 2 of 3 stars." It says plainly that it is kept in this browser only and that nothing expires, and it can be cleared. The same list is written out beside it for screen readers.
5. **Built for everyone**: five short promises (keyboard, screen readers, colour-blind friendly, sound with words, calm).

**Selene's home tour** (7 parts): welcome, the menu, Spot the mover, the places to go, the sky map, the theme switch, then *your turn*: click Start exploring. The tour then carries on in the sky viewer at "Three steps", because the visitor started it (`selenites-tour-continue` in session storage, used once). The viewer's own tour gained a part about the menu. Pages can now bring their own tour steps (`window.SELENITES_TOUR`).

Sources: [Unity, 10 first-time user experience tips](https://unity.com/how-to/10-first-time-user-experience-tips-games); [Roblox, onboarding](https://create.roblox.com/docs/production/game-design/onboarding); [Zooniverse blog, retention](https://blog.zooniverse.org/tag/retention/); [Patterns of volunteer behaviour across online citizen science](https://experts.umn.edu/en/publications/patterns-of-volunteer-behaviour-across-online-citizen-science/); [Gamification or manipulation? (UX Magazine)](https://uxmag.com/articles/gamification-or-manipulation-understanding-the-ethics-of-engagement-loops); [Dark and "radiant" patterns and Self-Determination Theory](https://journals-sol.sbc.org.br/index.php/jis/article/download/5923/3681/34809).

### Second pass on the menu and the guide cards (12 November, after Pawana's review)

Pawana: the guide cards' placement looked odd (a small guide stuck in the bottom corner, the card growing when she spoke, empty space above Selene), and the menu could be better.

- **The menu is a floating capsule.** The sections sit in a rounded capsule in the middle of the bar, between the brand and the tour button. A soft pill sits behind the page you are on, with the moon resting on its top edge like the stickers on Selene's thought cloud; point at or tab to another section and the pill glides there (340 ms, easing out; it jumps with reduced motion). At the top of the page the bar is clear and the capsule floats; once the page scrolls under it, the bar frosts over with a hairline. On narrow windows the Menu button opens a rounded card that drops from the bar.
- **Each guide card is a small version of the step guide.** The guide stands beside her thought cloud (the same cloud, edge, glow and rising bubbles as on every step), with the details underneath: a kicker with her name, the number of steps and the time, the name, one line, and two actions (the main button, and Say hello with a speaker icon). The cloud always holds her line, so the card never changes size; Say hello makes her say it (typing, lips, and her voice if voices are on). Her motif sits faintly in the bottom corner: a crescent and a star for Selene, a soft rainbow for Iris. On phones the words sit in a rounded thought box, as in the step guide.
- **A thin line above Iris's head is gone.** When the rig shrank her picture, the bottom of her dress bled into the empty top of the hand layer and showed as a line across the top of her figure. The two halves are now shrunk separately, and her hand layer is only read below her hand's top edge.
- The sky map is capped in width, so its labels stay small on wide screens.

### Third pass (12 November, after Pawana's review)

- **No band behind the menu.** The frosted strip that appeared on scrolling looked like a slab across the sky. Now nothing appears until the page scrolls; then whatever passes under the menu blurs and fades out softly towards the top of the screen, like sky seen through thin cloud. The blur is strongest at the top and melts away below the capsule, so there is no hard edge. With "reduce transparency" set on the device it is a plain band of the background colour.
- **Pointing only hints; clicking highlights.** Pointing at or tabbing to a section gives it a faint tint and brighter words. The pill stays on the page you are on, and glides to a section only when you click it (then the page opens once it has arrived).
- **My candidates is marked when it is on screen.** It is a step of the sky viewer, so the menu now follows the viewer's step: My candidates while that step is open (including when you arrive from another page), Sky viewer otherwise. On the viewer, both links change the step in place.
- **Why "Cryostella".** The header says it: *cryo* from the Greek *kryos*, icy cold, and *stella*, Latin for star; Cryostella, the icy star, is where we look for the marks ice leaves on light from space. Iris's first words welcome the visitor to "Cryostella, the icy star".
- **The line above Iris.** The rig now also leaves a clear gap where her body and hand layers meet, so nothing can bleed across on any screen (it was checked at seven sizes, with her hand still and turned).

### Colour-blind friendly theme, checked everywhere (12 November)

Every place a colour points at something now has its own token (`--nudge`, `--mark`, `--cursor`, `--playhead` in `tokens.css`), and the colour-blind friendly theme gives each an Okabe-Ito colour:

| Role | Light / Dark | Colour-blind friendly | Also shown by |
| --- | --- | --- | --- |
| "Do this now" ring | pink | sky blue `#56B4E9` (apart from the yellow focus ring) | it is a still ring around the control Selene or Iris names |
| Bumps and dips on graphs | pink | orange `#E69F00` | filled triangle (bump) or outlined triangle (dip), dashed line, written label |
| Explore cursor | lavender / purple | sky blue | a ring on the curve and a line |
| Playhead | pink | sky blue (never on the same graph as the cursor) | a thick line, and "Now playing" in words |
| Spot the mover: rings, letters, path | lavender, pink, yellow | white, yellow `#F0E442`, sky blue | dashed rings, letters A, B, C, an arrow; answers marked ✓ and ✕ |
| Iris's rainbow drawing | soft rainbow | Okabe-Ito rainbow | decoration only |

Checked by simulating protanopia, deuteranopia and tritanopia (Machado 2009): every pair that appears together stays clearly apart (colour difference 41 or more), and every mark has at least 7.6:1 contrast on the theme's background. An earlier choice, a yellow playhead next to orange marks, came out too close for deuteranopia (17) and was changed to sky blue.

The rainbow in Cryostella step 1 is a picture of real colours, so the colours' names are now written on it (violet, blue, green, yellow, red; initials on narrow screens), and the readout under the slider names the colour too. Statuses in the viewer already used Okabe-Ito colours with a shape and a label each.

### One tour for the site, one tour for each part (12 November, Pawana's idea)

- **Selene's tour of the whole site** (home page, 14 parts in four groups): who she is and what the site is for; how it works (pictures of one patch of sky in date order); the menu; that every part has its own tour with its own guide; *your turn*: press Blink in Spot the mover; the places to go and their guides; *your turn*: press Say hello on Iris's card (Selene waits until Iris has finished); what is being built; My candidates; the sky map; Built for everyone; the theme switch; then *your turn*: open the Sky viewer or Cryostella, and that part's guide carries on with her own tour.
- **Selene's tour of the sky viewer** stays as it was, without the menu part (the site tour covers it), and starts "Welcome to the sky viewer".
- **Iris's tour of Cryostella** (24 parts, hands-on): welcome, why the name, the honest note about practice spectra, the step bar, her tips; then every step in order: the colour band, *your turn* to walk past red, the readout, *your turn* to open step 2; choosing a spectrum, what a spectrum shows, *your turn* to explore, her challenge, *your turn* to find the dip (or the bump), More about this graph, *your turn* to open step 3; light as sound, *your turn* to listen to the end, what the sounds mean, sound settings, *your turn* to open step 4; the mystery spectrum, looking instead of listening, deciding; and the end. Every *your turn* part has Skip this part. Iris leads it in her own figure, with her own voice switch (Iris's voice), and her face is on the menu's tour button and on "New here? Take the tour with Iris".
- The tour engine (`js/tour.js`) takes its guide, voice setting, recordings (`assets/voice/<guide>-tour-<part>.mp3`), step switching and steps from the page (`window.SELENITES_TOUR`). Each page remembers separately whether its tour has been taken.

### Tighter home page, and the tour's light fits (12 November, after Pawana's review)

- **Spot the mover** was a lonely column of text beside a very large picture, with the controls stacked under the picture: lots of empty space, and too tall for the tour's light to go round it. Now the words and the controls (Blink, Blink for me, the A B C answers and the result) sit on the left, the picture (no wider than 560 px) on the right, and the practice label sits under the picture. It is about 480 px tall instead of about 700.
- **The sky map** lists its stars in two columns, with "Start my map again" as a quiet link, beside a smaller map: about 320 px tall.
- Both sit on the same rounded card as the guide cards. Checked at 1440 x 860: the tour's light now goes round the whole of Spot the mover, the places to go, the sky map and Built for everyone, with the card beside or below them.
- The tour lights a part only if it has a box on the page, which SVG drawings do not report, so Iris's tour points at the box round each graph.

### Cryostella in four steps, with Iris

The single page is now four steps, each on its own screen with its own address, a step bar like the viewer's, and Iris's tip saying what to do now. Nothing moves on by itself.

1. **Colours of light** (`#colours`): a rainbow band on a stretched scale, with "Our eyes" over the visible part and "SPHEREx: 0.75 to 5 microns, in 102 colours" over the infrared. Drag the slider: the colour, its name and a sentence follow. Iris asks the visitor to walk past red; once they do, she moves on and offers Next.
2. **Read a spectrum** (`#read`): choose the practice cloud or the practice comet, move the slider along the graph, then a challenge: find a dip (cloud) or a bump (comet). Landing on it gives sparkles, "Found it", and Iris explains what a dip or a bump can mean, saying it is made up in a practice curve. The feature list, release line and full table are behind "More about this graph".
3. **Hear it** (`#hear`): the Spectrum Player with a line moving across the graph. What each sound means comes from `data/sound-key.json` and is listed under the player; the sweep and volume controls sit behind "Sound settings".
4. **Name that spectrum** (`#game`): three rounds, no timer. Play the mystery spectrum, as often as you like, then choose Cold cloud or Comet. "Show the mystery graph" is the way in for anyone who cannot hear it (the graph has no names or marks, and its description gives the shape in words). This is the plan's idea that Name That Sound comes back in Cryostella with spectra.

Each step also ends with a plain Next, for anyone who has hidden the tips. Each step's working area sits on a soft card, so the Light theme's clouds never sit behind a graph.

### Iris, rigged like Selene

- `js/selene.js` now drives any guide: a slot picks its guide with `data-character="iris"`. Each guide has her own files and measurements (`CHARACTERS`).
- Iris's mouth, eyes and wrist were measured on a zoomed copy of `iris-cutout.webp` (842 x 713), with the lip line and eyelid curves drawn over it to check the fit. Her lips move with her words, she blinks, and her raised hand turns gently at the wrist while she explains, away from the floating prism (the prism and its light stay where they are).
- `iris-rig.webp` is the same picture split in two: her body with the hand removed (nothing to paint in behind it: the prism floats clear of her fingers), and the hand alone, with a soft overlap over the forearm so the wrist shows no seam. `iris-face.webp` is the small round picture for her tip button.
- Her tips type out with her lips moving, as Selene's do. **Iris's voice** in her cloud reads them aloud in the device voice, a little higher than Selene's. It is off until turned on (it would talk over a screen reader), and it goes quiet when a spectrum plays.

### Still to decide

- The section names in the menu, and whether "Being built" parts should show on the home page on submission day or be hidden.
- Orpheus is planned for the Spectrum Player (`docs/character-prompts.md`). Cryostella keeps Iris throughout for now, so one guide stays with the visitor; Orpheus could take over step 3 once he is rigged.
- The home page shows Selene, Iris and Orpheus together as pictures on cards. Only one of them talks at a time, as the character rules ask.

## Your Beginnings, with Selene (13 November 2026)

`beginnings.html`, `js/beginnings.js`, `css/beginnings.css`; data from `tools/make_beginnings.py` (format: `docs/beginnings-data.md`). Four steps like Cryostella, each with one task and Selene's tip; nothing moves on by itself.

1. **Your day** (`#day`): month and day on a paper ticket (two half-moon notches, a stitched edge, a full moon beside it that never claims to show the real phase). If SPHEREx saw the date in both 2025 and 2026, two ticket stubs show each year's real picture count and famous objects, and the visitor picks one. 29 February offers 28 February and 1 March. Nothing is saved or sent; the page opens only that day's file.
2. **SPHEREx's ring** (`#ring`): the whole sky in ecliptic coordinates (Hammer projection), so the Sun always sits on the middle line, with the months marked where the Sun stands. Play the day (or drag the slider) and each picture lands in the order it was taken, the newest one glowing; at the end two dashed lines mark 90 degrees from the Sun. This is the Track D finding made playable. Reduced motion jumps straight to the full day.
3. **Who it met** (`#meet`): the Messier objects whose positions sat inside that day's pictures are sparkles on the same map (the rest of the 110 are faint dots). Selene introduces one (named and certain first, then the most pictured); the list beside it, plain text with sparkle bullets and no chips, lets keyboard users meet the others. Each object met lights one of 110 dots in a collection kept in this browser (no streaks, nothing expires, can be cleared). Days with none offer the nearest days that have some.
4. **Your card** (`#card`): a story-shaped keepsake (1080 x 1920, the size phones share full screen; nothing that matters in the top or bottom 220 px, where Instagram and WhatsApp draw their own buttons). Redesigned the same night after Pawana asked for a more share-worthy card, from research on why people share: what we share signals who we are (Berger's social currency), one focal point beats busy slides (critiques of Spotify Wrapped), ready-made story cards remove the effort of sharing, and birthday star-map posters sell on name, date, sky and minimal type, often with the Moon's phase. The hero is a **halo chart**: the whole sky drawn around the Sun (Lambert equal-area, centred on the Sun, ecliptic north up), so the day's pictures, all about 90 degrees from the Sun, form a glowing ring around it, with a dashed 90-degree guide, the day's famous objects as sparkles, the rest of the 110 faint, and the Moon in its phase for that date (calculated by us to about a degree, and labelled so). The date is the headline; a crescent and "The first light" sit above it; who it met and the counts sit below; the Ashesha mark and the credit at the foot. The visitor chooses Night, Dawn or Colour-blind friendly colours (it follows the page theme until they do) and can add a name ("The first light · for Pawana"; the name is never saved or sent). Share opens the phone's own share sheet (Web Share API with files, shown only where the browser supports it); Save downloads the PNG; Copy a link adds `?date=` and says the link holds the date. Inside the chart there is only real data. The canvas has the same words as text for screen readers.

   **Shabby chic with a little Y2K (13 November, Pawana's request).** The card is now a scrapbook keepsake built from the same pieces as the Meet the Selenites cards: paper a shade off the page with a scalloped edge, a faint seeded grain and a blush in one corner, a sewn dashed stitch, and the halo chart as a taped polaroid (always a night-sky photo, so the halo glows in every colour set) with a holographic rim, a soft holographic sheen, two strips of striped washi tape, the date and SPHEREx on its chin, a holographic sparkle sticker and two small ones, and a pink-to-violet marker squiggle under the date. The colour samples beside it show each set's paper inside a holographic ring. The headline object's name flips to the other side of its sparkle, or above it, so it never runs off the photo. Selene's still ring on this step now circles only the button she asks for (Share where the phone allows it, otherwise Save); it used to circle the whole row and box in empty space.

Honest wording: always "the sky SPHEREx saw on 8 May 2025", with the year; "in a picture" never means "bright" or "detected"; SIMBAD's own type is shown beside the plain-word kind, and M 40 and M 73 (uncertain in SIMBAD) are never the headline. The DR1 DOI is not confirmed, and the credit says so.

The maps are a night-sky window in every theme with their own tokens (`--map-*`), checked at 8:1 or more for labels; the sparkles are pink in Light and Dark and Okabe-Ito orange in Colour-blind friendly, the 90-degree lines sky blue there. Below 640 px the month names step aside (too small to read) and the map's other labels grow. Checked: every text colour at least 5.4:1 in all three themes, every control at least 44 px, no sideways scrolling at 375 px. The menu entry now reads "The sky SPHEREx saw on your birthday" (it used to promise the sky on the day you were born, which SPHEREx cannot show), and the home page card has Selene's own greeting for this part.
