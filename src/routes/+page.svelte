<script lang="ts">
	import '../app.css';
	import ProfessionPicker from '$lib/components/ProfessionPicker.svelte';
	import ResultsPanel from '$lib/components/ResultsPanel.svelte';
	import { optimizeBuild } from '$lib/solver';
	import type { Profession, OptimizationResult } from '$lib/types';

	let selectedProfession = $state<Profession | null>(null);

	const result = $derived<OptimizationResult | null>(
		selectedProfession
			? optimizeBuild(selectedProfession.physicalReqs, selectedProfession.traitReqs)
			: null
	);
</script>

<svelte:head>
	<title>The Last Caretaker - Build Optimizer</title>
</svelte:head>

<div class="app">
	<header>
		<h1>The Last Caretaker</h1>
		<p class="subtitle">Profession Build Optimizer</p>
		<nav class="page-nav">
			<span class="nav-current">Build Optimizer</span>
			<span class="nav-sep">|</span>
			<a href="/inventory">Inventory Mode</a>
		<span class="nav-sep">|</span><a href="/map">TLC Hub Map</a></nav>
	</header>

	<main>
		<section class="card picker-section">
			<ProfessionPicker bind:selectedProfession />
		</section>

		{#if selectedProfession && result}
			<ResultsPanel profession={selectedProfession} {result} />
		{:else}
			<div class="placeholder card">
				<div class="placeholder-icon">&#9881;</div>
				<p>Select a profession to compute the optimal build</p>
				<p class="placeholder-sub">Choose a category and profession above to get started</p>
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

	.picker-section {
		position: sticky;
		top: 0;
		z-index: 10;
		background: var(--bg-card);
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
