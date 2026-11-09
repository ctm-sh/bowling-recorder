const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

/** "김민우" → "ㄱㅁㅇ" (초성 검색용) */
function initials(name: string) {
  return [...name]
    .map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00;
      return code >= 0 && code < 11172 ? INITIALS[Math.floor(code / 588)] : ch;
    })
    .join("");
}

/** 이름 또는 초성에 검색어가 들어 있는지 */
export function matchesName(name: string, query: string) {
  return name.includes(query) || initials(name).includes(query);
}
