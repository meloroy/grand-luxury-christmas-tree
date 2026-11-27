import fontUrl from '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff2?url'

export const CHRISTMAS_FONT = 'Christmas Calligraphy'
let ready: Promise<void> | null = null

export function loadChristmasFont() {
  if (!ready) {
    const font = new FontFace(CHRISTMAS_FONT, `url("${fontUrl}")`, { weight: '400' })
    ready = font.load().then((loaded) => {
      document.fonts.add(loaded)
    })
  }
  return ready
}
