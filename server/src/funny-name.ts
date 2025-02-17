
export function createFunName(): string {
    const vowels = "aeiou";
    const consonants = "bcdfgjklmnprstvwz";
    const length = 8;

    const result: string[] = [];
    let isVowel = Math.random() < 0.5;

    for (let i = 0; i < length; i++) {
        if (isVowel) {
            result.push(vowels[Math.floor(Math.random() * vowels.length)]);
        } else {
            result.push(consonants[Math.floor(Math.random() * consonants.length)]);
        }
        isVowel = !isVowel;
    }

    return result.join('');
}
