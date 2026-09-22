import type { FoodItem } from '$lib/types';

export const foodItems: FoodItem[] = [
	{
		name: 'High-Fat',
		rarity: 'Common',
		icon: '/icons/food/High-Fat.png',
		stats: { height: 1, intellect: 1, lifeExp: 1, strength: 1, weight: 8 },
		ingredients: { carbohydrate: 5, fat: 8, protein: 5, calcium: 0, omega3: 0, vitaminD: 0, bioregulator: 0, mitoAmplifier: 0, naniteNutrient: 0 }
	},
	{
		name: 'Mind Surge',
		rarity: 'Common',
		icon: '/icons/food/Mind_Surge.png',
		stats: { height: 1, intellect: 6, lifeExp: 6, strength: 1, weight: 1 },
		ingredients: { carbohydrate: 1, fat: 2, protein: 10, calcium: 0, omega3: 0, vitaminD: 0, bioregulator: 0, mitoAmplifier: 0, naniteNutrient: 0 }
	},
	{
		name: 'Nutri-Core',
		rarity: 'Common',
		icon: '/icons/food/Nutri-Core.png',
		stats: { height: 3, intellect: 3, lifeExp: 3, strength: 3, weight: 3 },
		ingredients: { carbohydrate: 3, fat: 3, protein: 3, calcium: 0, omega3: 0, vitaminD: 0, bioregulator: 0, mitoAmplifier: 0, naniteNutrient: 0 }
	},
	{
		name: 'Physique Fuel',
		rarity: 'Common',
		icon: '/icons/food/Physique_Fuel.png',
		stats: { height: 5, intellect: 1, lifeExp: 1, strength: 5, weight: 1 },
		ingredients: { carbohydrate: 2, fat: 2, protein: 4, calcium: 0, omega3: 0, vitaminD: 0, bioregulator: 0, mitoAmplifier: 0, naniteNutrient: 0 }
	},
	{
		name: 'Bone-Fortify',
		rarity: 'Uncommon',
		icon: '/icons/food/Bone-Fortify.png',
		stats: { height: 8, intellect: 2, lifeExp: 2, strength: 14, weight: 2 },
		ingredients: { carbohydrate: 0, fat: 0, protein: 0, calcium: 10, omega3: 2, vitaminD: 3, bioregulator: 0, mitoAmplifier: 0, naniteNutrient: 0 }
	},
	{
		name: 'Endura-Growth',
		rarity: 'Uncommon',
		icon: '/icons/food/Endura-Growth.png',
		stats: { height: 2, intellect: 12, lifeExp: 8, strength: 2, weight: 2 },
		ingredients: { carbohydrate: 0, fat: 0, protein: 0, calcium: 3, omega3: 4, vitaminD: 4, bioregulator: 0, mitoAmplifier: 0, naniteNutrient: 0 }
	},
	{
		name: 'Immune Boost',
		rarity: 'Uncommon',
		icon: '/icons/food/Immune_Boost.png',
		stats: { height: 6, intellect: 6, lifeExp: 6, strength: 6, weight: 6 },
		ingredients: { carbohydrate: 3, fat: 1, protein: 2, calcium: 3, omega3: 3, vitaminD: 3, bioregulator: 0, mitoAmplifier: 0, naniteNutrient: 0 }
	},
	{
		name: 'Muscle Fortification',
		rarity: 'Uncommon',
		icon: '/icons/food/Muscle_Fortification.png',
		stats: { height: 2, intellect: 2, lifeExp: 2, strength: 15, weight: 8 },
		ingredients: { carbohydrate: 0, fat: 0, protein: 0, calcium: 1, omega3: 2, vitaminD: 12, bioregulator: 0, mitoAmplifier: 0, naniteNutrient: 0 }
	},
	{
		name: 'Neuro-Boost',
		rarity: 'Uncommon',
		icon: '/icons/food/Neuro-Boost.png',
		stats: { height: 2, intellect: 15, lifeExp: 10, strength: 2, weight: 2 },
		ingredients: { carbohydrate: 0, fat: 0, protein: 0, calcium: 3, omega3: 10, vitaminD: 3, bioregulator: 0, mitoAmplifier: 0, naniteNutrient: 0 }
	},
	{
		name: 'Hyper-Evolution',
		rarity: 'Rare',
		icon: '/icons/food/Hyper-Evolution.png',
		stats: { height: 30, intellect: 20, lifeExp: 5, strength: 3, weight: 3 },
		ingredients: { carbohydrate: 0, fat: 0, protein: 0, calcium: 0, omega3: 0, vitaminD: 0, bioregulator: 1, mitoAmplifier: 1, naniteNutrient: 3 }
	},
	{
		name: 'Mitochondrial Surge',
		rarity: 'Rare',
		icon: '/icons/food/Mitochondrial_Surge.png',
		stats: { height: 20, intellect: 3, lifeExp: 12, strength: 28, weight: 3 },
		ingredients: { carbohydrate: 0, fat: 0, protein: 0, calcium: 0, omega3: 0, vitaminD: 0, bioregulator: 2, mitoAmplifier: 2, naniteNutrient: 2 }
	},
	{
		name: 'Nanite Infusion',
		rarity: 'Rare',
		icon: '/icons/food/Nanite_Infusion.png',
		stats: { height: 25, intellect: 25, lifeExp: 6, strength: 3, weight: 3 },
		ingredients: { carbohydrate: 0, fat: 1, protein: 0, calcium: 1, omega3: 0, vitaminD: 0, bioregulator: 0, mitoAmplifier: 0, naniteNutrient: 4 }
	},
	{
		name: 'Ultimate Genesis',
		rarity: 'Rare',
		icon: '/icons/food/Ultimate_Genesis.png',
		stats: { height: 50, intellect: 50, lifeExp: 40, strength: 10, weight: 10 },
		ingredients: { carbohydrate: 0, fat: 0, protein: 0, calcium: 0, omega3: 0, vitaminD: 0, bioregulator: 1, mitoAmplifier: 5, naniteNutrient: 1 }
	}
];
