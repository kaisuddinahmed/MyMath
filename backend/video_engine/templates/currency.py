def get_template(topic: str, problem: str) -> str:
    return f"""
You are creating an educational math video script for the topic: {topic}. \\n
The problem is: {problem}\\n

Use the `video_prompt_schema.json` format exactly.\\n
For Currency problems, use these specific actions and items:\\n
- Set `visual_template` to "currency_scene"\\n
- Use `action`: "ADD_ITEMS" or "REMOVE_ITEMS" as needed for adding/spending money.\\n
- Use `item_type`: "COIN" or "NOTE" to represent the money.\\n
- You can use "GROUP_ITEMS" if grouping coins into notes or sorting denominations.\\n

Make the narration clear about the value of each coin or note being shown.
"""
