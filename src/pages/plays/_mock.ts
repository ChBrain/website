// MOCK -- REMOVE WHEN THE FIRST HOUSE REGISTERS.
// The khai-plays registry is empty today, so these placeholder houses let the
// whole flow render end to end: the bill -> a house -> its plays. When a real
// house registers, the bill drives from khai-plays `houses` and each house's
// plays come from its programme package; at that point delete this file and the
// two imports of it (src/pages/plays/index.astro and [house]/index.astro).

export interface MockPlay {
  id: string;
  title: string;
  blurb: string;
}

export interface MockHouse {
  id: string;
  title: string;
  package: string;
  blurb: string;
  repo: string;
  plays: MockPlay[];
}

export const MOCK_HOUSES: MockHouse[] = [
  {
    id: "buechner",
    title: "Büchner",
    package: "@chbrain/khai-play-buechner",
    blurb: "The productions of Georg Büchner: fevered, unfinished, a century ahead of their stage.",
    repo: "https://github.com/ChBrain/khai-plays-buechner",
    plays: [
      {
        id: "woyzeck",
        title: "Woyzeck",
        blurb: "A soldier comes apart under orders, hunger, and a knife.",
      },
      {
        id: "dantons-tod",
        title: "Danton's Tod",
        blurb: "The Revolution turns on its own, and Danton waits for the blade.",
      },
      {
        id: "leonce-und-lena",
        title: "Leonce und Lena",
        blurb: "Two royals flee their betrothal and marry each other by accident.",
      },
    ],
  },
  {
    id: "ibsen",
    title: "Ibsen",
    package: "@chbrain/khai-play-ibsen",
    blurb: "Henrik Ibsen's rooms, where the respectable walls come quietly down.",
    repo: "https://github.com/ChBrain/khai-plays-ibsen",
    plays: [
      {
        id: "a-dolls-house",
        title: "A Doll's House",
        blurb: "Nora shuts the door on a marriage that was a performance.",
      },
      {
        id: "hedda-gabler",
        title: "Hedda Gabler",
        blurb: "A woman with a pistol and no exit arranges one.",
      },
    ],
  },
];
