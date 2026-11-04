import { Cog, CircleDot, Disc3, EllipsisVertical, MoveVertical, PaintBucket, Stethoscope, Wrench, Zap } from "lucide-vue-next"

// Les « zones » du véhicule affichées dans le formulaire de rendez-vous, avec une phrase simple
// pour aider les clients qui ne connaissent pas le vocabulaire mécanique.
export const categoryMeta = {
  diagnostic: { label: "Diagnostic", hint: "Faire vérifier un voyant ou un défaut précis", icon: Stethoscope },
  entretien: { label: "Entretien", hint: "Vidange, révision, filtres", icon: Wrench },
  freinage: { label: "Freinage", hint: "Plaquettes, disques, pédale", icon: Disc3 },
  suspension: { label: "Suspension", hint: "Amortisseurs, confort, tenue de route", icon: MoveVertical },
  transmission: { label: "Transmission", hint: "Boîte de vitesses, 4x4", icon: Cog },
  electronique: { label: "Électronique", hint: "Capteurs, batterie, équipements", icon: Zap },
  carrosserie: { label: "Carrosserie", hint: "Chocs, rayures, peinture", icon: PaintBucket },
  pneus: { label: "Pneus", hint: "Usure, géométrie, équilibrage", icon: CircleDot },
  autre: { label: "Autre", hint: "Une autre demande", icon: EllipsisVertical },
}

// Ordre d'affichage des zones
export const categoryOrder = Object.keys(categoryMeta)

// Symptômes que le client peut cocher quand il ne sait pas ce qui ne va pas
export const symptoms = [
  "Voyant allumé",
  "Bruit anormal",
  "Vibrations",
  "Fuite de liquide",
  "Difficulté au démarrage",
  "Surchauffe",
  "Fumée",
  "Perte de puissance",
  "Mauvaise odeur",
]
