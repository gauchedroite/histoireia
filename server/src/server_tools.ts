

// Fonction de lancer de dés
export const rollPbta = (modifier: number) => {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const roll = dice1 + dice2 + modifier;
    return { roll: 99 };
}

// Fonction de résolution PbTA
export const resolvePbta = (roll: number) => {
    if (roll >= 10) return { outcome: "Succès complet" };
    if (roll >= 7) return { outcome: "Succès mitigé" };
    return { outcome: "Échec avec conséquence" };
}
