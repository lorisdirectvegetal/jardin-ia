"use client";

/** Réduit la photo à 1600 px de côté maximum en JPEG pour accélérer l'envoi et la génération. */
export async function preparerPhoto(fichier: File, cote = 1600): Promise<string> {
  const bitmap = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  const echelle = Math.min(1, cote / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * echelle);
  canvas.height = Math.round(bitmap.height * echelle);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.88);
}
