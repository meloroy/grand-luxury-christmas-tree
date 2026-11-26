# Grand Luxury Interactive Christmas Tree

https://meloroy.github.io/grand-luxury-christmas-tree/

A cinematic emerald-and-silver Christmas tree. It rests fully formed, then unleashes into a cloud of needles, ornaments, and polaroids, then gathers again.

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

## Controls

On a laptop, drag to orbit and scroll to move closer. On a phone or tablet, drag with one finger to orbit and pinch with two fingers to move closer. The page itself does not scroll or pinch-zoom.

- **Form** assembles the tree.
- **Unleash** scatters every needle, ornament, and polaroid.
- **Camera** starts the webcam. **Camera Off** stops it and releases the tracks.

The buttons sit along the bottom, above the home indicator, and stay clear of the notch. They are sized for a thumb. Nothing in the scene depends on hover.

The camera stays off until you turn it on. If the camera is denied or unavailable, drag and the Form / Unleash button still run the whole experience. That includes iOS Safari and Android Chrome over HTTPS.

## Phones and tablets

The canvas fills the screen in portrait and landscape. A narrow screen pulls the camera back just enough to keep the tree in frame. Phones use fewer needles, ornaments, and bloom samples so a mid-range phone stays smooth without dropping the emerald and silver look.

### Gestures

With the camera on:

- Open palm: Unleash (chaos).
- Closed fist: Form.
- Move your hand to orbit. The view is damped so small jitters do not shake the camera.

A gesture has to hold briefly before the tree changes, so a flicker does not toggle the state.

Webcam access needs a secure context: **HTTPS or localhost**. GitHub Pages serves this site over HTTPS.

The first time you enable the camera, the browser downloads the MediaPipe gesture model.

## Deploy

Pushes to `main` run `.github/workflows/deploy.yml`. The workflow installs dependencies, runs `npm run build`, and deploys `dist` to GitHub Pages with the official Pages actions.

Pages source must be **GitHub Actions**:

1. Open the repository **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

Public URL: https://meloroy.github.io/grand-luxury-christmas-tree/

The site goes live after the deploy workflow finishes on `main`.
