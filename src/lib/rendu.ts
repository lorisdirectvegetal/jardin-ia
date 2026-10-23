import "server-only";

/**
 * Génération de l'image avec FLUX Kontext (Replicate) : un modèle de retouche
 * qui modifie la photo d'origine au lieu d'en inventer une nouvelle, ce qui
 * garde la maison, le cadrage et la lumière identiques.
 */
const MODELE = "black-forest-labs/flux-kontext-pro";
const API = "https://api.replicate.com/v1";

interface Prediction {
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
  urls: { get: string };
}

export function renduDisponible() {
  return Boolean(process.env.REPLICATE_API_TOKEN);
}

export async function genererImage(photo: string, prompt: string, graine?: number): Promise<string> {
  const entetes = {
    Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
    "Content-Type": "application/json",
    Prefer: "wait=60",
  };
  const creation = await fetch(`${API}/models/${MODELE}/predictions`, {
    method: "POST",
    headers: entetes,
    body: JSON.stringify({
      input: {
        prompt,
        input_image: photo,
        aspect_ratio: "match_input_image",
        output_format: "jpg",
        safety_tolerance: 2,
        ...(graine !== undefined ? { seed: graine } : {}),
      },
    }),
  });
  if (!creation.ok) {
    throw new Error(`Le service d'image a refusé la demande (${creation.status}) : ${await creation.text()}`);
  }
  let prediction = (await creation.json()) as Prediction;

  const limite = Date.now() + 120_000;
  while (prediction.status === "starting" || prediction.status === "processing") {
    if (Date.now() > limite) throw new Error("La génération de l'image a pris trop de temps.");
    await new Promise((ok) => setTimeout(ok, 2000));
    const suivi = await fetch(prediction.urls.get, { headers: { Authorization: entetes.Authorization } });
    prediction = (await suivi.json()) as Prediction;
  }
  if (prediction.status !== "succeeded" || !prediction.output) {
    throw new Error(`La génération de l'image a échoué : ${prediction.error ?? prediction.status}`);
  }

  // L'URL de Replicate expire au bout d'une heure : on rapatrie l'image pour la conserver.
  const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  const image = await fetch(url);
  const octets = Buffer.from(await image.arrayBuffer());
  return `data:${image.headers.get("content-type") ?? "image/jpeg"};base64,${octets.toString("base64")}`;
}
