<script lang="ts">
	import type { Profession, OptimizationResult } from '$lib/types';
	import FoodBreakdown from './FoodBreakdown.svelte';
	import MemoryBreakdown from './MemoryBreakdown.svelte';
	import StatsTable from './StatsTable.svelte';

	let {
		profession,
		result
	}: {
		profession: Profession;
		result: OptimizationResult;
	} = $props();

	let activeTab = $state<'optimal' | 'minUnique'>('optimal');
	let foodTab = $state<'fewest' | 'minAdvanced' | 'saveScarce' | 'balanced'>('fewest');

	const showFoodAllocations = $derived(
		foodTab === 'balanced'
			? result.foodAllocationsBalanced
			: foodTab === 'saveScarce'
				? result.foodAllocationsSaveScarce
			: foodTab === 'minAdvanced'
				? result.foodAllocationsMinAdvanced
				: result.foodAllocations
	);
	const showFoodIngredients = $derived(
		foodTab === 'balanced'
			? result.totalIngredientsBalanced
			: foodTab === 'saveScarce'
				? result.totalIngredientsSaveScarce
			: foodTab === 'minAdvanced'
				? result.totalIngredientsMinAdvanced
				: result.totalIngredients
	);
	const showFoodItems = $derived(
		foodTab === 'balanced'
			? result.totalFoodItemsBalanced
			: foodTab === 'saveScarce'
				? result.totalFoodItemsSaveScarce
			: foodTab === 'minAdvanced'
				? result.totalFoodItemsMinAdvanced
				: result.totalFoodItems
	);
	const showAchievedStats = $derived(
		foodTab === 'balanced'
			? result.achievedStatsBalanced
			: foodTab === 'saveScarce'
				? result.achievedStatsSaveScarce
			: foodTab === 'minAdvanced'
				? result.achievedStatsMinAdvanced
				: result.achievedStats
	);
	const showAdvancedMaterials = $derived(
		foodTab === 'balanced'
			? result.advancedMaterialsBalanced
			: foodTab === 'saveScarce'
				? result.advancedMaterialsSaveScarce
			: foodTab === 'minAdvanced'
				? result.advancedMaterialsMinAdvanced
				: result.advancedMaterials
	);

	const showMemoryAllocations = $derived(
		activeTab === 'minUnique' ? result.memoryAllocationsMinUnique : result.memoryAllocations
	);
	const showAchievedTraits = $derived(
		activeTab === 'minUnique' ? result.achievedTraitsMinUnique : result.achievedTraits
	);
	const showTotalMemoryItems = $derived(
		activeTab === 'minUnique' ? result.totalMemoryItemsMinUnique : result.totalMemoryItems
	);
	const showTotalItems = $derived(
		showFoodItems + showTotalMemoryItems
	);
	const altInfeasible = $derived(
		activeTab === 'minUnique' && !result.minUniqueFeasible
	);
</script>

