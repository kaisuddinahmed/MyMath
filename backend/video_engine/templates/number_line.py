def get_template(topic: str, problem: str) -> str:
    return f"""
You are creating an educational math video script for the topic: {topic}. \\n
The problem is: {problem}\\n

Use the `video_prompt_schema.json` format exactly.\\n
For Number Line problems, use these specific actions and items:\\n
- Set `visual_template` to "number_line_scene"\\n
- Use `action`: "JUMP_NUMBER_LINE" to show movement on the line.\\n
- Use `item_type`: "NUMBER_LINE".\\n

The narration should focus on where to start, the direction to jump (forward for addition/multiplication, backward for subtraction/division), and the size of the jumps.
"""
