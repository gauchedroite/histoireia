import { parseArgs } from "util";

interface IRollPbta {
    modifier: number
}

// Fonction de lancer de dés
export const rollPbta = (args: IRollPbta) => {
    const modifier = args.modifier;
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const roll = dice1 + dice2 + modifier;
    console.log(`\n***** rollPbta(${JSON.stringify(modifier)}) returns ${roll}\n`)
    return { roll };
}


interface IResolvePbta {
    roll: number
}

// Fonction de résolution PbTA
export const resolvePbta = (args: IResolvePbta) => {
    const roll = args.roll;
    let outcome: string;
    if (roll >= 10) 
        outcome = "Succès complet"
    else if (roll >= 7)
        outcome = "Succès mitigé"
    else
        outcome = "Échec avec conséquence"

    console.log(`\n***** resolvePbta(${JSON.stringify(roll)}) returns ${outcome}\n`)
    return outcome;
}
