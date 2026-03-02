def get_template(topic: str, problem: str) -> str:
    return f"""
You are creating an educational math video script for the topic: {topic}. \\n
The problem is: {problem}\\n

Use the `video_prompt_schema.json` format exactly.\\n
For Measurement problems (time, length, mass, volume), use these specific actions and items:\\n
- Set `visual_template` to "measurement_scene"\\n
- Use `action`: "MEASURE" to show measuring.\\n
- For length, use `item_type`: "RULER".\\n
- For time, use `item_type`: "CLOCK".\\n
- For mass/weight, use `action`: "BALANCE" (if relevant).\\n

Ensure the narration explicitly states what is being measured and the units used.
"""
