import { NextResponse } from "next/server";
import { concevoirAvecIA, iaDisponible, type DemandeConception } from "@/lib/conception";
import { genererImage, renduDisponible } from "@/lib/rendu";
import { conceptionAutomatique } from "@/lib/selection";
import type { Conception, Version } from "@/lib/types";

export const maxDuration = 300;

type Corps = DemandeConception & { decalage?: number };

export async function POST(req: Request) {
  const corps = (await req.json()) as Corps;
  if (!corps.photo?.startsWith("data:image/") || !corps.type) {
    return NextResponse.json({ erreur: "Photo ou type de projet manquant." }, { status: 400 });
  }

  const avertissements: string[] = [];
  let conception: Conception;
  try {
    conception = iaDisponible()
      ? await concevoirAvecIA(corps)
      : conceptionAutomatique(corps.type, corps.reponses, corps.decalage ?? 0);
    if (!iaDisponible()) avertissements.push("Mode démonstration : la conception n'utilise pas encore l'IA (clé ANTHROPIC_API_KEY absente).");
  } catch (e) {
    return NextResponse.json({ erreur: message(e) }, { status: 502 });
  }

  let image: string | undefined;
  if (renduDisponible() && conception.promptImage) {
    try {
      image = await genererImage(corps.photo, conception.promptImage, corps.decalage);
    } catch (e) {
      avertissements.push(`Le visuel n'a pas pu être généré : ${message(e)}`);
    }
  } else if (!renduDisponible()) {
    avertissements.push("Visuel non généré : le service d'image n'est pas configuré (REPLICATE_API_TOKEN absent).");
  }

  const version: Version = {
    id: crypto.randomUUID(),
    creeLe: new Date().toISOString(),
    origine: corps.mode,
    instruction: corps.instruction,
    conception,
    image,
    avertissement: avertissements.join(" ") || undefined,
  };
  return NextResponse.json(version);
}

function message(e: unknown) {
  return e instanceof Error ? e.message : "Erreur inconnue";
}
