# Landing-page B-roll — 10 Gemini Omni Flash prompts

Ten cinematic, **2026-era automotive** background clips for the login/landing page
(`client/src/pages/Login.tsx` → `BackgroundVideo`).

## How to use
1. Generate each clip in **Gemini Omni Flash** using the prompt below.
2. Recommended render settings for every clip:
   - **Aspect ratio:** 16:9 · **Resolution:** 1920×1080 (or higher)
   - **Duration:** 6–8s · **Loopable:** yes (start and end on the same framing/lighting)
   - **Audio:** none (the page plays the video muted)
   - **No on-screen text, logos, or license plates** · cinematic color grade, shallow depth of field
3. Export each as **MP4 (H.264)** and, ideally, also **WebM (VP9)** for smaller files.
4. Drop the file(s) into `client/public/videos/`. The page looks for, in order:
   - `client/public/videos/bg-1.webm`
   - `client/public/videos/bg-1.mp4`
   Use your favourite clip as `bg-1`. To rotate multiple clips, edit `VIDEO_SOURCES`
   in `client/src/pages/Login.tsx`. Until a video exists, the SVG poster
   (`client/public/videos/poster.svg`) is shown automatically.
5. Keep each file lean (target < 6 MB) so the page loads fast. A dark overlay sits
   on top for text legibility, so favour darker, moodier compositions.

> Tip: prompts end with a seamless-loop instruction. Generate 2–3 takes per prompt
> and keep the one whose first and last frames match best.

---

### 1. Headlight ignition (macro)
> Extreme macro of a 2026 electric sedan's matrix-LED headlight waking up in sequenced
> segments, each LED cluster igniting in a left-to-right cascade. Rain-beaded gloss-black
> fascia, crisp specular reflections crawling across the lens. Slow 8-second dolly-in,
> shallow depth of field, teal-and-amber cinematic grade, volumetric haze. No text.
> Loop seamlessly — end on the same dim pre-ignition state it began on.

### 2. Engine / EV start ritual (interior macro)
> Close-up of a finger pressing a knurled metal push-button start in a premium 2026 cabin.
> Ambient cabin lighting blooms from cool blue to warm gold as the dashboard wakes;
> instrument cluster animates to life with a soft glow. Locked-off macro, slow rack focus
> from the button to the cluster, moody low-key lighting, filmic grain. 7 seconds.
> Loop seamlessly back to the unlit cabin.

### 3. Sweeping dashboard interface (dusk)
> Slow lateral pan across a pillar-to-pillar curved OLED dashboard in a 2026 EV, rendering
> a softly animated holographic route map and battery ring. City lights at dusk bokeh
> through the windshield behind it. Smooth gimbal move, ultra-shallow depth of field,
> cyan-and-magenta UI glow against a dark interior. 8 seconds, no readable text.
> Loop seamlessly.

### 4. Wheel & brake detail in motion (night)
> Low tracking shot running parallel to a spinning turbine-style aero wheel on a 2026
> performance car, carbon-ceramic brake disc glowing faint orange. Wet asphalt throwing
> fine spray, motion blur on the spokes, reflective puddles streaking past. High-contrast
> nightscape, hard rim light, cinematic teal shadows. 6 seconds. Loop seamlessly on the
> continuous wheel rotation.

### 5. Reveal in a light tunnel (studio)
> A silhouetted 2026 sedan rolls slowly through an infinite white studio light tunnel as
> sequential overhead light bars ignite and sweep across the bodywork, revealing sculpted
> reflections. Mirror-finish floor with a clean reflection. Smooth slow orbital camera
> move, minimalist, high-key with deep blacks. 8 seconds. Loop seamlessly as the next bar
> begins its sweep.

### 6. Charging handshake (macro)
> Macro of a CCS/NACS charge connector seating into a 2026 EV's charge port; a ring of
> light around the port pulses then fills with a cool blue glow to signal connection.
> Faint condensation, soft blue rim light, tiny status LEDs blinking. Tripod-locked,
> gentle breathing motion. 6 seconds. Loop seamlessly on the pulsing ring.

### 7. Aerial canyon drive (golden hour)
> Drone top-down / high-angle following a 2026 SUV threading a coastal canyon switchback at
> golden hour. Long dramatic shadows, sunlight glinting off the roof and glass, dust kicking
> softly behind the tires. Smooth forward push with parallax over the landscape, warm amber
> grade, anamorphic feel. 8 seconds. Loop seamlessly along the winding road.

### 8. Interior craftsmanship pan (macro)
> Macro glides slowly across the interior of a 2026 luxury car: stitched nappa leather,
> knurled aluminium control dial, ambient light piping, open-pore wood. Dust motes drifting
> in a shaft of warm sunlight, ultra-shallow focus pulling from stitch to dial. Tactile,
> premium, soft warm grade. 7 seconds. Loop seamlessly.

### 9. Rain-glass abstraction (moody)
> Rain sheeting down the side window of a parked 2026 car at night, vivid city neon
> (amber, magenta, cyan) refracting and bokeh-ing through the droplets. Blurred,
> out-of-focus premium interior beyond the glass. Slow vertical drift, contemplative,
> moody, high-contrast. 8 seconds, no text or faces. Loop seamlessly.

### 10. Badge & paint-flake macro (jewel detail)
> Extreme macro as a raking light sweeps across a 2026 car's metallic clearcoat, revealing
> sparkling micro-flake and a deep candy-paint luster, ending on a soft out-of-focus
> (generic, brandless) emblem. Jeweler-grade detail, slow lateral slide, gold-and-graphite
> palette, gentle bloom. 6 seconds. Loop seamlessly on the repeating light sweep.

---

**Style cheat-sheet to append to any prompt if a clip looks off:**
`cinematic, 35mm anamorphic, shallow depth of field, volumetric lighting, color graded,
high dynamic range, no text, no watermark, no visible license plate, seamless loop, 16:9`
