export const defaultPlans = [
  {
    id: "price_1R4KH1EoOyqILXNqxnOSjJHZ", // ID de Stripe para el plan aprendiz
    name: "aprendiz",
    description: "Plan gratuito para comenzar",
    price: 0,
    interval: "month",
    features: ["Hasta 50 cartas", "2 colecciones", "10 cartas en lista de deseos", "Búsqueda básica"],
    maxCards: 50,
    maxCollections: 2,
    maxWishlist: 10,
  },
  {
    id: "price_1R4KGgEoOyqILXNqf6Z2vjqQ", // ID de Stripe para el plan entrenador
    name: "entrenador",
    description: "Para coleccionistas serios",
    price: 5,
    interval: "month",
    features: [
      "Hasta 500 cartas",
      "5 colecciones",
      "50 cartas en lista de deseos",
      "Búsqueda avanzada",
      "Estadísticas básicas",
    ],
    maxCards: 500,
    maxCollections: 5,
    maxWishlist: 50,
    isPopular: true,
  },
  {
    id: "price_1R4KHlEoOyqILXNqqX7gkWWJ", // ID de Stripe para el plan maestro
    name: "maestro",
    description: "Para maestros coleccionistas",
    price: 15,
    interval: "month",
    features: [
      "Cartas ilimitadas",
      "Colecciones ilimitadas",
      "Lista de deseos ilimitada",
      "Búsqueda avanzada",
      "Estadísticas completas",
      "Soporte prioritario",
    ],
    maxCards: -1,
    maxCollections: -1,
    maxWishlist: -1,
  },
];
