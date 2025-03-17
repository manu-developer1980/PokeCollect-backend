export const defaultPlans = [
  {
    id: "a184d629-5253-4171-8bb3-40ee69f5f3fb", // ID de Polar para el plan gratuito
    name: "Free",
    description: "Perfect for getting started",
    price: 0,
    interval: "month",
    features: ["Up to 100 cards", "Basic collection management", "Card search"],
  },
  {
    id: "1e0f535c-429d-4c4a-9c9c-bdb39ed74d7b", // ID de Polar para el plan Pro mensual
    name: "Pro",
    description: "For serious collectors",
    price: 9.99,
    interval: "month",
    features: [
      "Unlimited cards",
      "Advanced statistics",
      "Price tracking",
      "Export collections",
      "Priority support",
    ],
    isPopular: true,
  },
  {
    id: "de48e85c-5447-451c-b70b-b7f3ccfc9cda", // ID de Polar para el plan Pro anual
    name: "Pro",
    description: "For serious collectors",
    price: 99.99,
    interval: "year",
    features: [
      "Unlimited cards",
      "Advanced statistics",
      "Price tracking",
      "Export collections",
      "Priority support",
    ],
  },
];
