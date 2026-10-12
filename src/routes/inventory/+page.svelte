<script lang="ts">
	import '../../app.css';
	import InventoryGrid from '$lib/components/InventoryGrid.svelte';
	import ProfessionRanking from '$lib/components/ProfessionRanking.svelte';
	import { rankProfessionsByInventory } from '$lib/solver';
	import { memoryItems } from '$lib/data/memories';
	import type { ProfessionMatch } from '$lib/types';

	const STORAGE_KEY = 'tlc-inventory';

	function loadInventory(): Record<string, number> {
		const defaults = Object.fromEntries(memoryItems.map(m => [m.name, 0]));
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				// Merge with defaults to handle new/removed memory items
				for (const key of Object.keys(defaults)) {
					if (typeof parsed[key] === 'number' && parsed[key] >= 0) {
						defaults[key] = parsed[key];
					}
				}
			}
		} catch {
			// ignore parse errors
		}
		return defaults;
	}

	let inventory = $state<Record<string, number>>(loadInventory());

	$effect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
	});

	const matches = $derived<ProfessionMatch[]>(rankProfessionsByInventory(inventory));

	const hasItems = $derived(Object.values(inventory).some(v => v > 0));
</script>

<svelte:head>
	<title>The Last Caretaker - Inventory Mode</title>
</svelte:head>

<div class="app">
	<header>
		<h1>The Last Caretaker</h1>
		<p class="subtitle">Inventory Mode</p>
		<nav class="page-nav">
			<a href="/">Build Optimizer</a>
			<span class="nav-sep">|</span>
			<span class="nav-current">Inventory Mode</span>
		<span class="nav-sep">|</span><a href="/map">TLC Hub Map</a></nav>
	</header>

	<main>
		<section class="card inventory-section">
			<InventoryGrid bind:inventory />
		</section>

		{#if hasItems}
			<section class="card">
				<ProfessionRanking {matches} />
			</section>
		{:else}
			<div class="placeholder card">
				<div class="placeholder-icon">&#128218;</div>
				<p>Add memories to your inventory</p>
				<p class="placeholder-sub">Set quantities above to see which professions you can achieve</p>
			</div>
		{/if}
	</main>

	<footer>
		<p>Data sourced from <a href="https://thelastcaretaker.wiki.gg" target="_blank" rel="noopener">thelastcaretaker.wiki.gg</a></p>
	</footer>
</div>

<style>
	.app {
		max-width: 800px;
		margin: 0 auto;
		padding: 24px 16px;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		text-align: center;
		margin-bottom: 24px;
		padding-bottom: 20px;
		border-bottom: 1px solid var(--border);
	}

	header h1 {
		font-size: 1.8rem;
		background: linear-gradient(135deg, #3b82f6, #a855f7);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: 4px;
	}

	.subtitle {
		color: var(--text-secondary);
		font-size: 0.95rem;
		margin-bottom: 12px;
	}

	.page-nav {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 10px;
		font-size: 0.85rem;
	}

	.page-nav a {
		color: var(--accent);
		text-decoration: none;
	}

	.page-nav a:hover {
		text-decoration: underline;
	}

	.nav-sep {
		color: var(--text-muted);
	}

	.nav-current {
		color: var(--text-primary);
		font-weight: 600;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.inventory-section {
		position: sticky;
		top: 0;
		z-index: 10;
		background: var(--bg-card);
		max-height: 60vh;
		overflow-y: auto;
	}

	.placeholder {
		text-align: center;
		padding: 48px 24px;
		color: var(--text-secondary);
	}

	.placeholder-icon {
		font-size: 3rem;
		margin-bottom: 16px;
		opacity: 0.3;
	}

	.placeholder p {
		font-size: 1rem;
		margin-bottom: 4px;
	}

	.placeholder-sub {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	footer {
		text-align: center;
		padding-top: 24px;
		margin-top: 32px;
		border-top: 1px solid var(--border);
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	footer a {
		color: var(--accent);
		text-decoration: none;
	}

	footer a:hover {
		text-decoration: underline;
	}
</style>
