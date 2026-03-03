import requests
res = requests.post("http://localhost:8001/api/math/solve", json={
    "question": "There are 4 green mangoes and 3 ripe mangoes. How many mangoes are there altogether?",
    "grade": 1,
    "curriculum": "nctb"
})
print(res.text)
