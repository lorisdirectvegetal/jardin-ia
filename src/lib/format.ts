export const euros = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const fourchette = (min: number, max: number) => `${euros(min)} à ${euros(max)}`;

export const metres = (n: number) => `${n.toLocaleString("fr-FR")} m`;
