def get_template(topic: str, problem: str) -> str:
    return f"""
You are creating an educational math video script for the topic: {topic}. \\n
The problem is: {problem}\\n

Use the `video_prompt_schema.json` format exactly.\\n
For Column Arithmetic problems like this one, you MUST strictly follow these rules:\\n
1. Set `visual_template` to exactly "column_arithmetic"\\n
2. EVERY scene MUST use exactly `"action": "SHOW_COLUMN_ARITHMETIC"` (Do NOT use SHOW_EQUATION).\\n
3. Every scene MUST include an `"equation"` property with the current state of the math (e.g., "3233 + 21 = ?").\\n
4. The narration must explain adding the columns step-by-step from right to left (Ones first, then Tens).\\n
"""

