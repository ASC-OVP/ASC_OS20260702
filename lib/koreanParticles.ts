type ParticlePair = "이/가" | "은/는" | "을/를" | "와/과" | "으로/로";

const particleMap: Record<Exclude<ParticlePair, "으로/로">, [string, string]> = {
  "이/가": ["이", "가"],
  "은/는": ["은", "는"],
  "을/를": ["을", "를"],
  "와/과": ["과", "와"],
};

export function withJosa(value: string | number, pair: ParticlePair) {
  const text = String(value);
  return `${text}${josa(text, pair)}`;
}

export function josa(value: string | number, pair: ParticlePair) {
  const hasFinal = hasFinalConsonant(value);
  if (pair === "으로/로") {
    return hasFinal && !endsWithRieul(value) ? "으로" : "로";
  }

  const [withFinal, withoutFinal] = particleMap[pair];
  return hasFinal ? withFinal : withoutFinal;
}

function hasFinalConsonant(value: string | number) {
  const code = lastHangulCode(value);
  if (code === null) return false;
  return (code - 0xac00) % 28 > 0;
}

function endsWithRieul(value: string | number) {
  const code = lastHangulCode(value);
  if (code === null) return false;
  return (code - 0xac00) % 28 === 8;
}

function lastHangulCode(value: string | number) {
  const text = String(value).trim();
  for (let index = text.length - 1; index >= 0; index -= 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xac00 && code <= 0xd7a3) return code;
    if (/[A-Za-z0-9]/.test(text[index])) return null;
  }
  return null;
}
