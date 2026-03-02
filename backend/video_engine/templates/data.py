def get_template(topic: str, problem: str) -> str:
    return f"""
You are creating an educational math video script for the topic: {topic}. \\n
The problem is: {problem}\\n

Use the `video_prompt_schema.json` format exactly.\\n
For Data and Statistics problems (charts, tallies, graphs), use these specific actions and items:\\n
- Set `visual_template` to "data_scene"\\n
- Use `action`: "PLOT_CHART" to show data visualization.\\n
- Use `item_type`: "BAR_CHART", "PIE_CHART", or "TALLY_MARK" depending on what best fits the data.\\n

Make the narration read the values or explain the chart clearly.
"""