<div class="results">
	{#if !result.feasible && !result.minUniqueFeasible}
		<div class="card error-card">
			<h3>Optimization Failed</h3>
			<p>No feasible solution found for this profession's requirements. This may indicate a data error.</p>
		</div>
	{:else}
		<div class="total-summary card">
			<h3>Optimal Build</h3>
			<div class="total-count">
				<span class="total-number">{showTotalItems}</span>
				<span class="total-label">total items</span>
			</div>
			<div class="total-breakdown">
				{#if showFoodItems > 0}
					<span class="sub-count">{showFoodItems} food</span>
				{/if}
				{#if showTotalMemoryItems > 0}
					<span class="sub-count">
						{showTotalMemoryItems} memories
						{#if activeTab === 'minUnique'}
							({result.uniqueMemoryTypes} types)
						{:else}
							({result.memoryAllocations.length} types)
						{/if}
					</span>
				{/if}
			</div>
		</div>

		{#if showFoodAllocations.length > 0}
			<div class="tab-bar">
				<button
					class="tab-btn"
					class:active={foodTab === 'fewest'}
					onclick={() => foodTab = 'fewest'}
				>
					Fewest Food ({result.totalFoodItems})
				</button>
				<button
					class="tab-btn"
					class:active={foodTab === 'minAdvanced'}
					onclick={() => foodTab = 'minAdvanced'}
				>
					Save Advanced ({result.advancedMaterialsMinAdvanced} rare mats)
				</button>
				<button
					class="tab-btn"
					class:active={foodTab === 'saveScarce'}
					onclick={() => foodTab = 'saveScarce'}
				>
					Save Scarce ({result.totalIngredientsSaveScarce.calcium} Ca)
				</button>
				<button
					class="tab-btn"
					class:active={foodTab === 'balanced'}
					onclick={() => foodTab = 'balanced'}
				>
					Balanced ({result.balancedFoodTypes} types)
				</button>
			</div>

			<div class="card">
				<FoodBreakdown
					allocations={showFoodAllocations}
					totalIngredients={showFoodIngredients}
				/>
				<p class="strategy-note">
					Advanced materials used: <strong>{showAdvancedMaterials}</strong>
					(Bioregulator + Mito Amplifier + Nanite Nutrient)
					{#if foodTab === 'saveScarce'}
						<br />Within 25% of Fewest Food: saves calcium first, then vitamin D, then shark-derived materials, then portions.
					{/if}
					{#if foodTab === 'balanced'}
						<br />Balanced allows up to 25% more portions to increase variety, preferring common recipes.
					{/if}
				</p>
			</div>
		{/if}

		<div class="tab-bar">
			<button
				class="tab-btn"
				class:active={activeTab === 'optimal'}
				onclick={() => activeTab = 'optimal'}
			>
				Fewest Items ({result.totalMemoryItems})
			</button>
			<button
				class="tab-btn"
				class:active={activeTab === 'minUnique'}
				onclick={() => activeTab = 'minUnique'}
			>
				Fewest Types ({result.minUniqueFeasible ? result.uniqueMemoryTypes + ' types' : 'infeasible'})
			</button>
		</div>

		{#if altInfeasible}
			<div class="card error-card">
				<h3>No Feasible Solution</h3>
				<p>Cannot find a feasible solution with this optimization strategy.</p>
			</div>
		{:else}
			<div class="card">
				<StatsTable
					achievedStats={showAchievedStats}
					requiredStats={profession.physicalReqs}
					achievedTraits={showAchievedTraits}
					requiredTraits={profession.traitReqs}
				/>
			</div>

			{#if showMemoryAllocations.length > 0}
				<div class="card">
					<MemoryBreakdown allocations={showMemoryAllocations} />
				</div>
			{/if}
		{/if}
	{/if}
</div>

<style>
	.results {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.error-card {
		border-color: var(--danger);
		background: var(--danger-bg);
	}

	.error-card h3 {
		color: var(--danger);
		margin-bottom: 8px;
	}

	.error-card p {
		color: var(--text-secondary);
	}

	.total-summary {
		text-align: center;
		border-color: var(--border-highlight);
		background: linear-gradient(135deg, var(--bg-card), rgba(59, 130, 246, 0.08));
	}

	.total-summary h3 {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		margin-bottom: 8px;
	}

	.total-count {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.total-number {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--accent);
		line-height: 1;
	}

	.total-label {
		font-size: 1rem;
		color: var(--text-secondary);
	}

	.total-breakdown {
		display: flex;
		justify-content: center;
		gap: 16px;
	}

	.sub-count {
		font-size: 0.9rem;
		color: var(--text-muted);
		padding: 4px 12px;
		background: var(--bg-secondary);
		border-radius: 20px;
	}

	.strategy-note {
		margin-top: 14px;
		font-size: 0.82rem;
		color: var(--text-muted);
		text-align: center;
	}

	.strategy-note strong {
		color: var(--text-primary);
	}

	.tab-bar {
		display: flex;
		gap: 4px;
		background: var(--bg-secondary);
		border-radius: 10px;
		padding: 4px;
	}

	.tab-btn {
		flex: 1;
		padding: 10px 16px;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.tab-btn:hover {
		color: var(--text-primary);
		background: var(--bg-hover);
	}

	.tab-btn.active {
		background: var(--accent);
		color: white;
		box-shadow: 0 2px 8px var(--accent-glow);
	}
</style>
