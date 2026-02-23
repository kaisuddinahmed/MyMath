"""
backend/api/routes/children.py
Child profile endpoints. In-memory store for now (DB model ready in knowledge/models.py).
"""
import uuid
from fastapi import APIRouter, HTTPException
from typing import List
from backend.api.schemas import ChildProfile, ChildProfileCreate, ChildProfilePatch

router = APIRouter()

# In-memory store — replace with DB session from knowledge/db.py when DB is wired
CHILDREN: dict = {}


@router.get("/children", response_model=List[ChildProfile])
def list_children():
    return list(CHILDREN.values())


@router.post("/children", response_model=ChildProfile)
def create_child(profile: ChildProfileCreate):
    child_id = str(uuid.uuid4())
    data = {
        "child_id": child_id,
        "child_name": profile.child_name,
        "age": profile.age,
        "class_level": profile.class_level,
    }
    CHILDREN[child_id] = data
    return data


@router.get("/children/{child_id}", response_model=ChildProfile)
def get_child(child_id: str):
    if child_id not in CHILDREN:
        raise HTTPException(status_code=404, detail="Child not found")
    return CHILDREN[child_id]


@router.patch("/children/{child_id}", response_model=ChildProfile)
def patch_child(child_id: str, patch: ChildProfilePatch):
    if child_id not in CHILDREN:
        raise HTTPException(status_code=404, detail="Child not found")
    data = CHILDREN[child_id]
    if patch.child_name is not None:
        data["child_name"] = patch.child_name
    if patch.age is not None:
        data["age"] = patch.age
    if patch.class_level is not None:
        data["class_level"] = patch.class_level
    CHILDREN[child_id] = data
    return data
