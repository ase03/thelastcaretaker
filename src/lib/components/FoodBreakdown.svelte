<script lang="ts">
	import type { FoodAllocation, Ingredients } from '$lib/types';
	import { ingredientKeys } from '$lib/solver';

	let {
		allocations,
		totalIngredients
	}: {
		allocations: FoodAllocation[];
		totalIngredients: Ingredients;
	} = $props();

	const ingredientLabels: Record<keyof Ingredients, string> = {
		carbohydrate: 'Carbohydrate',
		fat: 'Fat',
		protein: 'Protein',
		calcium: 'Calcium',
		omega3: 'Omega-3',
		vitaminD: 'Vitamin D',
		bioregulator: 'Bioregulator',
		mitoAmplifier: 'Mito. Amplifier',
		naniteNutrient: 'Nanite Nutrient'
	};

	const ingredientIcons: Record<keyof Ingredients, string> = {
		carbohydrate: '/icons/ingredients/Carbohydrate.png',
		fat: '/icons/ingredients/Fat.png',
		protein: '/icons/ingredients/Protein.png',
		calcium: '/icons/ingredients/Calcium.png',
		omega3: '/icons/ingredients/Omega-3.png',
		vitaminD: '/icons/ingredients/Vitamin_D.png',
		bioregulator: '/icons/ingredients/Bioregulator.png',
		mitoAmplifier: '/icons/ingredients/Mitochondrial_Amplifier.png',
		naniteNutrient: '/icons/ingredients/Nanite_Nutrient.png'
	};

	const physicalStatLabels: Record<string, string> = {
		weight: 'Wgt',
		height: 'Hgt',
		lifeExp: 'Life',
		strength: 'Str',
		intellect: 'Int'
	};

	const totalItems = $derived(allocations.reduce((sum, a) => sum + a.quantity, 0));

	const activeIngredients = $derived(
		ingredientKeys.filter(k => totalIngredients[k] > 0)
	);

	function getStatSummary(alloc: FoodAllocation): string {
		const parts: string[] = [];
		for (const [key, label] of Object.entries(physicalStatLabels)) {
			const val = alloc.food.stats[key as keyof typeof alloc.food.stats];
			if (val > 0) {
				parts.push(`${label}+${val * alloc.quantity}`);
			}
		}
		return parts.join(', ');
	}
</script>

{#if allocations.length > 0}
	<div class="breakdown">
		<h4 class="section-title">
			Food Items
			<span class="count">({totalItems} items)</span>
		</h4>

		<table>
			<thead>
				<tr>
					<th>Food Item</th>
					<th>Qty</th>
					<th>Stats Provided</th>
				</tr>
			</thead>
			<tbody>
				{#each allocations as alloc}
					<tr>
						<td class="item-cell">
							<img class="item-icon" src={alloc.food.icon} alt={alloc.food.name} />
							<span class="item-name">{alloc.food.name}</span>
							<span class="rarity rarity-{alloc.food.rarity.toLowerCase()}">{alloc.food.rarity}</span>
						</td>
						<td class="qty-cell">{alloc.quantity}</td>
						<td class="stats-cell">{getStatSummary(alloc)}</td>
					</tr>
				{/each}
			</tbody>
		</table>

		{#if activeIngredients.length > 0}
			<div class="ingredients-section">
				<h4 class="section-title">Crafting Materials Needed</h4>
				<div class="ingredients-grid">
					{#each activeIngredients as key}
						<div class="ingredient-item">
							<img class="item-icon" src={ingredientIcons[key]} alt={ingredientLabels[key]} />
							<span class="ingredient-name">{ingredientLabels[key]}</span>
							<span class="ingredient-qty">{totalIngredients[key]}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.breakdown {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.item-cell {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 500;
	}

	.item-name {
		min-width: 0;
	}

	.rarity {
		margin-left: auto;
		padding: 2px 6px;
		border: 1px solid var(--border);
		border-radius: 999px;
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		background: var(--bg-secondary);
	}

	.rarity-common {
		color: #e5e7eb;
		border-color: #6b7280;
	}

	.rarity-uncommon {
		color: #22c55e;
		border-color: #166534;
	}

	.rarity-rare {
		color: #3b82f6;
		border-color: #1d4ed8;
	}

	.rarity-artifact {
		color: #facc15;
		border-color: #a16207;
	}

	.qty-cell {
		font-weight: 600;
		text-align: center;
		color: var(--accent);
		font-size: 1rem;
	}

	.stats-cell {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.ingredients-section {
		margin-top: 8px;
		padding-top: 16px;
		border-top: 1px solid var(--border);
	}

	.ingredients-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 8px;
	}

	.ingredient-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: var(--bg-secondary);
		border-radius: 6px;
		font-size: 0.9rem;
	}

	.ingredient-name {
		flex: 1;
	}

	.ingredient-qty {
		font-weight: 600;
		color: var(--accent);
		font-size: 1rem;
	}
</style>
