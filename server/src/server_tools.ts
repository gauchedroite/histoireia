// Lance un dé à six faces
export const rollD6 = (_args: object) => {
    const roll = Math.floor(Math.random() * 6) + 1;
    console.log(`\n***** rollD6 returns ${roll}\n`);
    return { roll };
}
