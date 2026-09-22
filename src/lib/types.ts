export interface PhysicalStats {
	weight: number;
	height: number;
	lifeExp: number;
	strength: number;
	intellect: number;
}

export interface PsychTraits {
	adaptability: number;
	creativity: number;
	communication: number;
	discipline: number;
	empathy: number;
	focus: number;
	leadership: number;
	logic: number;
	patience: number;
	wisdom: number;
}

export interface Ingredients {
	carbohydrate: number;
	fat: number;
	protein: number;
	calcium: number;
	omega3: number;
	vitaminD: number;
	bioregulator: number;
	mitoAmplifier: number;
	naniteNutrient: number;
}

export type FoodRarity = 'Poor' | 'Common' | 'Uncommon' | 'Rare' | 'Artifact';

export interface FoodItem {
	name: string;
	icon: string;
	rarity: FoodRarity;
	stats: PhysicalStats;
	ingredients: Ingredients;
}

export interface MemoryItem {
	name: string;
	icon: string;
	traits: PsychTraits;
}

export type ProfessionCategory =
	| 'Engineer'
	| 'Arts & Culture'
	| 'Educator'
	| 'Agriculture'
	| 'Logistics'
	| 'Military'
	| 'Science'
	| 'Healthcare'
	| 'Leadership'
	| 'Explorer';

export type ProfessionTier = 'T1' | 'T2' | 'T3' | 'T4';

export interface Profession {
	name: string;
	category: ProfessionCategory;
	tier: ProfessionTier;
	physicalReqs: PhysicalStats;
	traitReqs: PsychTraits;
}

export interface Allocation {
	item: string;
	quantity: number;
}

export interface FoodAllocation extends Allocation {
	food: FoodItem;
}

export interface MemoryAllocation extends Allocation {
	memory: MemoryItem;
}

export interface OptimizationResult {
	feasible: boolean;
	foodAllocations: FoodAllocation[];
	foodAllocationsMinAdvanced: FoodAllocation[];
	foodAllocationsBalanced: FoodAllocation[];
	memoryAllocations: MemoryAllocation[];
	totalFoodItems: number;
	totalFoodItemsMinAdvanced: number;
	totalFoodItemsBalanced: number;
	totalMemoryItems: number;
	totalItems: number;
	achievedStats: PhysicalStats;
	achievedStatsMinAdvanced: PhysicalStats;
	achievedStatsBalanced: PhysicalStats;
	achievedTraits: PsychTraits;
	totalIngredients: Ingredients;
	totalIngredientsMinAdvanced: Ingredients;
	totalIngredientsBalanced: Ingredients;
	advancedMaterials: number;
	advancedMaterialsMinAdvanced: number;
	advancedMaterialsBalanced: number;
	balancedFoodTypes: number;
	minAdvancedFeasible: boolean;
	balancedFeasible: boolean;
	// Fewest-unique-types variant (minimize distinct memory types)
	minUniqueFeasible: boolean;
	memoryAllocationsMinUnique: MemoryAllocation[];
	totalMemoryItemsMinUnique: number;
	totalItemsMinUnique: number;
	achievedTraitsMinUnique: PsychTraits;
	uniqueMemoryTypes: number;
}

export interface TraitShortfall {
	trait: string;
	have: number;
	need: number;
}

export interface ProfessionMatch {
	profession: Profession;
	achievable: boolean;
	traitCoverage: number;
	achievedTraits: PsychTraits;
	shortfalls: TraitShortfall[];
	memoryAllocations: MemoryAllocation[];
	totalMemoryItems: number;
	foodAllocations: FoodAllocation[];
	totalFoodItems: number;
	achievedStats: PhysicalStats;
	totalIngredients: Ingredients;
}
