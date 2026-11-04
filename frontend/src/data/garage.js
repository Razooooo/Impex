// Contenu de la page de présentation. Les coordonnées sont reprises de l'ancien site "Rover Impex" :
// à remplacer par les vraies avant la mise en ligne.
export const contactInfo = {
  name: "IMPEX",
  phone: "+261 34 00 000 00",
  email: "contact@impex.mg",
  address: "Antananarivo, Madagascar",
  whatsapp: "261340000000",
  hours: ["Lundi – vendredi, 8h00 – 17h30", "Samedi, 8h00 – 12h00"],
}

// Horaires d'ouverture par jour (0 = dimanche) : [heure d'ouverture, heure de fermeture]. Absent = fermé.
export const openingHours = {
  1: [8, 17.5],
  2: [8, 17.5],
  3: [8, 17.5],
  4: [8, 17.5],
  5: [8, 17.5],
  6: [8, 12],
}

// Photo affichée pour chaque modèle enregistré par un client (les noms suivent l'énumération de l'API)
export const modelImages = {
  Defender: "/images/defender.jpg",
  Discovery: "/images/discovery.jpg",
  "Discovery Sport": "/images/discovery-sport.jpg",
  "Range Rover": "/images/range-rover-vogue.jpg",
  "Range Rover Sport": "/images/range-rover-sport.jpg",
  "Range Rover Velar": "/images/range-rover-velar.jpg",
  "Range Rover Evoque": "/images/range-rover-evoque.jpg",
  Freelander: "/images/freelander.jpg",
}

export const services = [
  {
    title: "Entretien et révision",
    description: "Vidange, filtres, freins, contrôle général selon les préconisations du constructeur.",
  },
  {
    title: "Réparation mécanique",
    description: "Moteur, boîte de vitesses, transmission 4x4, suspension et direction.",
    tags: ["Moteur", "Boîte", "Transmission", "Suspension"],
  },
  {
    title: "Diagnostic électronique",
    description: "Lecture et effacement des codes défaut avec un outil de diagnostic professionnel.",
    tags: ["Codes défaut", "Programmation", "Calibration"],
  },
  {
    title: "Carrosserie et peinture",
    description: "Impacts, bosses, rayures, traitement anti-rouille et peinture.",
    tags: ["Débosselage", "Peinture", "Anti-rouille"],
  },
  {
    title: "Pièces détachées",
    description: "Pièces d'origine ou adaptables, commande rapide, conseil au comptoir.",
    tags: ["Origine", "Adaptables"],
  },
]

export const models = [
  { name: "Defender", image: "/images/defender.jpg", description: "Le tout-terrain historique." },
  { name: "Discovery", image: "/images/discovery.jpg", description: "7 places, suspension pneumatique." },
  { name: "Discovery Sport", image: "/images/discovery-sport.jpg", description: "Le compact polyvalent." },
  { name: "Range Rover Sport", image: "/images/range-rover-sport.jpg", description: "Sportif, V6 ou V8." },
  { name: "Range Rover Vogue", image: "/images/range-rover-vogue.jpg", description: "Le haut de gamme." },
  { name: "Range Rover Evoque", image: "/images/range-rover-evoque.jpg", description: "Le plus urbain de la gamme." },
  { name: "Range Rover Velar", image: "/images/range-rover-velar.jpg", description: "Entre l'Evoque et le Sport." },
  { name: "Freelander", image: "/images/freelander.jpg", description: "Le 4x4 accessible." },
]

export const steps = [
  { title: "Choisissez la prestation", text: "Diagnostic, entretien, freinage ou autre : sélectionnez ce dont votre véhicule a besoin." },
  { title: "Réservez un créneau", text: "Indiquez votre modèle et le jour qui vous convient." },
  { title: "On s'en occupe", text: "Un mécanicien est assigné à votre véhicule. Vous suivez l'avancement en ligne." },
]
