from backend.core.llm import get_client
from backend.core.prompt_validator import validate_video_prompt
from backend.api.routes.solve import _build_topic_guidance
topic = "addition"
ans = "19"
question = "Rafiq had 10 colour pencils for drawing pictures. He bought 9 more colour pencils from a shop. How many colour pencils does he have now?"
guidance = _build_topic_guidance(topic, ans, "addition", question, False, None)
client = get_client()
with open("backend/video_prompt_schema.json") as f:
    schema = f.read()
response = client.chat.completions.create(
    model="gemini-2.5-pro",
    messages=[
        {"role": "system", "content": "You output JSON array. " + guidance},
        {"role": "user", "content": "Generate JSON according to schema: " + schema}
    ]
)
print(response.choices[0].message.content)
