"use client";
import { del, get, keys, set } from "idb-keyval";
import type { Projet } from "./types";

// Les projets restent sur l'appareil du client (IndexedDB) : pas de compte nécessaire pour le MVP.
const PREFIXE = "projet:";

export async function enregistrerProjet(p: Projet) {
  await set(PREFIXE + p.id, p);
}

export async function lireProjet(id: string): Promise<Projet | undefined> {
  return get<Projet>(PREFIXE + id);
}

export async function supprimerProjet(id: string) {
  await del(PREFIXE + id);
}

export async function listerProjets(): Promise<Projet[]> {
  const ids = (await keys()).map(String).filter((k) => k.startsWith(PREFIXE));
  const projets = await Promise.all(ids.map((k) => get<Projet>(k)));
  return projets
    .filter((p): p is Projet => Boolean(p))
    .sort((a, b) => b.creeLe.localeCompare(a.creeLe));
}
