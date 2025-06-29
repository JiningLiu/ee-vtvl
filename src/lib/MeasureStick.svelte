<script lang="ts">
	const { length } = $props<{
		length: number;
	}>();
</script>

<stick-view-container>
	<stick-container>
		<end-cap></end-cap>
		<main-stick style="height: {length}px;"></main-stick>
		<end-cap></end-cap>
	</stick-container>

	<p>{length} cm</p>
</stick-view-container>

<style>
	stick-view-container {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		gap: 5px;

		stick-container {
			display: flex;
			flex-direction: column;
			align-items: flex-end;

			end-cap {
				width: 10px;
				height: 1px;
				background: #000;
			}

			main-stick {
				width: 1px;
				background: #000;
			}
		}
	}
</style>
