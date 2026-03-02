def get_template(topic: str, problem: str) -> str:
    return f"""
You are creating an educational math video script for the topic: {topic}. \\n
The problem is: {problem}\\n

Use the `video_prompt_schema.json` format exactly.\\n
For Geometry problems, you must use these specific actions and items:\\n
- Set `visual_template` to "geometry_scene"\\n
- Use `action`: "DRAW_SHAPE" to introduce the shape.\\n
- Use `item_type`: "SHAPE_2D" or "SHAPE_3D".\\n
- Use `action`: "HIGHLIGHT" to show angles, faces, or vertices.\\n

If asking the student to measure an angle, use `action`: "MEASURE" and `item_type`: "RULER" or "CLOCK" (if relevant).\\n
Always ensure the `durations` allow enough time (e.g., 4-6 seconds) for drawing sequences.
"""
