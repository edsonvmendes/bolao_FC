export type Team = {
  id: string;
  name: string;
  code: string;
};

export type Match = {
  id: string;
  group: string;
  round: 1 | 2 | 3;
  date: string;
  home: Team;
  away: Team;
  deadline: string;
  status: "open" | "locked" | "finished";
};

export type Prediction = {
  homeScore: number | "";
  awayScore: number | "";
};

export const teams: Team[] = [
  { id: "br", name: "Brasil", code: "br" },
  { id: "jp", name: "Japao", code: "jp" },
  { id: "mx", name: "Mexico", code: "mx" },
  { id: "ma", name: "Marrocos", code: "ma" },
  { id: "ar", name: "Argentina", code: "ar" },
  { id: "de", name: "Alemanha", code: "de" },
  { id: "kr", name: "Coreia do Sul", code: "kr" },
  { id: "sn", name: "Senegal", code: "sn" },
  { id: "fr", name: "Franca", code: "fr" },
  { id: "us", name: "Estados Unidos", code: "us" },
  { id: "gh", name: "Gana", code: "gh" },
  { id: "uy", name: "Uruguai", code: "uy" },
  { id: "pt", name: "Portugal", code: "pt" },
  { id: "ca", name: "Canada", code: "ca" },
  { id: "eg", name: "Egito", code: "eg" },
  { id: "nl", name: "Paises Baixos", code: "nl" },
  { id: "es", name: "Espanha", code: "es" },
  { id: "gb-eng", name: "Inglaterra", code: "gb-eng" },
  { id: "co", name: "Colombia", code: "co" },
  { id: "au", name: "Australia", code: "au" },
  { id: "ba", name: "Bosnia e Herzegovina", code: "ba" },
  { id: "ch", name: "Suica", code: "ch" },
  { id: "ec", name: "Equador", code: "ec" },
  { id: "qa", name: "Catar", code: "qa" },
  { id: "hr", name: "Croacia", code: "hr" },
  { id: "be", name: "Belgica", code: "be" },
  { id: "py", name: "Paraguai", code: "py" },
  { id: "sa", name: "Arabia Saudita", code: "sa" },
  { id: "no", name: "Noruega", code: "no" },
  { id: "tr", name: "Turquia", code: "tr" },
  { id: "za", name: "Africa do Sul", code: "za" },
  { id: "nz", name: "Nova Zelandia", code: "nz" },
  { id: "se", name: "Suecia", code: "se" },
  { id: "at", name: "Austria", code: "at" },
  { id: "tn", name: "Tunisia", code: "tn" },
  { id: "ir", name: "Ira", code: "ir" },
  { id: "gb-sct", name: "Escocia", code: "gb-sct" },
  { id: "cz", name: "Republica Tcheca", code: "cz" },
  { id: "dz", name: "Argelia", code: "dz" },
  { id: "uz", name: "Uzbequistao", code: "uz" },
  { id: "pa", name: "Panama", code: "pa" },
  { id: "ci", name: "Costa do Marfim", code: "ci" },
  { id: "jo", name: "Jordania", code: "jo" },
  { id: "cv", name: "Cabo Verde", code: "cv" },
  { id: "ht", name: "Haiti", code: "ht" },
  { id: "cd", name: "RD Congo", code: "cd" },
  { id: "iq", name: "Iraque", code: "iq" },
  { id: "cw", name: "Curacao", code: "cw" },
];

const groupSeeds = Array.from({ length: 12 }, (_, index) => {
  const letter = String.fromCharCode(65 + index);
  return [
    `Grupo ${letter}`,
    teams.slice(index * 4, index * 4 + 4).map((team) => team.id),
  ] as const;
});

const pairings = [
  [0, 1],
  [2, 3],
  [0, 2],
  [3, 1],
  [3, 0],
  [1, 2],
] as const;

const dates = [
  "2026-06-11T16:00:00-03:00",
  "2026-06-12T19:00:00-03:00",
  "2026-06-17T16:00:00-03:00",
  "2026-06-18T19:00:00-03:00",
  "2026-06-23T16:00:00-03:00",
  "2026-06-24T16:00:00-03:00",
];

const byId = Object.fromEntries(teams.map((team) => [team.id, team]));

export const groupStageMatches: Match[] = groupSeeds.flatMap(([group, ids], groupIndex) =>
  pairings.map(([homeIndex, awayIndex], pairingIndex) => {
    const baseDate = new Date(dates[pairingIndex]);
    baseDate.setDate(baseDate.getDate() + groupIndex);
    const round = pairingIndex < 2 ? 1 : pairingIndex < 4 ? 2 : 3;

    return {
      id: `${group.toLowerCase().replace(" ", "-")}-${pairingIndex + 1}`,
      group,
      round,
      date: baseDate.toISOString(),
      deadline: new Date(baseDate.getTime() - 30 * 60 * 1000).toISOString(),
      home: byId[ids[homeIndex]],
      away: byId[ids[awayIndex]],
      status: "open" as const,
    };
  }),
);

export const ranking = [
  { name: "Juninho", points: 42, paid: true, exact: 3 },
  { name: "Duda", points: 39, paid: true, exact: 2 },
  { name: "Marcao", points: 34, paid: true, exact: 2 },
  { name: "Edson", points: 28, paid: true, exact: 1 },
  { name: "Tiao", points: 11, paid: false, exact: 0 },
];
