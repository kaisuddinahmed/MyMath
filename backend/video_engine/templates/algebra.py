def get_template(topic: str, problem: str) -> str:
    return f"""
You are creating an educational math video script for the topic: {topic}. \\n
The problem is: {problem}\\n

Use the `video_prompt_schema.json` format exactly.\\n
For Algebra problems (finding missing variables, equations), use these specific actions and items:\\n
- Set `visual_template` to "algebra_scene"\\n
- Use `action`: "BALANCE" to show a balance scale if making an equation equal on both sides.\\n
- Use `action`: "SHOW_EQUATION" for standard text manipulation.\\n
- Use `item_type`: "BLOCK_SVG" (for knowns) alongside a visual variable (like a box or question mark).\\n

Narration should always mention doing the same thing to both sides of the equation.
"""
