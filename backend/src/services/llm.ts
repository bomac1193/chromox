export async function rewriteLyricsWithLLM(lyrics: string, stylePrompt: string) {
  return `${lyrics}\n// Reimagined via Nebula Tone: ${stylePrompt}`;
}

export async function promptToControls(stylePrompt: string) {
  const hash = Array.from(stylePrompt).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const normalize = (offset: number) => ((hash + offset) % 100) / 100;
  return {
    brightness: normalize(5),
    breathiness: normalize(11),
    energy: normalize(19),
    formant: normalize(23) * 2 - 1,
    vibratoDepth: normalize(31),
    vibratoRate: normalize(37),
    roboticism: normalize(41),
    glitch: normalize(43),
    stereoWidth: normalize(47)
  };
}
