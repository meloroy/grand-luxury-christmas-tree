# Grand Luxury Interactive Christmas Tree

https://meloroy.github.io/grand-luxury-christmas-tree/

A particle Christmas mini-game. Twelve monthly photos become a tall emerald-and-gold tree that can morph, scatter, and open one memory in front of the camera.

## Flow

The page opens on a black starfield. Add, replace, or remove photos until the count reads 12/12, then assemble the tree. Each slot represents January through December, with one photo per month. Batch uploads fill empty months in order. There are no placeholder polaroids.

The finished set is stored in IndexedDB on this device (no login). A later visit can reopen that record or start a new one. Starting over does not delete the saved tree until a new set of 12 monthly photos is assembled. The showcase also writes the record as soon as it is generated.

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:5173/grand-luxury-christmas-tree/

The dev server uses the same `/grand-luxury-christmas-tree/` base path as GitHub Pages.

## Production build

```bash
npm run build
npm run preview
```

Preview: http://localhost:4173/grand-luxury-christmas-tree/

## Play

- Pull the crystal lamp, or let the reveal ignite the tree. Pull it again to dim the lights.
- Particles gently float and drift on their own, with a few loose motes around each shape. Pointer movement does not deform the particles.
- Drag with the left or right mouse button, or one finger, to orbit. The scroll wheel or a two-finger pinch moves closer. Pulling the lamp does not rotate the view.
- Click empty space to cycle Tree, Gift, Hat, Stocking, Text, Elk, Santa, Gallery. Shift-click cycles backwards. Dragging still orbits; clicking a photo opens its month. Each shape change scatters the particles before gathering into the new shape over 2.3 seconds. Keyboard left/right arrows on the canvas also change shape.
- Release Chaos scatters them. Each particle spins on its own axis. Ignite Festivity gathers them again.
- Photo view brings one original-aspect photo forward inside the 3D scene, with no caption or separate memory page. Click the focused photo or empty space for the next photo; swipe left/right or use arrow keys for next/previous. Releasing and repeating a pinch (or V sign) advances one photo when the camera is on. Escape or the close icon returns to the scene.
- Change Music toggles two original looping tracks, `1.mp3` and `2.mp3`. If the browser blocks sound, the first tap or the lamp starts it.

## Camera

The camera stays off until Camera is pressed. Camera Off stops it.

With the camera on, a held gesture switches the scene:

- Pinch: Focus
- V sign: next shape (release and repeat to advance again)
- Fist: Tree
- Open hand: Scatter
- Moving the palm orbits the scene, with damping

A gesture has to hold briefly before it changes the scene. If the camera is denied or missing, the pointer and the buttons still run everything.

Webcam access needs a secure context: HTTPS or localhost. GitHub Pages serves this site over HTTPS. The first time the camera is enabled, the browser downloads the MediaPipe hand model.

## Phones

The canvas fills the screen in portrait and landscape, including the safe areas. Buttons are sized for a thumb. Nothing in the scene depends on hover. Mid-range phones use fewer particles, a lower pixel ratio, and lighter bloom, with the same emerald, gold, and black starfield.

## Deploy

Pushes to `main` run `.github/workflows/deploy.yml`. The workflow installs dependencies, runs `npm run build`, and deploys `dist` to GitHub Pages.

Pages source must be GitHub Actions. Public URL: https://meloroy.github.io/grand-luxury-christmas-tree/
